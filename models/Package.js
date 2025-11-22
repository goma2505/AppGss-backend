import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  senderCompany: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'extra_large'],
    default: 'medium'
  },
  weight: {
    type: Number // in kg
  },
  status: {
    type: String,
    enum: ['received', 'notified', 'delivered', 'returned', 'lost'],
    default: 'received'
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveredAt: {
    type: Date
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: {
    type: Date
  },
  notes: {
    type: String
  },
  photos: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  serviceCode: {
    type: String
  },
  location: {
    building: String,
    apartment: String,
    floor: String
  },
  specialInstructions: {
    type: String
  },
  fragile: {
    type: Boolean,
    default: false
  },
  requiresSignature: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
packageSchema.index({ recipientId: 1, createdAt: -1 });
packageSchema.index({ status: 1, createdAt: -1 });
packageSchema.index({ receivedBy: 1, createdAt: -1 });
packageSchema.index({ deliveredBy: 1, createdAt: -1 });
packageSchema.index({ trackingNumber: 1 });
packageSchema.index({ serviceCode: 1, createdAt: -1 });

// Virtual for package age
packageSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for delivery time
packageSchema.virtual('deliveryTime').get(function() {
  if (this.deliveredAt) {
    return this.deliveredAt - this.receivedAt;
  }
  return null;
});

// Method to check if package is overdue (more than 7 days)
packageSchema.methods.isOverdue = function() {
  if (this.status === 'delivered') return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.receivedAt < sevenDaysAgo;
};

export default mongoose.model('Package', packageSchema);