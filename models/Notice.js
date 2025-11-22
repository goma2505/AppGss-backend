import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  content: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['aviso', 'incidente', 'emergencia', 'mantenimiento'],
    default: 'aviso'
  },
  priority: {
    type: String,
    required: true,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media'
  },
  status: {
    type: String,
    required: true,
    enum: ['activo', 'resuelto', 'en_proceso', 'cancelado'],
    default: 'activo'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByRole: {
    type: String,
    required: true,
    enum: ['admin', 'manager', 'administrador'],
    trim: true
  },
  serviceId: {
    type: String,
    required: true,
    uppercase: true
  },
  affectedAreas: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    author: {
      type: String,
      required: true
    },
    authorRole: {
      type: String,
      required: true,
      enum: ['admin', 'manager', 'residente']
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolvedBy: {
    type: String,
    trim: true
  },
  resolvedAt: {
    type: Date
  },
  estimatedResolution: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
noticeSchema.index({ type: 1, status: 1 });
noticeSchema.index({ priority: 1, createdAt: -1 });
noticeSchema.index({ createdAt: -1 });

// Método para obtener avisos activos
noticeSchema.statics.getActiveNotices = function() {
  return this.find({ status: { $in: ['activo', 'en_proceso'] } })
    .sort({ priority: -1, createdAt: -1 });
};

// Método para obtener avisos por tipo
noticeSchema.statics.getNoticesByType = function(type) {
  return this.find({ type })
    .sort({ createdAt: -1 });
};

// Método para marcar como resuelto
noticeSchema.methods.markAsResolved = function(resolvedBy) {
  this.status = 'resuelto';
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  return this.save();
};

export default mongoose.model('Notice', noticeSchema);