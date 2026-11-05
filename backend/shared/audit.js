const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    unit: { type: String, index: true },
    action: { type: String, required: true },
    entity: { type: String },
    entityId: { type: mongoose.Schema.Types.Mixed },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: false }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/**
 * Writes an audit log entry.
 * Never throws — failures are logged to stderr so they don't break the calling operation.
 */
async function logAudit({
  unit,
  action,
  entity,
  entityId,
  changedBy,
  performedBy,
  before,
  after,
  reason,
  metadata,
  ip,
}) {
  try {
    await AuditLog.create({
      unit,
      action,
      entity: entity || (metadata && metadata.targetCollection) || 'System',
      entityId: entityId || (metadata && metadata.targetId),
      changedBy: changedBy || performedBy,
      changedAt: new Date(),
      before,
      after,
      reason: reason || '',
      metadata,
      ip,
    });
  } catch (err) {
    console.error('AuditLog write failed:', err.message);
  }
}

module.exports = { AuditLog, logAudit };
