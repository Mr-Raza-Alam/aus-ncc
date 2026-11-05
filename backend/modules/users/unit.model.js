const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      enum: ['3AB', '62AB'],
    },
    name: { type: String, required: true },
    active: { type: Boolean, default: false },
    ctoUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    classDays: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Unit', unitSchema);
