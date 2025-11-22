import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  role: { type: String },
  serviceCode: { type: String },
  method: { type: String },
  path: { type: String, index: true },
  statusCode: { type: Number },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

export default AuditLog;