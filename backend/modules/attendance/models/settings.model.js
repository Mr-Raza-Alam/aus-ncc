const mongoose = require('mongoose');

const attendanceSettingsSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      unique: true,
      required: true,
      enum: ['3AB', '62AB'],
    },
    minAttendancePercent: {
      type: Number,
      default: 75,
      min: 1,
      max: 100,
    },
    geofenceRadiusMeters: {
      type: Number,
      default: 100,
      min: 10,
    },
    attendanceWindowMinutes: {
      type: Number,
      default: 30,
      min: 5,
    },
    classDays: {
      type: [String],
      default: ['Wednesday', 'Saturday'],
    },
    nerPortalUrl: {
      type: String,
      default: 'https://ner.nccindia.nic.in',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttendanceSettings', attendanceSettingsSchema);
