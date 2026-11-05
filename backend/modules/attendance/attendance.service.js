const { parse } = require('csv-parse/sync');
const Admin = require('../users/admin.model');
const Cadet = require('../users/cadet.model');
const AttendanceSession = require('./models/session.model');
const AttendanceRecord = require('./models/record.model');
const RefreshmentBill = require('./models/bill.model');
const RefreshmentPayment = require('./models/payment.model');
const AttendanceSettings = require('./models/settings.model');
const { logAudit, AuditLog } = require('../../shared/audit');
const { uploadFile } = require('../../shared/storage');
const {
  calculateHaversineDistance,
  getISTDateString,
  formatISTDateTime,
} = require('./attendance.utils');

const AUS_CAMPUS_CENTER = { lat: 24.6865, lng: 92.7483 };
const MAX_CAMPUS_RADIUS_METERS = 4000; // 4 km perimeter covers all Assam University Silchar grounds

// ── 1. Settings Helper ──────────────────────────────────────────────
async function getOrCreateSettings(unit) {
  let settings = await AttendanceSettings.findOne({ unit });
  if (!settings) {
    settings = await AttendanceSettings.create({
      unit,
      minAttendancePercent: 75,
      geofenceRadiusMeters: 100,
      attendanceWindowMinutes: 30,
      classDays: ['Wednesday', 'Saturday'],
      nerPortalUrl: 'https://ner.nccindia.nic.in',
    });
  }
  return settings;
}

// ── 2. Roster Batch CSV Import (Slot-Enforced) ───────────────────────
const ALLOWED_RANKS = ['SUO', 'JUO', 'CSM', 'CQMS', 'Sergeant', 'Cadet'];

function parseDOB(raw) {
  if (!raw) return null;
  const str = String(raw).trim();

  // Check DDMMYYYY
  if (/^\d{8}$/.test(str)) {
    const d = parseInt(str.substring(0, 2), 10);
    const m = parseInt(str.substring(2, 4), 10) - 1;
    const y = parseInt(str.substring(4, 8), 10);
    const date = new Date(Date.UTC(y, m, d));
    return isNaN(date.getTime()) ? null : date;
  }

  // Check DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    let d, m, y;
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
    }
    const date = new Date(Date.UTC(y, m, d));
    return isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDOBToPassword(dobDate) {
  if (!dobDate) return '15082005';
  const d = String(dobDate.getUTCDate()).padStart(2, '0');
  const m = String(dobDate.getUTCMonth() + 1).padStart(2, '0');
  const y = dobDate.getUTCFullYear();
  return `${d}${m}${y}`;
}

