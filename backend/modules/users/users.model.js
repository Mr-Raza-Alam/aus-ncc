/**
 * users.model.js
 *
 * NOTE: The data model has been cleanly separated into two distinct collections:
 *   1. Admin -> `admins` collection (see ./admin.model.js)
 *   2. Cadet -> `cadets` collection (see ./cadet.model.js)
 *
 * This file is retained as a safe backward-compatibility proxy.
 */
const mongoose = require('mongoose');
const Admin = require('./admin.model');
const Cadet = require('./cadet.model');

// Register a fallback 'User' model so any legacy 'ref: User' never throws MissingSchemaError
if (!mongoose.models.User) {
  const userSchema = new mongoose.Schema(
    {
      name: String,
      email: String,
      rank: String,
      designation: String,
      regimentalNo: String,
      unit: String,
      roles: [String],
    },
    { strict: false }
  );
  mongoose.model('User', userSchema);
}

module.exports = Cadet;
module.exports.Admin = Admin;
module.exports.Cadet = Cadet;
