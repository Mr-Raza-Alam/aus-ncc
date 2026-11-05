const { Router } = require('express');
const multer = require('multer');
const { authenticate, authorize, scopeToUnit } = require('../../shared/rbac');
const ctrl = require('./users.controller');

const router = Router();

// Multer — in-memory storage for CSV uploads
const upload = multer({ storage: multer.memoryStorage() });

// List users
router.get(
  '/',
  authenticate,
  authorize('lead_admin', 'cto', 'assistant'),
  scopeToUnit,
  ctrl.getUsers
);

// Create user
router.post(
  '/',
  authenticate,
  authorize('lead_admin', 'cto'),
  scopeToUnit,
  ctrl.createUser
);

// Promote preview (must be before /:id to avoid route conflict)
router.get(
  '/promote-preview',
  authenticate,
  authorize('lead_admin', 'cto'),
  scopeToUnit,
  ctrl.promotePreview
);

// Execute promotion
router.post(
  '/promote',
  authenticate,
  authorize('lead_admin', 'cto'),
  scopeToUnit,
  ctrl.promoteAll
);

// Import CSV
router.post(
  '/import-csv',
  authenticate,
  authorize('lead_admin', 'cto'),
  scopeToUnit,
  upload.single('file'),
  ctrl.importCSV
);

// Cadet onboarding & own profile update (must be before /:id)
router.put('/me/profile', authenticate, ctrl.updateMyProfile);

// Single user CRUD
router.get('/:id', authenticate, ctrl.getUserById);
router.put('/:id', authenticate, authorize('lead_admin', 'cto'), ctrl.updateUser);
router.delete('/:id', authenticate, authorize('lead_admin', 'cto'), ctrl.deactivateUser);

module.exports = router;