async function validateAndImportRosterCSV({
  fileBuffer,
  slotYear,
  targetUnit,
  changedBy,
  dryRun = false,
}) {
  const records = parse(fileBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const validRows = [];
  const rejectedRows = [];
  const seenRegNosInFile = new Set();

  for (let idx = 0; idx < records.length; idx++) {
    const row = records[idx];
    const rowNum = idx + 2; // Accounting for 1-based header

    // 1. Regimental Number Check
    const regimentalNo = (row.regimentalNo || row.regimental_no || row.regt_no || '').trim().toUpperCase();
    if (!regimentalNo) {
      rejectedRows.push({ row: rowNum, regimentalNo: '', reason: 'Regimental number is missing.' });
      continue;
    }

    if (seenRegNosInFile.has(regimentalNo)) {
      rejectedRows.push({ row: rowNum, regimentalNo, reason: 'Duplicate regimental number in the same CSV file.' });
      continue;
    }
    seenRegNosInFile.add(regimentalNo);

    // 2. Unit Validation
    const rowUnit = (row.unit || targetUnit || '').trim().toUpperCase();
    if (rowUnit && targetUnit && rowUnit !== targetUnit) {
      rejectedRows.push({ row: rowNum, regimentalNo, reason: `Unit '${rowUnit}' does not match target unit '${targetUnit}'.` });
      continue;
    }
    const finalUnit = targetUnit || rowUnit;

    // 3. Year Column vs Slot Enforce Rule
    if (row.year !== undefined && row.year !== '') {
      const rowYearNum = parseInt(row.year, 10);
      if (!isNaN(rowYearNum) && rowYearNum !== slotYear) {
        rejectedRows.push({
          row: rowNum,
          regimentalNo,
          reason: `Year column (${rowYearNum}) contradicts the upload slot (${slotYear}).`,
        });
        continue;
      }
    }

    // 4. Rank Validation
    let rank = (row.rank || 'Cadet').trim();
    if (!ALLOWED_RANKS.includes(rank)) {
      rank = 'Cadet'; // Normalise invalid rank to Cadet as per spec
    }

    // 5. DOB Parseability
    const dobRaw = row.dob || row.date_of_birth || row.DOB || '2005-08-15';
    const dob = parseDOB(dobRaw);
    if (!dob) {
      rejectedRows.push({ row: rowNum, regimentalNo, reason: `Invalid date of birth format: '${dobRaw}'.` });
      continue;
    }

    // 6. Name
    const name = (row.name || row.cadet_name || '').trim();
    if (!name) {
      rejectedRows.push({ row: rowNum, regimentalNo, reason: 'Cadet name is missing.' });
      continue;
    }

    // 7. Gender derivation (62AB is strictly SW girls; 3AB supports both SD & SW)
    let gender = (row.gender || '').trim().toUpperCase();
    if (finalUnit === '62AB') {
      gender = 'SW'; // 62 Assam Bn is exclusively Senior Wing (Female)
    } else if (!['SD', 'SW'].includes(gender)) {
      gender = regimentalNo.includes('SWA') ? 'SW' : 'SD';
    }

    validRows.push({
      name,
      regimentalNo,
      department: (row.department || row.dept || '').trim(),
      rank,
      unit: finalUnit,
      dob,
      phone: (row.phone || '').trim(),
      email: (row.email || '').trim().toLowerCase() || undefined,
      gender,
      year: slotYear,
      initialPassword: formatDOBToPassword(dob),
    });
  }

  // If dryRun, return validation summary
  if (dryRun) {
    return {
      slotYear,
      totalRows: records.length,
      validCount: validRows.length,
      rejectedCount: rejectedRows.length,
      validRows: validRows.slice(0, 10), // Sample
      rejectedRows,
    };
  }

  // Execute Upsert on { unit, regimentalNo }
  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of validRows) {
    const existing = await Cadet.findOne({ unit: item.unit, regimentalNo: item.regimentalNo });
    if (existing) {
      existing.name = item.name;
      existing.department = item.department || existing.department;
      existing.rank = item.rank;
      existing.dob = item.dob;
      existing.phone = item.phone || existing.phone;
      if (item.email) existing.email = item.email;
      existing.gender = item.gender;
      existing.year = item.year;
      existing.status = 'active';
      await existing.save();
      updatedCount++;
    } else {
      await Cadet.create({
        name: item.name,
        regimentalNo: item.regimentalNo,
        department: item.department,
        rank: item.rank,
        unit: item.unit,
        dob: item.dob,
        phone: item.phone,
        email: item.email,
        gender: item.gender,
        year: item.year,
        password: item.initialPassword, // Hashed by Cadet model pre-save hook
        mustChangePassword: true,
        status: 'active',
        roles: ['ncc-cdt'],
      });
      insertedCount++;
    }
  }

  // Roster imported into central cadets collection (no session audit clutter)
  return {
    slotYear,
    totalRows: records.length,
    validCount: validRows.length,
    rejectedCount: rejectedRows.length,
    insertedCount,
    updatedCount,
    rejectedRows,
  };
}

