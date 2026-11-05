const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    roles: {
      type: [String],
      enum: ['lead_admin', 'cto'],
      default: ['cto'],
    },
    unit: {
      type: String,
      required: true,
      enum: ['3AB', '62AB'],
      index: true,
    },
    designation: { type: String, trim: true },
    permissions: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    mustChangePassword: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: true },
  },
  {
    collection: 'admins',
    timestamps: true,
  }
);

/**
 * Pre-save hook — hash password when new or modified.
 */
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance method — compare plaintext against hash.
 */
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);

