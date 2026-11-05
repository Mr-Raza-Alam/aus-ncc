const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const cadetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    regimentalNo: { type: String, required: true, trim: true },
    admissionNo: { type: String, trim: true }, // University Roll / Admission No.
    department: { type: String, trim: true },   // University academic department
    gender: {
      type: String,
      enum: ['SD', 'SW'], // Senior Division (Male) / Senior Wing (Female)
      default: 'SD',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    dob: { type: Date },
    phone: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    roles: {
      type: [String],
      enum: ['assistant', 'ncc-cdt'],
      default: ['ncc-cdt'],
    },
    rank: {
      type: String,
      enum: ['SUO', 'JUO', 'CSM', 'CQMS', 'Sergeant', 'Cadet'],
      default: 'Cadet',
    },
    unit: {
      type: String,
      required: true,
      enum: ['3AB', '62AB'],
      index: true,
    },
    year: { type: mongoose.Schema.Types.Mixed, default: 1 }, // 1, 2, 3, or 'alumni'
    enrollmentYear: { type: Number },
    designation: { type: String, trim: true },
    permissions: { type: [String], default: [] }, // E.g. SUO elevated session / report permissions
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['active', 'alumni', 'suspended'],
      default: 'active',
    },
    mustChangePassword: { type: Boolean, default: true },
    profileCompleted: { type: Boolean, default: false },
  },
  {
    collection: 'cadets',
    timestamps: true,
  }
);

// Compound unique index — unique regimentalNo per unit
cadetSchema.index({ unit: 1, regimentalNo: 1 }, { unique: true });

// Sparse unique index on email
cadetSchema.index({ email: 1 }, { unique: true, sparse: true });

/**
 * Pre-save hook — hash password when new or modified.
 */
cadetSchema.pre('save', async function (next) {
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
cadetSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Cadet', cadetSchema);

