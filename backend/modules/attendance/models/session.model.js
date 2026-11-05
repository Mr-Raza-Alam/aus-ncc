const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      required: true,
      enum: ['3AB', '62AB'],
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD format in IST
      required: true,
      index: true,
    },
    sessionType: {
      type: String,
      enum: [
        'Ground Drill / Practical Parade',
        'Theory / Classroom Lecture',
        'Firing / Range Practice',
        'Special / Camp Training',
      ],
      default: 'Ground Drill / Practical Parade',
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    venue: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      radiusMeters: { type: Number, default: 100 },
      name: { type: String, default: 'Assam University Parade Ground' },
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    photoUrl: {
      type: String,
    },
    photoCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    photoCapturedAt: {
      type: Date,
    },
    declaredPresentCount: {
      type: Number,
      default: 0,
    },
    sessionCategory: {
      type: String,
      enum: ['casual', 'refreshment'],
      default: 'casual',
    },
    entitlementAmount: {
      type: Number,
      default: 0,
    },
    nerUploaded: {
      type: Boolean,
      default: false,
    },
    nerUploadedAt: {
      type: Date,
    },
    nerRefNo: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound index for quick lookup of active session per unit
attendanceSessionSchema.index({ unit: 1, status: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);