// ── 3. Session Operations (State Machine Gatekeeper) ─────────────────
async function openAttendanceSession({
  unit,
  venue,
  sessionType = 'Ground Drill / Practical Parade',
  declaredPresentCount = 0,
  openedBy,
}) {
  // 1. Anti-Favoritism / Campus Perimeter Bounding Verification
  const distFromCampus = calculateHaversineDistance(
    venue.lat,
    venue.lng,
    AUS_CAMPUS_CENTER.lat,
    AUS_CAMPUS_CENTER.lng
  );

  if (distFromCampus > MAX_CAMPUS_RADIUS_METERS) {
    const error = new Error(
      `Selected coordinates (${venue.lat.toFixed(4)}, ${venue.lng.toFixed(4)}) are ${(distFromCampus / 1000).toFixed(1)} km away from Assam University Campus. Training sessions can only be conducted within official university training grounds.`
    );
    error.status = 400;
    throw error;
  }

  // Check if session is already open
  const existingOpen = await AttendanceSession.findOne({ unit, status: 'open' });
  if (existingOpen) {
    // If expired, close it
    if (new Date() > existingOpen.endTime) {
      existingOpen.status = 'closed';
      existingOpen.closedAt = new Date();
      await existingOpen.save();
    } else {
      return {
        alreadyOpen: true,
        session: existingOpen,
      };
    }
  }

  const settings = await getOrCreateSettings(unit);
  const now = new Date();
  const windowMins = settings.attendanceWindowMinutes || 30;
  const radius = venue?.radiusMeters || settings.geofenceRadiusMeters || 100;

  const session = await AttendanceSession.create({
    unit,
    date: getISTDateString(now),
    sessionType,
    startTime: now,
    endTime: new Date(now.getTime() + windowMins * 60 * 1000),
    venue: {
      lat: venue.lat,
      lng: venue.lng,
      radiusMeters: radius,
      name: venue.name || 'Assam University Parade Ground',
    },
    openedBy,
    openedAt: now,
    status: 'open',
    declaredPresentCount: Number(declaredPresentCount) || 0,
    nerUploaded: false,
  });

  await logAudit({
    unit,
    action: 'ATTENDANCE_SESSION_OPEN',
    entity: 'AttendanceSession',
    entityId: session._id,
    changedBy: openedBy,
    reason: `Opened ${sessionType} session at (${venue.lat}, ${venue.lng}) with radius ${radius}m for ${windowMins} minutes.`,
  });

  return { alreadyOpen: false, session };
}

async function uploadSessionPhoto({ sessionId, unit, fileBuffer, coords, user }) {
  const session = await AttendanceSession.findOne({ _id: sessionId, unit });
  if (!session) {
    throw new Error('Attendance session not found.');
  }

  const key = `attendance/${unit}/session_${sessionId}_${Date.now()}.jpg`;
  const photoUrl = await uploadFile(fileBuffer, key, 'image/jpeg');

  session.photoUrl = photoUrl;
  if (coords && coords.lat && coords.lng) {
    session.photoCoords = { lat: coords.lat, lng: coords.lng };
  }
  session.photoCapturedAt = new Date();
  await session.save();

  await logAudit({
    unit,
    action: 'ATTENDANCE_PHOTO_CAPTURE',
    entity: 'AttendanceSession',
    entityId: session._id,
    changedBy: user._id,
    reason: 'Geo-tagged parade group photo uploaded to Cloudflare R2.',
  });

  return session;
}

async function closeAttendanceSession({ sessionId, unit, user, declaredPresentCount, sessionCategory = 'casual' }) {
  const session = await AttendanceSession.findOne({ _id: sessionId, unit });
  if (!session) {
    throw new Error('Attendance session not found.');
  }

  if (declaredPresentCount !== undefined && declaredPresentCount !== null) {
    session.declaredPresentCount = Number(declaredPresentCount);
  }

  session.sessionCategory = sessionCategory || 'casual';
  session.status = 'closed';
  session.closedAt = new Date();

  // Compute present count from attendance_records
  const actualPresentCount = await AttendanceRecord.countDocuments({
    sessionId: session._id,
    status: 'P',
  });

  if (session.sessionCategory === 'refreshment') {
    session.entitlementAmount = actualPresentCount * 18;
  } else {
    session.entitlementAmount = 0;
  }

  await session.save();

  const countMismatch = actualPresentCount !== session.declaredPresentCount;

  await logAudit({
    unit,
    action: 'ATTENDANCE_SESSION_CLOSE',
    entity: 'AttendanceSession',
    entityId: session._id,
    changedBy: user._id,
    reason: `Closed session (${session.sessionCategory}). Verified Present: ${actualPresentCount}, Declared: ${session.declaredPresentCount}.${countMismatch ? ' MISMATCH FLAGGED.' : ''}`,
  });

  return {
    session,
    actualPresentCount,
    declaredPresentCount: session.declaredPresentCount,
    countMismatch,
    entitlementAmount: session.entitlementAmount,
  };
}

