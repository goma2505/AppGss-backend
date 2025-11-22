import mongoose from 'mongoose';

const uniformRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guardName: {
    type: String,
    required: true
  },
  requestType: {
    type: String,
    enum: ['personal', 'service_equipment'],
    required: true
  },
  // Para uniformes personales
  personalItems: {
    botas: {
      requested: { type: Boolean, default: false },
      size: String,
      quantity: { type: Number, default: 0 }
    },
    camisas: {
      requested: { type: Boolean, default: false },
      size: String,
      quantity: { type: Number, default: 0 }
    },
    pantalones: {
      requested: { type: Boolean, default: false },
      size: String,
      quantity: { type: Number, default: 0 }
    }
  },
  // Para equipo por servicio
  serviceEquipment: {
    fornituras: {
      requested: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 }
    },
    bastonRetractil: {
      requested: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 }
    },
    linterna: {
      requested: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 }
    },
    parches: {
      requested: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 }
    },
    impermeable: {
      requested: { type: Boolean, default: false },
      size: String,
      quantity: { type: Number, default: 0 }
    },
    gasLacrimogeno: {
      requested: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 }
    }
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: function() {
      return this.requestType === 'service_equipment';
    }
  },
  serviceName: {
    type: String,
    required: function() {
      return this.requestType === 'service_equipment';
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'delivered', 'rejected', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  adminNotes: {
    type: String,
    maxlength: 500
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedDate: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para mejorar consultas
uniformRequestSchema.index({ userId: 1, requestDate: -1 });
uniformRequestSchema.index({ status: 1, requestDate: -1 });
uniformRequestSchema.index({ serviceId: 1, requestDate: -1 });

export default mongoose.model('UniformRequest', uniformRequestSchema);