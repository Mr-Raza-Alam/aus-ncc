const express = require('express');
const multer = require('multer');
const {
  authenticate,
  requireLeadOrCTO,
  requireSUOOrAbove,
  scopeToUnit,
} = require('../../shared/rbac');
const attendanceCtrl = require('./attendance.controller');

const router = express.Router();

// In-memory file upload middleware (Serverless compliant)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// All routes require authentication and unit scoping
router.use(authenticate);
router.use(scopeToUnit);

// ── 1. Roster Routes ────────────────────────────────────────────────
// POST /api/attendance/roster/import (multipart CSV + year=1|2|3) [Lead/CTO]
router.post(
  '/roster/import',
  requireLeadOrCTO,
  upload.single('file'),
  attendanceCtrl.importRoster
);

// GET /api/attendance/roster [Lead/CTO/SUO(view)]
router.get(
  '/roster',
  requireSUOOrAbove,
  attendanceCtrl.getRoster
);

// PATCH /api/attendance/roster/:userId [Lead/CTO]
router.patch(
  '/roster/:userId',
  requireLeadOrCTO,
  attendanceCtrl.updateCadet
);

// ── 2. Session Routes ───────────────────────────────────────────────
// POST /api/attendance/session/open [SUO/CTO]
router.post(
  '/session/open',
  requireSUOOrAbove,
  attendanceCtrl.openSession
);

// POST /api/attendance/session/:id/photo [SUO/CTO]
router.post(
  '/session/:id/photo',
  requireSUOOrAbove,
  upload.single('photo'),
  attendanceCtrl.uploadPhoto
);

// POST /api/attendance/session/:id/extend [SUO/CTO]
router.post(
  '/session/:id/extend',
  requireSUOOrAbove,
  attendanceCtrl.extendSession
);

// POST /api/attendance/session/:id/close [SUO/CTO]
router.post(
  '/session/:id/close',
  requireSUOOrAbove,
  attendanceCtrl.closeSession
);

// PATCH /api/attendance/session/:id/category [SUO/CTO]
router.patch(
  '/session/:id/category',
  requireSUOOrAbove,
  attendanceCtrl.updateSessionCategory
);

// GET /api/attendance/session/:id/ner-csv [SUO/CTO]
router.get(
  '/session/:id/ner-csv',
  requireSUOOrAbove,
  attendanceCtrl.downloadNERCSV
);

// POST /api/attendance/session/:id/ner-done [SUO/CTO]
router.post(
  '/session/:id/ner-done',
  requireSUOOrAbove,
  attendanceCtrl.markNERDone
);

// GET /api/attendance/session/active [any logged-in user]
router.get(
  '/session/active',
  attendanceCtrl.getActiveSession
);

// GET /api/attendance/session/latest-closed [SUO/CTO/Lead]
router.get(
  '/session/latest-closed',
  requireSUOOrAbove,
  attendanceCtrl.getLatestClosedSession
);

// ── 3. Marking Routes ───────────────────────────────────────────────
// POST /api/attendance/mark [cadet (geo)]
router.post(
  '/mark',
  attendanceCtrl.markAttendance
);

// POST /api/attendance/manual-mark [SUO/CTO (audited)]
router.post(
  '/manual-mark',
  requireSUOOrAbove,
  attendanceCtrl.manualMark
);

// ── 4. Reports & History ────────────────────────────────────────────
// GET /api/attendance/me [cadet — own % + history]
router.get(
  '/me',
  attendanceCtrl.getMyAttendance
);

// GET /api/attendance/reports [SUO/CTO]
router.get(
  '/reports',
  requireSUOOrAbove,
  attendanceCtrl.getUnitReports
);

// GET /api/attendance/reports/export [SUO/CTO]
router.get(
  '/reports/export',
  requireSUOOrAbove,
  attendanceCtrl.exportReports
);

// ── 5. Refreshment Routes ───────────────────────────────────────────
// POST /api/attendance/refreshment/bill [SUO/CTO]
router.post(
  '/refreshment/bill',
  requireSUOOrAbove,
  upload.single('billImage'),
  attendanceCtrl.uploadBill
);

// POST /api/attendance/refreshment/payment [CTO only]
router.post(
  '/refreshment/payment',
  requireLeadOrCTO,
  attendanceCtrl.recordPayment
);

// GET /api/attendance/refreshment/ledger [CTO (SUO read-only)]
router.get(
  '/refreshment/ledger',
  requireSUOOrAbove,
  attendanceCtrl.getLedger
);

// ── 6. Promotion Routes ─────────────────────────────────────────────
// GET /api/attendance/promote/preview [Lead/CTO]
router.get(
  '/promote/preview',
  requireLeadOrCTO,
  attendanceCtrl.previewPromotion
);

// POST /api/attendance/promote [Lead/CTO]
router.post(
  '/promote',
  requireLeadOrCTO,
  attendanceCtrl.executePromotion
);

// ── 7. Settings & Audit Routes ──────────────────────────────────────
// GET /api/attendance/settings [CTO]
router.get(
  '/settings',
  requireLeadOrCTO,
  attendanceCtrl.getSettings
);

// PUT /api/attendance/settings [CTO]
router.put(
  '/settings',
  requireLeadOrCTO,
  attendanceCtrl.updateSettings
);

// GET /api/attendance/audit [Lead/CTO]
router.get(
  '/audit',
  requireLeadOrCTO,
  attendanceCtrl.getAudit
);

module.exports = router;