async function updateSessionCategory({ sessionId, unit, user, sessionCategory }) {
  const session = await AttendanceSession.findOne({ _id: sessionId, unit });
  if (!session) throw new Error('Session not found.');

  session.sessionCategory = sessionCategory;
  if (sessionCategory === 'refreshment') {
    const actualPresentCount = await AttendanceRecord.countDocuments({
      sessionId: session._id,
      status: 'P',
    });
    session.entitlementAmount = actualPresentCount * 18;
  } else {
    session.entitlementAmount = 0;
    session.nerUploaded = false;
  }
  await session.save();
  return session;
}

async function extendAttendanceSession({ sessionId, unit, user, extensionMinutes = 15 }) {
  const session = await AttendanceSession.findOne({ _id: sessionId, unit, status: 'open' });
  if (!session) {
    throw new Error('Active session not found or already closed.');
  }

  const currentEnd = new Date(session.endTime);
  session.endTime = new Date(currentEnd.getTime() + extensionMinutes * 60 * 1000);
  await session.save();

  await logAudit({
    unit,
    action: 'ATTENDANCE_SESSION_EXTEND',
    entity: 'AttendanceSession',
    entityId: session._id,
    changedBy: user._id,
    reason: `Session check-in window extended by ${extensionMinutes} minutes. New closure time: ${formatISTDateTime(session.endTime)}.`,
  });

  return session;
}

async function markNERUploaded({ sessionId, unit, user, nerRefNo = '' }) {
  const session = await AttendanceSession.findOne({ _id: sessionId, unit });
  if (!session) {
    throw new Error('Session not found.');
  }

  session.nerUploaded = true;
  session.nerUploadedAt = new Date();
  if (nerRefNo) session.nerRefNo = nerRefNo;
  await session.save();

  await logAudit({
    unit,
    action: 'NER_UPLOAD_CONFIRMED',
    entity: 'AttendanceSession',
    entityId: session._id,
    changedBy: user._id,
    reason: `Confirmed attendance & refreshment proof submitted to NER Directorate Portal.${nerRefNo ? ` Ref No: ${nerRefNo}` : ''}`,
  });

  return session;
}

async function getActiveSession(unit) {
  const session = await AttendanceSession.findOne({ unit, status: 'open' })
    .populate('openedBy', 'name designation');

  if (!session) return null;

  const isExpired = new Date() > session.endTime;

  const [presentCount, totalCadets] = await Promise.all([
    AttendanceRecord.countDocuments({ sessionId: session._id, status: 'P' }),
    Cadet.countDocuments({ unit, status: 'active' }),
  ]);

  const recentRecords = await AttendanceRecord.find({ sessionId: session._id })
    .sort({ markedAt: -1 })
    .limit(10)
    .populate('userId', 'name regimentalNo rank');

  return {
    ...session.toObject(),
    presentCount,
    totalCadets,
    recentRecords,
    isExpired,
  };
}

async function getLatestClosedSession(unit) {
  const session = await AttendanceSession.findOne({ unit, status: 'closed' })
    .sort({ closedAt: -1 })
    .populate('openedBy', 'name rank designation');

  if (!session) return null;

  const actualPresentCount = await AttendanceRecord.countDocuments({
    sessionId: session._id,
    status: 'P',
  });
  const totalCadets = await Cadet.countDocuments({ unit, status: 'active' });

  return {
    session,
    actualPresentCount,
    declaredPresentCount: session.declaredPresentCount || actualPresentCount,
    countMismatch: (session.declaredPresentCount || actualPresentCount) !== actualPresentCount,
    entitlementAmount: session.entitlementAmount || (session.sessionCategory === 'refreshment' ? actualPresentCount * 18 : 0),
    totalCadets,
  };
}

