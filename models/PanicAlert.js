import mongoose from 'mongoose';

const panicAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String
  },
  description: {
    type: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  status: {
    type: String,
    enum: ['active', 'responded', 'resolved', 'false_alarm'],
    default: 'active'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  responderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    type: String
  },
  notes: {
    type: String,
    maxlength: 200
  },
  responseTime: {
    type: Date
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  deviceInfo: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
panicAlertSchema.index({ userId: 1, createdAt: -1 });
panicAlertSchema.index({ status: 1, createdAt: -1 });
panicAlertSchema.index({ severity: 1, createdAt: -1 });

export default mongoose.model('PanicAlert', panicAlertSchema);