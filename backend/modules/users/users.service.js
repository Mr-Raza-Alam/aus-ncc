const Cadet = require('./cadet.model');
const Admin = require('./admin.model');
const { parse } = require('csv-parse/sync');

/**
 * Generates a default password from the cadet's date of birth (DDMMYYYY).
 * Falls back to a random 8-char string if no DOB is available.
 */
function defaultPasswordFromDOB(dob) {
  if (!dob) {
    return 'NCC' + Math.random().toString(36).slice(2, 10);
  }

  const d = new Date(dob);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

/**
 * Create a single cadet. Auto-generates a DOB-based password when none
 * is provided and marks `mustChangePassword: true`.
 */
async function createUser(data) {
  if (!data.password) {
    data.password = defaultPasswordFromDOB(data.dob);
  }

  data.mustChangePassword = true;

  // If role is lead_admin or cto, save to Admin, otherwise Cadet
  const isOfficer = data.roles && (data.roles.includes('lead_admin') || data.roles.includes('cto'));
  const user = isOfficer ? await Admin.create(data) : await Cadet.create(data);
  return user;
}

/**
 * Paginated, searchable, filterable cadet list.
 */
async function getUsers(unitFilter = {}, query = {}) {
  const {
    page = 1,
    limit = 25,
    search = '',
    year,
    rank,
    status,
    sort = '-createdAt',
  } = query;

  const filter = { ...unitFilter };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { regimentalNo: { $regex: escaped, $options: 'i' } },
      { department: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (year !== undefined && year !== '') {
    filter.year = isNaN(Number(year)) ? year : Number(year);
  }
  if (rank) filter.rank = rank;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    Cadet.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Cadet.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  };
}

/**
 * Fetch a single user by ObjectId (checks Admin first, then Cadet).
 */
async function getUserById(id) {
  let user = await Admin.findById(id).lean();
  if (!user) {
    user = await Cadet.findById(id).lean();
  }
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

/**
 * Update a user. Blocks password updates through this path.
 */
async function updateUser(id, data) {
  delete data.password;

  let user = await Admin.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).lean();

  if (!user) {
    user = await Cadet.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  }

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

/**
 * Soft-delete — sets the user status to 'suspended'.
 */
async function deactivateUser(id) {
  let user = await Admin.findByIdAndUpdate(
    id,
    { status: 'suspended' },
    { new: true }
  ).lean();

  if (!user) {
    user = await Cadet.findByIdAndUpdate(
      id,
      { status: 'suspended' },
      { new: true }
    ).lean();
  }

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return user;
}

/**
 * Bulk-import cadets from a CSV buffer into the Cadet collection.
 */
async function importCadetsFromCSV(csvBuffer, unit) {
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const results = { created: 0, skipped: 0, errors: [] };

  for (const [index, row] of records.entries()) {
    try {
      const rowNum = index + 2;

      if (!row.name || !row.regimentalNo) {
        results.errors.push({ row: rowNum, message: 'Missing name or regimentalNo', data: row });
        results.skipped++;
        continue;
      }

      // Check for existing cadet with same unit + regimentalNo
      const existing = await Cadet.findOne({
        unit,
        regimentalNo: row.regimentalNo.trim(),
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      const dob = row.dob ? new Date(row.dob) : undefined;
      const password = defaultPasswordFromDOB(dob);
      const yearVal = row.year ? (isNaN(Number(row.year)) ? row.year : Number(row.year)) : 1;

      await Cadet.create({
        name: row.name.trim(),
        regimentalNo: row.regimentalNo.trim(),
        department: row.department ? row.department.trim() : undefined,
        year: yearVal,
        rank: row.rank ? row.rank.trim() : 'Cadet',
        phone: row.phone ? row.phone.trim() : undefined,
        email: row.email ? row.email.trim().toLowerCase() : undefined,
        dob,
        password,
        unit,
        roles: ['ncc-cdt'],
        mustChangePassword: true,
        status: 'active',
      });

      results.created++;
    } catch (err) {
      results.errors.push({
        row: index + 2,
        message: err.message,
        data: row,
      });
    }
  }

  return results;
}

/**
 * Promote all cadets in a unit: 1→2, 2→3, 3→alumni.
 */
async function promoteAll(unit) {
  const thirdYear = await Cadet.updateMany(
    { unit, year: 3, status: 'active' },
    { $set: { year: 'alumni', status: 'alumni' } }
  );

  const secondYear = await Cadet.updateMany(
    { unit, year: 2, status: 'active' },
    { $set: { year: 3 } }
  );

  const firstYear = await Cadet.updateMany(
    { unit, year: 1, status: 'active' },
    { $set: { year: 2 } }
  );

  return {
    firstToSecond: firstYear.modifiedCount,
    secondToThird: secondYear.modifiedCount,
    thirdToAlumni: thirdYear.modifiedCount,
  };
}

/**
 * Preview promotion counts without executing.
 */
async function promotePreview(unit) {
  const [first, second, third] = await Promise.all([
    Cadet.countDocuments({ unit, year: 1, status: 'active' }),
    Cadet.countDocuments({ unit, year: 2, status: 'active' }),
    Cadet.countDocuments({ unit, year: 3, status: 'active' }),
  ]);

  return {
    firstToSecond: first,
    secondToThird: second,
    thirdToAlumni: third,
    totalAffected: first + second + third,
  };
}

/**
 * Update the authenticated cadet's own profile during onboarding.
 */
async function updateMyProfile(userId, profileData) {
  const allowed = [
    'phone',
    'email',
    'gender',
    'bloodGroup',
    'department',
    'admissionNo',
    'emergencyContact',
  ];

  const update = {};
  for (const field of allowed) {
    if (profileData[field] !== undefined) {
      update[field] = profileData[field];
    }
  }

  update.profileCompleted = true;

  let user = await Cadet.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    user = await Admin.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    });
  }

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateMyProfile,
  deactivateUser,
  importCadetsFromCSV,
  promoteAll,
  promotePreview,
};
