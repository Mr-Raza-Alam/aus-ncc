/**
 * seeds/seed-units.js
 *
 * Seeds the database with units, settings, core officer accounts (in 'admins' collection),
 * and sample cadets (in 'cadets' collection).
 * Can be run standalone via CLI or automatically called on server startup.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Unit = require('../modules/users/unit.model');
const Settings = require('../modules/attendance/models/settings.model');
const Admin = require('../modules/users/admin.model');
const Cadet = require('../modules/users/cadet.model');

async function seedDatabase(shouldDisconnect = false) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[ERROR] MONGODB_URI not set. Create a .env file from .env.example.');
    if (shouldDisconnect) process.exit(1);
    return;
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: 'aus-ncc' });
    console.log('[INFO] Connected to MongoDB for seeding');
  }

  // ── 1. Units ────────────────────────────────────────────────
  const units = [
    {
      code: '3AB',
      name: '3 Assam Bn NCC',
      active: true,
      classDays: ['Wednesday', 'Saturday'],
    },
    {
      code: '62AB',
      name: '62 Assam Bn NCC',
      active: false,
      classDays: [],
    },
  ];

  for (const u of units) {
    const existing = await Unit.findOne({ code: u.code });
    if (existing) {
      await Unit.updateOne({ code: u.code }, u);
    } else {
      await Unit.create(u);
    }
  }

  // ── 2. Settings (3AB defaults) ──────────────────────────────
  const existingSettings = await Settings.findOne({ unit: '3AB' });
  if (!existingSettings) {
    await Settings.create({
      unit: '3AB',
      minAttendancePercent: 75,
      geofenceRadiusMeters: 100,
      attendanceWindowMinutes: 30,
      classDays: ['Wednesday', 'Saturday'],
      nerPortalUrl: 'https://ner.nccindia.nic.in',
    });
  }

  // ── 3. Officer / Admin Accounts (in 'admins' collection) ────
  const seedAdmins = [
    {
      name: 'Lead Administrator',
      email: 'admin@ausncc.in',
      password: 'Admin@123',
      roles: ['lead_admin'],
      unit: '3AB',
      designation: 'Lead Systems Administrator',
      mustChangePassword: false,
      profileCompleted: true,
      status: 'active',
    },
    {
      name: 'Capt. R. K. Sharma',
      email: 'cto.3ab@ausncc.in',
      password: 'Cto3ab@123',
      roles: ['cto'],
      unit: '3AB',
      designation: 'Care Taker Officer (3AB)',
      mustChangePassword: false,
      profileCompleted: true,
      status: 'active',
    },
    {
      name: 'Lt. P. Borah',
      email: 'cto.62ab@ausncc.in',
      password: 'Cto62ab@123',
      roles: ['cto'],
      unit: '62AB',
      designation: 'Care Taker Officer (62AB)',
      mustChangePassword: false,
      profileCompleted: true,
      status: 'active',
    },
  ];

  for (const a of seedAdmins) {
    const existing = await Admin.findOne({ email: a.email });
    if (!existing) {
      await Admin.create(a);
      console.log(`[SEED] Created admin: ${a.name} (${a.email})`);
    } else {
      existing.name = a.name;
      existing.password = a.password; // pre-save will re-hash to guarantee known password
      existing.roles = a.roles;
      existing.unit = a.unit;
      existing.designation = a.designation;
      existing.status = 'active';
      existing.mustChangePassword = a.mustChangePassword;
      await existing.save();
      console.log(`[SEED] Verified admin credentials: ${a.name} (${a.email})`);
    }
  }

  // ── 4. Cadet Accounts (in 'cadets' collection) ─────────────
  const seedCadets = [
    {
      name: 'SUO Vikram Debnath',
      email: 'suo.3ab@ausncc.in',
      regimentalNo: 'AS/22/SDA/100001',
      password: 'Suo3ab@123',
      roles: ['assistant', 'ncc-cdt'],
      rank: 'SUO',
      year: 3,
      gender: 'SD',
      unit: '3AB',
      designation: 'Senior Under Officer',
      permissions: ['ATTENDANCE_SESSION', 'ATTENDANCE_REPORT', 'REFRESHMENT_BILL', 'ROSTER_VIEW'],
      mustChangePassword: false,
      profileCompleted: true,
      status: 'active',
    },
    {
      name: 'Cadet Ankit Roy',
      email: 'ankit.cadet@ausncc.in',
      regimentalNo: 'AS/24/SDA/100201',
      dob: new Date('2005-08-15'),
      password: '15082005', // Initial DOB in DDMMYYYY format
      roles: ['ncc-cdt'],
      rank: 'Cadet',
      year: 1,
      gender: 'SD',
      unit: '3AB',
      mustChangePassword: true,
      profileCompleted: false,
      status: 'active',
    },
  ];

  for (const c of seedCadets) {
    const existing = await Cadet.findOne({ unit: c.unit, regimentalNo: c.regimentalNo });
    if (!existing) {
      await Cadet.create(c);
      console.log(`[SEED] Created cadet: ${c.name} (${c.regimentalNo})`);
    } else {
      existing.name = c.name;
      existing.password = c.password;
      existing.rank = c.rank;
      existing.roles = c.roles;
      existing.unit = c.unit;
      existing.year = c.year;
      existing.status = 'active';
      existing.mustChangePassword = c.mustChangePassword;
      await existing.save();
      console.log(`[SEED] Verified cadet credentials: ${c.name} (${c.regimentalNo})`);
    }
  }

  console.log('[SEED] System seed verification complete. Admin & Cadet collections synced.');

  if (shouldDisconnect) {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// If executed directly from command line (node seeds/seed-units.js)
if (require.main === module) {
  seedDatabase(true).catch((err) => {
    console.error('[ERROR] Seed failed:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
