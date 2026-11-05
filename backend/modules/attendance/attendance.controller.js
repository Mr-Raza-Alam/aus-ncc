const attendanceService = require('./attendance.service');
const Cadet = require('../users/cadet.model');

// Helper to determine effective target unit from req.unitFilter or req.user.unit
function getTargetUnit(req) {
  if (req.user?.roles?.includes('lead_admin')) {
    return req.headers['x-active-unit'] || req.query.unit || req.body.unit || req.user.unit || '3AB';
  }
  return req.user.unit;
}

// ── 1. Roster Endpoints ─────────────────────────────────────────────
async function importRoster(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'CSV file is required.' });
    }

    const slotYear = parseInt(req.body.year, 10);
    if (![1, 2, 3].includes(slotYear)) {
      return res.status(400).json({ success: false, message: 'Valid slot year (1, 2, or 3) is required.' });
    }

    const dryRun = req.query.dryRun === 'true' || req.body.dryRun === 'true';
    const targetUnit = getTargetUnit(req);

    const result = await attendanceService.validateAndImportRosterCSV({
      fileBuffer: req.file.buffer,
      slotYear,
      targetUnit,
      changedBy: req.user._id,
      dryRun,
    });

    res.json({
      success: true,
      data: result,
      message: dryRun
        ? `Validated ${slotYear}-year CSV: ${result.validCount} valid, ${result.rejectedCount} rejected.`
        : `Successfully imported ${slotYear}-year cadets: ${result.insertedCount} inserted, ${result.updatedCount} updated.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to import roster.' });
  }
}

async function getRoster(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { year, rank, status = 'active', search } = req.query;

    const query = { unit: targetUnit };
    if (status && status !== 'all') query.status = status;
    if (year && year !== 'all') query.year = isNaN(Number(year)) ? year : Number(year);
    if (rank && rank !== 'all') query.rank = rank;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { regimentalNo: new RegExp(search, 'i') },
        { department: new RegExp(search, 'i') },
      ];
    }

    const cadets = await Cadet.find(query).sort({ year: 1, regimentalNo: 1 });
    res.json({ success: true, count: cadets.length, data: cadets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch roster.' });
  }
}

async function updateCadet(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { userId } = req.params;
    const { name, rank, department, phone, status, emergencyContact } = req.body;

    const cadet = await Cadet.findOne({ _id: userId, unit: targetUnit });
    if (!cadet) {
      return res.status(404).json({ success: false, message: 'Cadet not found in this unit.' });
    }

    if (name) cadet.name = name;
    if (rank) cadet.rank = rank;
    if (department) cadet.department = department;
    if (phone) cadet.phone = phone;
    if (status) cadet.status = status;
    if (emergencyContact) cadet.emergencyContact = emergencyContact;

    await cadet.save();
    res.json({ success: true, message: 'Cadet details updated.', data: cadet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update cadet.' });
  }
}

// ── 2. Session Endpoints ────────────────────────────────────────────
async function openSession(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { venue, sessionType, declaredPresentCount } = req.body;

    if (!venue || typeof venue.lat !== 'number' || typeof venue.lng !== 'number') {
      return res.status(400).json({ success: false, message: 'Valid venue coordinates (lat, lng) are required.' });
    }

    const result = await attendanceService.openAttendanceSession({
      unit: targetUnit,
      venue,
      sessionType,
      declaredPresentCount,
      openedBy: req.user._id,
    });

    if (result.alreadyOpen) {
      return res.status(200).json({
        success: true,
        alreadyOpen: true,
        message: 'A training session is already open for this unit.',
        data: result.session,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Training attendance session opened successfully.',
      data: result.session,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to open session.' });
  }
}

async function extendSession(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { id } = req.params;
    const { extensionMinutes = 15 } = req.body;

    const session = await attendanceService.extendAttendanceSession({
      sessionId: id,
      unit: targetUnit,
      user: req.user,
      extensionMinutes: Number(extensionMinutes) || 15,
    });

    res.json({
      success: true,
      message: `Session check-in window extended by ${extensionMinutes} minutes.`,
      data: session,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to extend session.' });
  }
}

async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo file is required.' });
    }

    const targetUnit = getTargetUnit(req);
    const { id } = req.params;
    const coords = req.body.coords ? JSON.parse(req.body.coords) : null;

    const session = await attendanceService.uploadSessionPhoto({
      sessionId: id,
      unit: targetUnit,
      fileBuffer: req.file.buffer,
      coords,
      user: req.user,
    });

    res.json({
      success: true,
      message: 'Geo-tagged training photo uploaded successfully.',
      data: session,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to upload photo.' });
  }
}

async function closeSession(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { id } = req.params;
    const { declaredPresentCount, sessionCategory } = req.body;

    const result = await attendanceService.closeAttendanceSession({
      sessionId: id,
      unit: targetUnit,
      user: req.user,
      declaredPresentCount,
      sessionCategory,
    });

    res.json({
      success: true,
      message: 'Training session closed and locked.',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to close session.' });
  }
}

async function updateSessionCategory(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { id } = req.params;
    const { sessionCategory } = req.body;

    if (!['casual', 'refreshment'].includes(sessionCategory)) {
      return res.status(400).json({ success: false, message: 'Invalid session category. Must be casual or refreshment.' });
    }

    const session = await attendanceService.updateSessionCategory({
      sessionId: id,
      unit: targetUnit,
      user: req.user,
      sessionCategory,
    });

    res.json({
      success: true,
      message: `Session category updated to ${sessionCategory}.`,
      data: session,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update session category.' });
  }
}

async function markNERDone(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { id } = req.params;
    const { nerRefNo } = req.body;

    const session = await attendanceService.markNERUploaded({
      sessionId: id,
      unit: targetUnit,
      user: req.user,
      nerRefNo,
    });

    res.json({
      success: true,
      message: 'NER Directorate portal submission marked as completed.',
      data: session,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to confirm NER upload.' });
  }
}

async function downloadNERCSV(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { id } = req.params;

    const csvData = await attendanceService.generateSessionNERCSV({
      sessionId: id,
      unit: targetUnit,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=NER_MusterRoll_${targetUnit}_${id}.csv`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate NER CSV.' });
  }
}