// ── 4. Marking Attendance (Cadet Geofencing + Manual Fallback) ──────
async function markCadetAttendanceGeo({ user, coords }) {
  const { unit, _id: userId } = user;

  // Rule 1: An open session exists for the cadet's unit
  const session = await AttendanceSession.findOne({ unit, status: 'open' });
  if (!session) {
    const error = new Error('No active attendance session.');
    error.status = 409;
    throw error;
  }

  // Rule 2: Current time is inside the window
  const now = new Date();
  if (now > session.endTime) {
    session.status = 'closed';
    session.closedAt = session.endTime;
    await session.save();
    const error = new Error('Attendance session window has closed.');
    error.status = 409;
    throw error;
  }

  // Validate GPS coordinates present
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    const error = new Error('GPS location unavailable. Please enable device location.');
    error.status = 400;
    throw error;
  }

  // Rule 3: Distance from venue <= radiusMeters (Haversine)
  const distance = calculateHaversineDistance(
    coords.lat,
    coords.lng,
    session.venue.lat,
    session.venue.lng
  );

  const allowedRadius = session.venue.radiusMeters || 100;
  if (distance > allowedRadius) {
    const error = new Error(
      `Outside class area. You are ${Math.round(distance)}m away from parade venue (allowed radius: ${allowedRadius}m).`
    );
    error.status = 400;
    error.distance = Math.round(distance);
    error.allowedRadius = allowedRadius;
    throw error;
  }

  // Pass -> Upsert record
  const record = await AttendanceRecord.findOneAndUpdate(
    { sessionId: session._id, userId },
    {
      sessionId: session._id,
      userId,
      unit,
      status: 'P',
      markedVia: 'geo',
      markedAt: now,
      gpsCoords: {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy || null,
        distanceMeters: Math.round(distance),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    record,
    session,
    distanceMeters: Math.round(distance),
  };
}

async function manualMarkAttendance({ sessionId, userId, status = 'P', reason = 'GPS failure fallback', markedBy, unit }) {
  const session = await AttendanceSession.findOne({ _id: sessionId, unit });
  if (!session) {
    throw new Error('Attendance session not found.');
  }

  const targetCadet = await Cadet.findOne({ _id: userId, unit });
  if (!targetCadet) {
    throw new Error('Cadet not found in this unit.');
  }

  const record = await AttendanceRecord.findOneAndUpdate(
    { sessionId: session._id, userId },
    {
      sessionId: session._id,
      userId,
      unit,
      status: status.toUpperCase() === 'A' ? 'A' : 'P',
      markedVia: 'manual',
      markedAt: new Date(),
      markedBy,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await logAudit({
    unit,
    action: 'ATTENDANCE_MANUAL_OVERRIDE',
    entity: 'AttendanceRecord',
    entityId: record._id,
    changedBy: markedBy,
    reason: `Manually marked cadet ${targetCadet.regimentalNo} (${targetCadet.name}) as ${record.status}. Reason: ${reason}`,
  });

  return record;
}

// ── 5. Analytics & Reports ──────────────────────────────────────────
async function getCadetPersonalAttendance(user) {
  const { _id: userId, unit } = user;
  const settings = await getOrCreateSettings(unit);

  // All closed/concluded sessions in this unit
  const sessions = await AttendanceSession.find({ unit, status: 'closed' }).sort({ startTime: -1 });
  const totalSessionsCount = sessions.length;

  const records = await AttendanceRecord.find({
    unit,
    userId,
    status: 'P',
  });

  const presentCount = records.length;
  const tenurePercentage = totalSessionsCount === 0 ? 100 : Math.round((presentCount / totalSessionsCount) * 100);

  // Recent history mapping
  const recordMap = new Map();
  records.forEach((r) => recordMap.set(String(r.sessionId), r));

  const history = sessions.slice(0, 30).map((s) => {
    const rec = recordMap.get(String(s._id));
    return {
      sessionId: s._id,
      date: s.date,
      startTime: s.startTime,
      status: rec ? 'P' : 'A', // Missing record treated as A
      markedVia: rec ? rec.markedVia : null,
      markedAt: rec ? rec.markedAt : null,
      venueName: s.venue.name,
    };
  });

  return {
    cadet: {
      name: user.name,
      regimentalNo: user.regimentalNo,
      year: user.year,
      rank: user.rank,
      unit: user.unit,
    },
    totalSessionsHeld: totalSessionsCount,
    attendedCount: presentCount,
    tenurePercentage,
    minAttendancePercent: settings.minAttendancePercent,
    isEligible: tenurePercentage >= settings.minAttendancePercent,
    history,
  };
}

async function getUnitAttendanceReports({ unit, year, search }) {
  const settings = await getOrCreateSettings(unit);

  const cadetQuery = { unit, status: 'active', roles: 'ncc-cdt' };
  if (year && year !== 'all') {
    cadetQuery.year = isNaN(Number(year)) ? year : Number(year);
  }
  if (search) {
    cadetQuery.$or = [
      { name: new RegExp(search, 'i') },
      { regimentalNo: new RegExp(search, 'i') },
      { department: new RegExp(search, 'i') },
    ];
  }

  const cadets = await Cadet.find(cadetQuery).sort({ year: 1, regimentalNo: 1 });
  const sessions = await AttendanceSession.find({ unit, status: 'closed' });
  const totalSessionsCount = sessions.length;

  const sessionIds = sessions.map((s) => s._id);
  const records = await AttendanceRecord.find({
    unit,
    sessionId: { $in: sessionIds },
    status: 'P',
  });

  // Count present per cadet
  const countMap = new Map();
  records.forEach((r) => {
    const uId = String(r.userId);
    countMap.set(uId, (countMap.get(uId) || 0) + 1);
  });

  const report = cadets.map((c) => {
    const attended = countMap.get(String(c._id)) || 0;
    const percentage = totalSessionsCount === 0 ? 100 : Math.round((attended / totalSessionsCount) * 100);
    return {
      userId: c._id,
      name: c.name,
      regimentalNo: c.regimentalNo,
      year: c.year,
      rank: c.rank,
      gender: c.gender,
      department: c.department,
      attended,
      totalSessionsHeld: totalSessionsCount,
      percentage,
      isFlagged: percentage < settings.minAttendancePercent,
    };
  });

  return {
    unit,
    totalSessionsHeld: totalSessionsCount,
    minAttendancePercent: settings.minAttendancePercent,
    cadetCount: cadets.length,
    report,
  };
}

// ── 6. Refreshment Ledger ───────────────────────────────────────────
async function uploadRefreshmentBill({ unit, sessionId, date, vendorName, amount, fileBuffer, uploadedBy }) {
  const key = `refreshment/${unit}/bill_${Date.now()}.jpg`;
  const billImageUrl = await uploadFile(fileBuffer, key, 'image/jpeg');

  const bill = await RefreshmentBill.create({
    unit,
    sessionId: sessionId || null,
    date: date ? new Date(date) : new Date(),
    vendorName: vendorName.trim(),
    amount: Number(amount),
    billImageUrl,
    uploadedBy,
    uploadedAt: new Date(),
  });

  await logAudit({
    unit,
    action: 'REFRESHMENT_BILL_UPLOAD',
    entity: 'RefreshmentBill',
    entityId: bill._id,
    changedBy: uploadedBy,
    reason: `Uploaded refreshment bill from vendor '${vendorName}' for Rs. ${amount}.`,
  });

  return bill;
}

async function recordRefreshmentPayment({ unit, direction, amount, date, reference, recordedBy }) {
  const payment = await RefreshmentPayment.create({
    unit,
    direction,
    amount: Number(amount),
    date: date ? new Date(date) : new Date(),
    reference: (reference || '').trim(),
    recordedBy,
    recordedAt: new Date(),
  });

  await logAudit({
    unit,
    action: 'REFRESHMENT_PAYMENT_RECORD',
    entity: 'RefreshmentPayment',
    entityId: payment._id,
    changedBy: recordedBy,
    reason: `Recorded money ${direction.toUpperCase()}: Rs. ${amount}. Ref: ${reference || 'N/A'}.`,
  });

  return payment;
}

async function getRefreshmentLedger(unit) {
  const bills = await RefreshmentBill.find({ unit }).sort({ date: -1 }).populate('uploadedBy', 'name rank');
  const payments = await RefreshmentPayment.find({ unit }).sort({ date: -1 }).populate('recordedBy', 'name rank designation');
  const sessions = await AttendanceSession.find({ unit, sessionCategory: 'refreshment', status: 'closed' })
    .sort({ date: -1, closedAt: -1 })
    .populate('openedBy', 'name rank');

  const totalBilled = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalReceived = payments
    .filter((p) => p.direction === 'in')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = payments
    .filter((p) => p.direction === 'out')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalEntitled = sessions.reduce((sum, s) => sum + (s.entitlementAmount || 0), 0);

  const outstandingToVendor = Math.max(0, totalBilled - totalPaid);
  const balanceInHand = totalReceived - totalPaid;

  return {
    unit,
    summary: {
      totalBilled,
      totalReceived,
      totalPaid,
      totalEntitled,
      outstandingToVendor,
      balanceInHand,
    },
    bills,
    payments,
    sessions,
  };
}

async function generateSessionNERCSV({ sessionId, unit }) {
  const session = await AttendanceSession.findOne({ _id: sessionId, unit });
  if (!session) throw new Error('Session not found.');

  const records = await AttendanceRecord.find({ sessionId: session._id, status: 'P' })
    .populate('userId', 'name regimentalNo rank department year unit')
    .sort({ 'userId.year': 1, 'userId.regimentalNo': 1 });

  const headers = ['Sl_No', 'Regimental_No', 'Cadet_Name', 'Rank', 'Unit', 'Department', 'Year', 'Status', 'Marked_Time_IST', 'Verification_Mode'];
  const rows = records.map((r, idx) => [
    idx + 1,
    `"${r.userId?.regimentalNo || 'N/A'}"`,
    `"${r.userId?.name || 'N/A'}"`,
    `"${r.userId?.rank || 'CDT'}"`,
    `"${r.userId?.unit || unit}"`,
    `"${r.userId?.department || 'N/A'}"`,
    r.userId?.year || 1,
    'PRESENT',
    `"${formatISTDateTime(r.markedAt)}"`,
    `"${r.source === 'gps' ? 'Mobile Geofence GPS' : 'Physical Roll Call Fallback'}"`,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

// ── 7. Yearly Promotion (1 April) ───────────────────────────────────
async function previewYearlyPromotion(unit) {
  const cadets = await Cadet.find({ unit, status: 'active', roles: 'ncc-cdt' });

  const preview = {
    firstToSecond: [],
    secondToThird: [],
    thirdToAlumni: [],
  };

  cadets.forEach((c) => {
    if (c.year === 1 || c.year === '1') {
      preview.firstToSecond.push({ id: c._id, name: c.name, regimentalNo: c.regimentalNo, from: 1, to: 2 });
    } else if (c.year === 2 || c.year === '2') {
      preview.secondToThird.push({ id: c._id, name: c.name, regimentalNo: c.regimentalNo, from: 2, to: 3 });
    } else if (c.year === 3 || c.year === '3') {
      preview.thirdToAlumni.push({ id: c._id, name: c.name, regimentalNo: c.regimentalNo, from: 3, to: 'alumni' });
    }
  });

  return {
    unit,
    counts: {
      firstToSecond: preview.firstToSecond.length,
      secondToThird: preview.secondToThird.length,
      thirdToAlumni: preview.thirdToAlumni.length,
      totalAffected: preview.firstToSecond.length + preview.secondToThird.length + preview.thirdToAlumni.length,
    },
    preview,
  };
}

async function executeYearlyPromotion({ unit, changedBy }) {
  const preview = await previewYearlyPromotion(unit);

  // 1. Move Year 3 to Alumni (Never delete, archived read-only)
  const thirdIds = preview.preview.thirdToAlumni.map((c) => c.id);
  if (thirdIds.length > 0) {
    await Cadet.updateMany(
      { _id: { $in: thirdIds } },
      { $set: { year: 'alumni', status: 'alumni' } }
    );
  }

  // 2. Move Year 2 to Year 3
  const secondIds = preview.preview.secondToThird.map((c) => c.id);
  if (secondIds.length > 0) {
    await Cadet.updateMany({ _id: { $in: secondIds } }, { $set: { year: 3 } });
  }

  // 3. Move Year 1 to Year 2
  const firstIds = preview.preview.firstToSecond.map((c) => c.id);
  if (firstIds.length > 0) {
    await Cadet.updateMany({ _id: { $in: firstIds } }, { $set: { year: 2 } });
  }

  await logAudit({
    unit,
    action: 'YEARLY_PROMOTION_EXECUTE',
    entity: 'Cadet',
    changedBy,
    reason: `Annual 1 April promotion executed. 1st->2nd: ${firstIds.length}, 2nd->3rd: ${secondIds.length}, 3rd->Alumni: ${thirdIds.length}.`,
  });

  return {
    success: true,
    promotedCounts: preview.counts,
  };
}

// ── 8. Settings & Audit ─────────────────────────────────────────────
async function updateSettings({ unit, updateData, changedBy }) {
  const settings = await getOrCreateSettings(unit);

  if (updateData.minAttendancePercent !== undefined) {
    settings.minAttendancePercent = Number(updateData.minAttendancePercent);
  }
  if (updateData.geofenceRadiusMeters !== undefined) {
    settings.geofenceRadiusMeters = Number(updateData.geofenceRadiusMeters);
  }
  if (updateData.attendanceWindowMinutes !== undefined) {
    settings.attendanceWindowMinutes = Number(updateData.attendanceWindowMinutes);
  }
  if (updateData.classDays) {
    settings.classDays = Array.isArray(updateData.classDays) ? updateData.classDays : [updateData.classDays];
  }
  if (updateData.nerPortalUrl !== undefined) {
    settings.nerPortalUrl = updateData.nerPortalUrl;
  }

  await settings.save();

  await logAudit({
    unit,
    action: 'ATTENDANCE_SETTINGS_UPDATE',
    entity: 'AttendanceSettings',
    entityId: settings._id,
    changedBy,
    reason: `Updated attendance policy: Min ${settings.minAttendancePercent}%, Radius ${settings.geofenceRadiusMeters}m, Window ${settings.attendanceWindowMinutes}m.`,
  });

  return settings;
}

async function getUnitAuditLogs({ unit, limit = 150 }) {
  const ATTENDANCE_ACTIONS = [
    'ATTENDANCE_SESSION_OPEN',
    'ATTENDANCE_SESSION_CLOSE',
    'ATTENDANCE_SESSION_EXTEND',
    'ATTENDANCE_MANUAL_OVERRIDE',
    'ATTENDANCE_PHOTO_CAPTURE',
    'NER_UPLOAD_CONFIRMED',
  ];

  const logs = await AuditLog.find({
    unit,
    action: { $in: ATTENDANCE_ACTIONS },
  })
    .sort({ changedAt: -1 })
    .limit(Number(limit))
    .lean();

  const userIds = logs.map((l) => l.changedBy).filter(Boolean);
  const [admins, cadets] = await Promise.all([
    Admin.find({ _id: { $in: userIds } }, 'name designation roles').lean(),
    Cadet.find({ _id: { $in: userIds } }, 'name rank department year').lean(),
  ]);

  const userMap = new Map();
  admins.forEach((a) => {
    const roleTitle = a.roles?.includes('lead_admin') ? 'Lead Admin' : (a.designation || 'CTO');
    userMap.set(String(a._id), { name: a.name, rank: roleTitle });
  });
  cadets.forEach((c) => {
    userMap.set(String(c._id), { name: c.name, rank: c.rank || 'SUO' });
  });

  const enrichedLogs = logs.map((l) => ({
    ...l,
    changedBy: userMap.get(String(l.changedBy)) || { name: 'Officer / Admin', rank: 'SUO / CTO' },
  }));

  const totalSessionsOpened = enrichedLogs.filter((l) => l.action === 'ATTENDANCE_SESSION_OPEN').length;
  const manualOverridesCount = enrichedLogs.filter((l) => l.action === 'ATTENDANCE_MANUAL_OVERRIDE').length;
  const windowExtensionsCount = enrichedLogs.filter((l) => l.action === 'ATTENDANCE_SESSION_EXTEND').length;
  const headcountMismatchesCount = enrichedLogs.filter((l) => l.reason?.includes('MISMATCH')).length;

  return {
    logs: enrichedLogs,
    summary: {
      totalSessionsOpened,
      manualOverridesCount,
      windowExtensionsCount,
      headcountMismatchesCount,
    },
  };
}

module.exports = {
  getOrCreateSettings,
  validateAndImportRosterCSV,
  openAttendanceSession,
  extendAttendanceSession,
  uploadSessionPhoto,
  closeAttendanceSession,
  updateSessionCategory,
  markNERUploaded,
  generateSessionNERCSV,
  getActiveSession,
  getLatestClosedSession,
  markCadetAttendanceGeo,
  manualMarkAttendance,
  getCadetPersonalAttendance,
  getUnitAttendanceReports,
  uploadRefreshmentBill,
  recordRefreshmentPayment,
  getRefreshmentLedger,
  previewYearlyPromotion,
  executeYearlyPromotion,
  updateSettings,
  getUnitAuditLogs,
};
