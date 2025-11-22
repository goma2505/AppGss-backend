import mongoose from 'mongoose';

const payrollAdvanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guardName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    maxlength: 500
  },
  processedDate: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['transfer', 'cash', 'check'],
    required: function() {
      return this.status === 'paid';
    }
  },
  // Para control de adelantos por período
  payrollPeriod: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    },
    period: {
      type: String,
      enum: ['first_half', 'second_half'], // primera o segunda quincena
      required: true
    }
  }
}, {
  timestamps: true
});

// Índices para mejorar consultas
payrollAdvanceSchema.index({ userId: 1, requestDate: -1 });
payrollAdvanceSchema.index({ status: 1, requestDate: -1 });
payrollAdvanceSchema.index({ 'payrollPeriod.year': 1, 'payrollPeriod.month': 1, 'payrollPeriod.period': 1 });

// Validación para evitar múltiples adelantos en el mismo período
payrollAdvanceSchema.index({ 
  userId: 1, 
  'payrollPeriod.year': 1, 
  'payrollPeriod.month': 1, 
  'payrollPeriod.period': 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    status: { $in: ['pending', 'approved', 'paid'] } 
  }
});

export default mongoose.model('PayrollAdvance', payrollAdvanceSchema);