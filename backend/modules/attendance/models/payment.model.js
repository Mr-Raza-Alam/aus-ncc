const mongoose = require('mongoose');

const refreshmentPaymentSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      required: true,
      enum: ['3AB', '62AB'],
      index: true,
    },
    direction: {
      type: String,
      enum: ['in', 'out'],
      required: true, // in = received from Unit, out = paid to vendor
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefreshmentPayment', refreshmentPaymentSchema);

