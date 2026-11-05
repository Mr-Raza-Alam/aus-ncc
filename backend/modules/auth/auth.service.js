const jwt = require('jsonwebtoken');
const Admin = require('../users/admin.model');
const Cadet = require('../users/cadet.model');

/**
 * Generates a signed JWT for the given user (Admin or Cadet).
 */
function generateToken(user, userType = 'cadet') {
  const payload = {
    id: user._id,
    userType,
    roles: user.roles,
    unit: user.unit,
  };

  // Only cadets hold ranks (SUO, JUO, CSM, etc.). Admins & CTOs hold appointments/designations.
  if (userType === 'cadet' && user.rank) {
    payload.rank = user.rank;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Authenticates a user by email, regimentalNo, or admissionNo.
 * Checks Admin collection first (officers/admins), then Cadet collection.
 * Returns the user object and a signed JWT.
 */
async function loginUser({ identifier, password }) {
  if (!identifier || !password) {
    const err = new Error('Identifier and password are required.');
    err.statusCode = 400;
    throw err;
  }

  const raw = identifier.trim();
  const normalised = raw.toLowerCase();

  let user = null;
  let userType = 'admin';

  // 1. If email format, check Admin collection first
  if (raw.includes('@')) {
    user = await Admin.findOne({ email: normalised }).select('+password');
  }

  // 2. If not found in Admin, check Cadet collection (regimentalNo, admissionNo, or email)
  if (!user) {
    userType = 'cadet';
    user = await Cadet.findOne({
      $or: [
        { regimentalNo: { $regex: new RegExp(`^${escapeRegex(raw)}$`, 'i') } },
        { admissionNo: { $regex: new RegExp(`^${escapeRegex(raw)}$`, 'i') } },
        { email: normalised },
      ],
    }).select('+password');
  }

  // 3. Fallback: If still not found and raw did not have '@', check Admin as fallback
  if (!user && !raw.includes('@')) {
    user = await Admin.findOne({ email: normalised }).select('+password');
    if (user) userType = 'admin';
  }

  if (!user) {
    const err = new Error('Invalid credentials.');
    err.statusCode = 401;
    throw err;
  }

  if (user.status === 'suspended') {
    const err = new Error('Account suspended. Contact your CTO.');
    err.statusCode = 403;
    throw err;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error('Invalid credentials.');
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user, userType);

  // Strip password from returned user object
  const userObj = user.toObject();
  delete userObj.password;
  userObj.userType = userType;

  return { user: userObj, token };
}

/**
 * Changes a user's password after verifying the current one.
 */
async function changePassword({ userId, currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    const err = new Error('Current password and new password are required.');
    err.statusCode = 400;
    throw err;
  }

  if (newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters.');
    err.statusCode = 400;
    throw err;
  }

  // Check Admin first, then Cadet
  let user = await Admin.findById(userId).select('+password');
  if (!user) {
    user = await Cadet.findById(userId).select('+password');
  }

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    const err = new Error('Current password is incorrect.');
    err.statusCode = 400;
    throw err;
  }

  user.password = newPassword; // pre-save hook will hash
  user.mustChangePassword = false;
  await user.save();

  return { message: 'Password changed successfully.' };
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { loginUser, changePassword, generateToken };
