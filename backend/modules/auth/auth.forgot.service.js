const Cadet = require('../users/cadet.model');
const Admin = require('../users/admin.model');

/**
 * Public password recovery for cadets (and officers with DOB):
 * Verifies regimentalNo (or email) and Date of Birth (DOB).
 * If valid, updates password to newPassword and clears mustChangePassword flag.
 */
async function forgotPassword({ identifier, dob, newPassword }) {
  if (!identifier || !dob || !newPassword) {
    const error = new Error('Identifier (Regimental No. or Email), Date of Birth, and New Password are required.');
    error.statusCode = 400;
    throw error;
  }

  const raw = identifier.trim();
  const normalised = raw.toLowerCase();

  // Find user by regimentalNo or email in Cadet collection first
  const cadetQuery = raw.includes('@')
    ? { email: normalised }
    : { regimentalNo: raw };

  let user = await Cadet.findOne(cadetQuery);

  // If not found in Cadet and input is email, check Admin collection
  if (!user && raw.includes('@')) {
    user = await Admin.findOne({ email: normalised });
  }

  if (!user) {
    const error = new Error('No user account found matching this identifier.');
    error.statusCode = 404;
    throw error;
  }

  // Verify Date of Birth
  if (!user.dob) {
    const error = new Error('Date of Birth is not registered for this account. Please contact your unit CTO.');
    error.statusCode = 400;
    throw error;
  }

  const providedDob = new Date(dob);
  const userDob = new Date(user.dob);

  const isMatch =
    providedDob.getUTCFullYear() === userDob.getUTCFullYear() &&
    providedDob.getUTCMonth() === userDob.getUTCMonth() &&
    providedDob.getUTCDate() === userDob.getUTCDate();

  if (!isMatch) {
    const error = new Error('Verification failed: Date of Birth does not match our unit records.');
    error.statusCode = 401;
    throw error;
  }

  // Set the new password (pre-save hook will hash it)
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  return { message: 'Password has been reset successfully. You can now log in with your new password.' };
}

module.exports = { forgotPassword };
