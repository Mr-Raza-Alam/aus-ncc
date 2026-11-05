const mongoose = require('mongoose');

const refreshmentBillSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      required: true,
      enum: ['3AB', '62AB'],
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      default: null,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    billImageUrl: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefreshmentBill', refreshmentBillSchema);