async function getActiveSession(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const session = await attendanceService.getActiveSession(targetUnit);

    res.json({
      success: true,
      data: session, // null if no active session
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to check active session.' });
  }
}

async function getLatestClosedSession(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const report = await attendanceService.getLatestClosedSession(targetUnit);

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch latest session report.' });
  }
}

// ── 3. Marking Endpoints ────────────────────────────────────────────
async function markAttendance(req, res) {
  try {
    const { coords } = req.body;
    const result = await attendanceService.markCadetAttendanceGeo({
      user: req.user,
      coords,
    });

    res.json({
      success: true,
      message: 'Attendance verified and recorded successfully.',
      data: result,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message,
      distance: err.distance,
      allowedRadius: err.allowedRadius,
    });
  }
}

async function manualMark(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { sessionId, userId, status, reason } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ success: false, message: 'sessionId and userId are required.' });
    }

    const record = await attendanceService.manualMarkAttendance({
      sessionId,
      userId,
      status: status || 'P',
      reason,
      markedBy: req.user._id,
      unit: targetUnit,
    });

    res.json({
      success: true,
      message: 'Cadet attendance marked manually (logged in audit trail).',
      data: record,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record manual mark.' });
  }
}

// ── 4. Reports & History ────────────────────────────────────────────
async function getMyAttendance(req, res) {
  try {
    const result = await attendanceService.getCadetPersonalAttendance(req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load attendance history.' });
  }
}

async function getUnitReports(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { year, search } = req.query;

    const result = await attendanceService.getUnitAttendanceReports({
      unit: targetUnit,
      year,
      search,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load reports.' });
  }
}

async function exportReports(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { year } = req.query;

    const result = await attendanceService.getUnitAttendanceReports({
      unit: targetUnit,
      year,
    });

    // Format as CSV
    const rows = [
      ['Regimental No', 'Name', 'Year', 'Rank', 'Gender', 'Department', 'Attended', 'Total Held', 'Percentage (%)', 'Eligible (<75% Flag)'],
    ];

    result.report.forEach((r) => {
      rows.push([
        r.regimentalNo,
        `"${r.name}"`,
        r.year,
        r.rank,
        r.gender,
        `"${r.department || ''}"`,
        r.attended,
        r.totalSessionsHeld,
        `${r.percentage}%`,
        r.isFlagged ? 'INELIGIBLE (<75%)' : 'ELIGIBLE',
      ]);
    });

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=NCC_${targetUnit}_Attendance_Report.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to export reports.' });
  }
}

// ── 5. Refreshment Endpoints ────────────────────────────────────────
async function uploadBill(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Bill receipt image is required.' });
    }

    const targetUnit = getTargetUnit(req);
    const { vendorName, amount, date, sessionId } = req.body;

    if (!vendorName || !amount) {
      return res.status(400).json({ success: false, message: 'Vendor name and bill amount are required.' });
    }

    const bill = await attendanceService.uploadRefreshmentBill({
      unit: targetUnit,
      sessionId,
      date,
      vendorName,
      amount,
      fileBuffer: req.file.buffer,
      uploadedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Refreshment vendor bill uploaded successfully.',
      data: bill,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to upload bill.' });
  }
}

async function recordPayment(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const { direction, amount, date, reference } = req.body;

    if (!direction || !amount || !['in', 'out'].includes(direction)) {
      return res.status(400).json({ success: false, message: "Valid direction ('in' or 'out') and amount are required." });
    }

    const payment = await attendanceService.recordRefreshmentPayment({
      unit: targetUnit,
      direction,
      amount,
      date,
      reference,
      recordedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Money ${direction.toUpperCase()} recorded successfully.`,
      data: payment,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record payment.' });
  }
}

async function getLedger(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const ledger = await attendanceService.getRefreshmentLedger(targetUnit);

    res.json({ success: true, data: ledger });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load ledger.' });
  }
}

// ── 6. Promotion (1 April) ──────────────────────────────────────────
async function previewPromotion(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const preview = await attendanceService.previewYearlyPromotion(targetUnit);

    res.json({ success: true, data: preview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate promotion preview.' });
  }
}

async function executePromotion(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const result = await attendanceService.executeYearlyPromotion({
      unit: targetUnit,
      changedBy: req.user._id,
    });

    res.json({
      success: true,
      message: '1 April Annual Cadet Promotion executed successfully.',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to execute promotion.' });
  }
}

// ── 7. Settings & Audit ─────────────────────────────────────────────
async function getSettings(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const settings = await attendanceService.getOrCreateSettings(targetUnit);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load settings.' });
  }
}

async function updateSettings(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const settings = await attendanceService.updateSettings({
      unit: targetUnit,
      updateData: req.body,
      changedBy: req.user._id,
    });

    res.json({ success: true, message: 'Attendance settings updated.', data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update settings.' });
  }
}

async function getAudit(req, res) {
  try {
    const targetUnit = getTargetUnit(req);
    const result = await attendanceService.getUnitAuditLogs({ unit: targetUnit, limit: req.query.limit });
    res.json({
      success: true,
      count: result.logs.length,
      data: result.logs,
      summary: result.summary,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch audit log.' });
  }
}

module.exports = {
  importRoster,
  getRoster,
  updateCadet,
  openSession,
  extendSession,
  uploadPhoto,
  closeSession,
  updateSessionCategory,
  markNERDone,
  downloadNERCSV,
  getActiveSession,
  getLatestClosedSession,
  markAttendance,
  manualMark,
  getMyAttendance,
  getUnitReports,
  exportReports,
  uploadBill,
  recordPayment,
  getLedger,
  previewPromotion,
  executePromotion,
  getSettings,
  updateSettings,
  getAudit,
};
