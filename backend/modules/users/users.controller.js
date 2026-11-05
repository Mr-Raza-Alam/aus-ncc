const usersService = require('./users.service');
const { logAudit } = require('../../shared/audit');

/**
 * GET /api/users
 */
async function getUsers(req, res) {
  try {
    const result = await usersService.getUsers(req.unitFilter, req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/users
 */
async function createUser(req, res) {
  try {
    const data = { ...req.body };

    // Apply unit scope — non-lead-admin users can only create in their own unit
    if (req.unitFilter.unit) {
      data.unit = req.unitFilter.unit;
    }

    const user = await usersService.createUser(data);

    await logAudit({
      action: 'CREATE_USER',
      module: 'users',
      performedBy: req.user._id,
      unit: user.unit,
      targetId: user._id,
      targetCollection: 'users',
      after: user.toObject ? user.toObject() : user,
      ip: req.ip,
    });

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/users/:id
 */
async function getUserById(req, res) {
  try {
    const user = await usersService.getUserById(req.params.id);
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/users/:id
 */
async function updateUser(req, res) {
  try {
    const before = await usersService.getUserById(req.params.id);
    const user = await usersService.updateUser(req.params.id, req.body);

    await logAudit({
      action: 'UPDATE_USER',
      module: 'users',
      performedBy: req.user._id,
      unit: user.unit,
      targetId: user._id,
      targetCollection: 'users',
      before,
      after: user,
      ip: req.ip,
    });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/users/:id  (soft-delete → suspend)
 */
async function deactivateUser(req, res) {
  try {
    const user = await usersService.deactivateUser(req.params.id);

    await logAudit({
      action: 'DEACTIVATE_USER',
      module: 'users',
      performedBy: req.user._id,
      unit: user.unit,
      targetId: user._id,
      targetCollection: 'users',
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: 'User deactivated.', data: user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/users/promote-preview
 */
async function promotePreview(req, res) {
  try {
    const unit = req.unitFilter.unit;
    if (!unit) {
      return res
        .status(400)
        .json({ success: false, message: 'Please select a unit before previewing promotion.' });
    }

    const preview = await usersService.promotePreview(unit);
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/users/promote
 */
async function promoteAll(req, res) {
  try {
    const unit = req.unitFilter.unit;
    if (!unit) {
      return res
        .status(400)
        .json({ success: false, message: 'Please select a unit before promoting.' });
    }

    const result = await usersService.promoteAll(unit);

    await logAudit({
      action: 'PROMOTE_ALL',
      module: 'users',
      performedBy: req.user._id,
      unit,
      metadata: result,
      ip: req.ip,
    });

    return res.status(200).json({ success: true, data: result, message: 'Promotion completed.' });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/users/import-csv
 */
async function importCSV(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'CSV file is required.' });
    }

    const unit = req.unitFilter.unit;
    if (!unit) {
      return res
        .status(400)
        .json({ success: false, message: 'Please select a unit before importing.' });
    }

    const result = await usersService.importCadetsFromCSV(req.file.buffer, unit);

    await logAudit({
      action: 'IMPORT_CADETS_CSV',
      module: 'users',
      performedBy: req.user._id,
      unit,
      metadata: { created: result.created, skipped: result.skipped, errorCount: result.errors.length },
      ip: req.ip,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/users/me/profile
 * Allows logged in cadets to complete their onboarding profile.
 */
async function updateMyProfile(req, res) {
  try {
    const updated = await usersService.updateMyProfile(req.user._id, req.body);

    await logAudit({
      action: 'UPDATE_OWN_PROFILE',
      module: 'users',
      performedBy: req.user._id,
      unit: req.user.unit,
      targetId: req.user._id,
      targetCollection: 'users',
      after: updated.toObject ? updated.toObject() : updated,
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully.',
      data: updated,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  updateMyProfile,
  deactivateUser,
  promotePreview,
  promoteAll,
  importCSV,
};
