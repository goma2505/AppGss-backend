import mongoose from 'mongoose';

const accessCodeSchema = new mongoose.Schema({
  // Código de acceso único
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Fraccionamiento al que pertenece
  subdivision: {
    type: String,
    required: true,
    enum: [
      'ALBA',
      'PRIVANZA', 
      'BOSQUES',
      'JARDINES',
      'COLINAS',
      'VALLE',
      'MONTAÑA',
      'LAGOS',
      'PRADERAS',
      'SENDEROS',
      'MIRADOR'
    ]
  },
  
  // Tipo de cuenta
  accountType: {
    type: String,
    required: true,
    enum: ['COMMITTEE', 'SUPERVISOR']
  },
  
  // Número secuencial único por fraccionamiento y tipo
  sequentialNumber: {
    type: String,
    required: true,
    match: /^\d{6}$/ // Exactamente 6 dígitos
  },
  
  // Estado del código
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'],
    default: 'ACTIVE'
  },
  
  // Usuario que generó el código (administrador)
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Usuario que utilizó el código (si aplica)
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Fecha de generación
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Fecha de uso
  usedAt: {
    type: Date,
    default: null
  },
  
  // Fecha de expiración (opcional)
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Notas adicionales
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Metadatos adicionales
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String
  }
}, {
  timestamps: true,
  collection: 'access_codes'
});

// Índices compuestos para optimizar consultas
accessCodeSchema.index({ subdivision: 1, accountType: 1, sequentialNumber: 1 }, { unique: true });
accessCodeSchema.index({ subdivision: 1, accountType: 1, status: 1 });
accessCodeSchema.index({ generatedBy: 1, status: 1 });
accessCodeSchema.index({ status: 1, expiresAt: 1 });

// Método estático para generar el próximo número secuencial
accessCodeSchema.statics.getNextSequentialNumber = async function(subdivision, accountType) {
  const lastCode = await this.findOne(
    { subdivision, accountType },
    { sequentialNumber: 1 },
    { sort: { sequentialNumber: -1 } }
  );
  
  if (!lastCode) {
    return '000001';
  }
  
  const nextNumber = parseInt(lastCode.sequentialNumber) + 1;
  return nextNumber.toString().padStart(6, '0');
};

// Método estático para generar código completo
accessCodeSchema.statics.generateCode = function(subdivision, accountType, sequentialNumber) {
  const prefix = accountType === 'COMMITTEE' ? 'COM' : 'SUP';
  
  // Fraccionamientos con formato especial
  const specialFormats = {
    'PRIVANZA': `${prefix}-${sequentialNumber}-PRIVANZA`,
    'JARDINES': `${prefix}-${sequentialNumber}-JARDINES`,
    'VALLE': `${prefix}-${sequentialNumber}-VALLE`,
    'LAGOS': `${prefix}-${sequentialNumber}-LAGOS`,
    'SENDEROS': `${prefix}-${sequentialNumber}-SENDEROS`
  };
  
  if (specialFormats[subdivision]) {
    return specialFormats[subdivision];
  }
  
  // Formato estándar para otros fraccionamientos
  return `${prefix}-${subdivision}-${sequentialNumber}`;
};

// Método para marcar código como usado
accessCodeSchema.methods.markAsUsed = function(userId) {
  this.status = 'USED';
  this.usedBy = userId;
  this.usedAt = new Date();
  return this.save();
};

// Método para revocar código
accessCodeSchema.methods.revoke = function() {
  this.status = 'REVOKED';
  return this.save();
};

// Método para verificar si el código está disponible
accessCodeSchema.methods.isAvailable = function() {
  if (this.status !== 'ACTIVE') {
    return false;
  }
  
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.status = 'EXPIRED';
    this.save();
    return false;
  }
  
  return true;
};

// Middleware para validar expiración antes de guardar
accessCodeSchema.pre('save', function(next) {
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'ACTIVE') {
    this.status = 'EXPIRED';
  }
  next();
});

// Método virtual para obtener información del fraccionamiento
accessCodeSchema.virtual('subdivisionInfo').get(function() {
  const subdivisionNames = {
    'ALBA': 'Fraccionamiento Alba',
    'PRIVANZA': 'Fraccionamiento Privanza',
    'BOSQUES': 'Fraccionamiento Bosques',
    'JARDINES': 'Fraccionamiento Jardines',
    'COLINAS': 'Fraccionamiento Colinas',
    'VALLE': 'Fraccionamiento Valle',
    'MONTAÑA': 'Fraccionamiento Montaña',
    'LAGOS': 'Fraccionamiento Lagos',
    'PRADERAS': 'Fraccionamiento Praderas',
    'SENDEROS': 'Fraccionamiento Senderos',
    'MIRADOR': 'Fraccionamiento Mirador'
  };
  
  return {
    code: this.subdivision,
    name: subdivisionNames[this.subdivision] || this.subdivision
  };
});

// Método virtual para obtener información del tipo de cuenta
accessCodeSchema.virtual('accountTypeInfo').get(function() {
  return {
    code: this.accountType,
    name: this.accountType === 'COMMITTEE' ? 'Comité' : 'Supervisor'
  };
});

// Configurar virtuals en JSON
accessCodeSchema.set('toJSON', { virtuals: true });
accessCodeSchema.set('toObject', { virtuals: true });

export default mongoose.model('AccessCode', accessCodeSchema);