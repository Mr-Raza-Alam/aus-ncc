const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cadet',
      required: true,
      index: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ['3AB', '62AB'],
      index: true,
    },
    status: {
      type: String,
      enum: ['P', 'A'],
      default: 'P',
    },
    markedVia: {
      type: String,
      enum: ['geo', 'manual'],
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    gpsCoords: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
      distanceMeters: { type: Number },
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin', // Present for manual override entries
    },
  },
  { timestamps: true }
);

// One record per cadet per session
attendanceRecordSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
// For quick lookup of cadet history by unit
attendanceRecordSchema.index({ unit: 1, userId: 1, status: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);

