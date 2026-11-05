const { loginUser, changePassword } = require('./auth.service');
const { forgotPassword } = require('./auth.forgot.service');
const { logAudit } = require('../../shared/audit');

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { identifier, password } = req.body;
    const result = await loginUser({ identifier, password });

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      mustChangePassword: result.user.mustChangePassword,
      profileCompleted: result.user.profileCompleted,
      data: {
        token: result.token,
        user: result.user,
        mustChangePassword: result.user.mustChangePassword,
        profileCompleted: result.user.profileCompleted,
      },
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/auth/change-password
 */
async function changePasswordHandler(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await changePassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
    });

    // Audit trail
    await logAudit({
      action: 'CHANGE_PASSWORD',
      module: 'auth',
      performedBy: req.user._id,
      unit: req.user.unit,
      targetId: req.user._id,
      targetCollection: 'users',
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    return res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/auth/forgot-password
 * Public self-service password reset for cadets using DOB verification.
 */
async function forgotPasswordHandler(req, res) {
  try {
    const { identifier, dob, newPassword } = req.body;
    const result = await forgotPassword({ identifier, dob, newPassword });
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = {
  login,
  changePassword: changePasswordHandler,
  forgotPassword: forgotPasswordHandler,
  getMe,
};
