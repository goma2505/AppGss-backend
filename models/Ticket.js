import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['maintenance', 'security', 'complaint', 'request', 'emergency', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    type: String
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number
  }],
  resolvedAt: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  serviceCode: {
    type: String
  },
  location: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ category: 1, createdAt: -1 });
ticketSchema.index({ priority: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, createdAt: -1 });

// Virtual for ticket age
ticketSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for resolution time
ticketSchema.virtual('resolutionTime').get(function() {
  if (this.resolvedAt) {
    return this.resolvedAt - this.createdAt;
  }
  return null;
});

export default mongoose.model('Ticket', ticketSchema);