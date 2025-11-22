import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Schema
 * 
 * Modelo para usuarios del sistema con soporte multi-servicio, 
 */
const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9._-]+$/
  },
  email: { 
    type: String, 
    required: function() {
      return this.role !== 'administrador' && this.role !== 'guardia';
    },
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        // Solo validar formato si el email está presente
        if (!email) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Por favor ingrese un email válido'
    }
  },
  street: {
    type: String,
    required: function() {
      return this.role === 'residente';
    },
    trim: true
  },
  number: {
    type: String,
    required: function() {
      return this.role === 'residente';
    },
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'resident', 'guardia', 'administrador', 'residente', 'supervisor', 'comite'], 
    default: 'residente'
  },
  
  // Código del servicio/fraccionamiento al que pertenece
  serviceCode: {
    type: String,
    required: function() {
      return this.role === 'residente' || this.role === 'comite';
    },
    uppercase: true,
    trim: true
  },
  
  // Array de servicios permitidos para guardias (permite rotación entre fraccionamientos)
  allowedServices: {
    type: [String],
    default: function() {
      // Para guardias, inicializar con su serviceCode principal
      if (this.role === 'guardia') {
        return this.serviceCode ? [this.serviceCode] : [];
      }
      return [];
    },
    validate: {
      validator: function(services) {
        // Solo guardias pueden tener múltiples servicios
        if (this.role !== 'guardia') {
          return services.length === 0;
        }
        return true;
      },
      message: 'Solo los guardias pueden tener múltiples servicios asignados'
    }
  },
  // Lista de servicios asignados efectiva usada por la app
  serviceCodes: {
    type: [String],
    default: function() {
      if (this.role === 'guardia') {
        return this.serviceCode ? [this.serviceCode] : [];
      }
      return [];
    }
  },
  
  // Código de acceso usado para registrarse
  accessCode: {
    type: String,
    required: function() {
      return this.role === 'residente' || this.role === 'comite';
    }
  },
  
  // Información adicional del usuario
  profile: {
    phone: String,
    address: {
      street: String,
      houseNumber: String,
      block: String,
      lot: String
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    avatar: String
  },
  
  // Configuraciones del usuario
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      default: 'es'
    },
    timezone: {
      type: String,
      default: 'America/Mexico_City'
    }
  },

  // Campos adicionales para guardias
  experience: {
    type: String,
    default: ''
  },
  certifications: {
    type: [String],
    default: []
  },
  
  // Estado del usuario
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  lastLogin: {
    type: Date,
    default: null
  },

  // Campos para bloqueo de residentes
  blockReason: {
    type: String,
    default: null
  },
  
  blockedAt: {
    type: Date,
    default: null
  },
  
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Estado de pagos para residentes
  paymentStatus: {
    type: String,
    enum: ['current', 'overdue', 'suspended'],
    default: 'current'
  },
  
  lastPaymentDate: {
    type: Date,
    default: null
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para hashear la contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  // Solo hashear la contraseña si ha sido modificada (o es nueva)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password con cost de 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para obtener información pública del usuario
UserSchema.methods.toPublicJSON = function() {
  const publicData = {
    id: this._id,
    name: this.name,
    username: this.username,
    email: this.email,
    role: this.role,
    serviceCode: this.serviceCode,
    serviceCodes: this.serviceCodes,
    profile: this.profile,
    isActive: this.isActive,
    isVerified: this.isVerified,
    lastLogin: this.lastLogin,
    experience: this.experience,
    certifications: this.certifications,
    createdAt: this.createdAt
  };
  
  // Solo incluir dirección si es residente
  if (this.role === 'residente') {
    publicData.street = this.street;
    publicData.number = this.number;
  }
  
  return publicData;
};

// Método para verificar si un usuario tiene acceso a un servicio específico
UserSchema.methods.hasAccessToService = function(serviceCode) {
  if (this.role === 'admin' || this.role === 'administrador' || this.role === 'supervisor') {
    return true; // Administradores y supervisores tienen acceso a todo
  }
  
  if (this.role === 'guardia') {
    return this.serviceCodes && this.serviceCodes.includes(serviceCode.toUpperCase());
  }
  
  // Para otros roles, solo su serviceCode principal
  return this.serviceCode === serviceCode.toUpperCase();
};

// Método para agregar servicio a un guardia
UserSchema.methods.addService = function(serviceCode) {
  if (this.role !== 'guardia') {
    throw new Error('Solo los guardias pueden tener múltiples servicios');
  }
  
  const upperServiceCode = serviceCode.toUpperCase();
  if (!this.serviceCodes) {
    this.serviceCodes = [];
  }
  if (!this.serviceCodes.includes(upperServiceCode)) {
    this.serviceCodes.push(upperServiceCode);
  }
};

// Método para remover servicio de un guardia
UserSchema.methods.removeService = function(serviceCode) {
  if (this.role !== 'guardia') {
    throw new Error('Solo los guardias pueden tener múltiples servicios');
  }
  
  const upperServiceCode = serviceCode.toUpperCase();
  if (this.serviceCodes) {
    this.serviceCodes = this.serviceCodes.filter(s => s !== upperServiceCode);
  }
};

// Método para obtener todos los servicios de un usuario
UserSchema.methods.getAllServices = function() {
  if (this.role === 'admin' || this.role === 'administrador' || this.role === 'supervisor') {
    return ['ALL']; // Indica acceso a todos los servicios
  }
  
  if (this.role === 'guardia') {
    return this.serviceCodes || [];
  }
  
  return this.serviceCode ? [this.serviceCode] : [];
};

// Métodos estáticos
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

UserSchema.statics.findByServiceCode = function(serviceCode) {
  return this.find({ serviceCode: serviceCode.toUpperCase(), isActive: true });
};

UserSchema.statics.findByRole = function(role, serviceCode = null) {
  const query = { role, isActive: true };
  if (serviceCode) {
    query.serviceCode = serviceCode.toUpperCase();
  }
  return this.find(query);
};

UserSchema.statics.countByService = function(serviceCode) {
  return this.countDocuments({ serviceCode: serviceCode.toUpperCase(), isActive: true });
};

UserSchema.statics.countByRole = function(role, serviceCode = null) {
  const query = { role, isActive: true };
  if (serviceCode) {
    query.serviceCode = serviceCode.toUpperCase();
  }
  return this.countDocuments(query);
};

// Método para encontrar guardias que tienen acceso a un servicio específico
UserSchema.statics.findGuardsByService = function(serviceCode) {
  return this.find({
    role: 'guardia',
    isActive: true,
    serviceCodes: serviceCode.toUpperCase()
  });
};

// Método para obtener todos los servicios disponibles para un usuario
UserSchema.statics.getAvailableServices = function(userId) {
  return this.findById(userId).then(user => {
    if (!user) return [];
    
    if (user.role === 'admin' || user.role === 'administrador' || user.role === 'supervisor') {
      // Administradores y supervisores ven todos los servicios
      const Service = mongoose.model('Service');
      return Service.find({ isActive: true }).select('code name');
    }
    
    if (user.role === 'guardia') {
      return user.serviceCodes || [];
    }
    
    // Para otros roles, solo su servicio principal
    return [user.serviceCode];
  });
};

// Método para validar código de acceso
UserSchema.statics.validateAccessCode = async function(code, role) {
  const Service = mongoose.model('Service');
  return await Service.validateAccessCode(code, role);
};

// Índices para mejorar el rendimiento
// Índices únicos ya se crean por las propiedades del esquema (unique:true)
UserSchema.index({ serviceCode: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ serviceCode: 1, role: 1 });
UserSchema.index({ isActive: 1 });

const User = mongoose.model('User', UserSchema);

export default User;