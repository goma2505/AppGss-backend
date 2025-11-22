import mongoose from 'mongoose';

// Schema para códigos de acceso únicos por rol
const accessCodeSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['guardia', 'administrador', 'residente', 'supervisor', 'comite']
  },
  code: {
    type: String,
    required: true,
    unique: true,
    minlength: 8,
    maxlength: 20
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null significa que no expira
  }
});

// Schema principal para servicios/fraccionamientos
const serviceSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'México'
    }
  },
  contact: {
    phone: String,
    email: String,
    emergencyPhone: String
  },
  // Códigos de acceso únicos para este servicio
  accessCodes: [accessCodeSchema],
  
  // Configuración del servicio
  settings: {
    timezone: {
      type: String,
      default: 'America/Mexico_City'
    },
    currency: {
      type: String,
      default: 'MXN'
    },
    language: {
      type: String,
      default: 'es'
    },
    maxResidents: {
      type: Number,
      default: 1000
    },
    maxGuards: {
      type: Number,
      default: 50
    },
    maxAdmins: {
      type: Number,
      default: 10
    }
  },
  
  // Estadísticas del servicio
  stats: {
    totalResidents: {
      type: Number,
      default: 0
    },
    totalGuards: {
      type: Number,
      default: 0
    },
    totalAdmins: {
      type: Number,
      default: 0
    },
    totalProperties: {
      type: Number,
      default: 0
    },
    totalTickets: {
      type: Number,
      default: 0
    },
    totalNotices: {
      type: Number,
      default: 0
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
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
serviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Métodos estáticos
serviceSchema.statics.findByServiceId = function(serviceId) {
  return this.findOne({ serviceId: serviceId.toUpperCase(), isActive: true });
};

serviceSchema.statics.validateAccessCode = function(code, role) {
  return this.findOne({
    'accessCodes.code': code,
    'accessCodes.role': role,
    'accessCodes.isActive': true,
    isActive: true
  });
};

serviceSchema.statics.getAllActiveServices = function() {
  return this.find({ isActive: true }).select('serviceId name displayName');
};

// Métodos de instancia
serviceSchema.methods.generateAccessCode = function(role) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  // Agregar prefijo según el rol
  const prefix = {
    'guardia': 'GRD',
    'administrador': 'ADM',
    'residente': 'RES',
    'supervisor': 'SUP',
    'comite': 'COM'
  };
  
  return `${prefix[role]}-${code}`;
};

serviceSchema.methods.addAccessCode = function(role, customCode = null) {
  const code = customCode || this.generateAccessCode(role);
  
  // Verificar si ya existe un código activo para este rol
  const existingCode = this.accessCodes.find(ac => ac.role === role && ac.isActive);
  if (existingCode) {
    existingCode.isActive = false;
  }
  
  this.accessCodes.push({
    role,
    code,
    isActive: true
  });
  
  return code;
};

serviceSchema.methods.updateStats = function(statType, increment = 1) {
  if (this.stats[statType] !== undefined) {
    this.stats[statType] += increment;
  }
};

// Función para inicializar los servicios predefinidos
serviceSchema.statics.initializeServices = async function() {
  const predefinedServices = [
    { serviceId: 'ALBA', name: 'alba', displayName: 'Alba' },
    { serviceId: 'PRIVANZA', name: 'privanza', displayName: 'Privanza' },
    { serviceId: 'CARTAGENA', name: 'cartagena', displayName: 'Cartagena' },
    { serviceId: 'SANJULIAN1', name: 'san-julian-1', displayName: 'San Julian 1' },
    { serviceId: 'CASASYES', name: 'casas-yes', displayName: 'Casas Yes' }
  ];
  
  // Códigos de acceso personalizados (constantes, sin expiración)
  const customAccessCodes = {
    'administrador': 'ADM-10000000025',
    'guardia': 'GRD-10000000030',
    'residente': 'RES-10000000035'
  };
  
  for (const serviceData of predefinedServices) {
    const existingService = await this.findByServiceId(serviceData.serviceId);
    
    if (!existingService) {
      const service = new this(serviceData);
      
      // Agregar códigos de acceso personalizados (sin expiración)
      service.addAccessCode('administrador', customAccessCodes.administrador);
      service.addAccessCode('guardia', customAccessCodes.guardia);
      service.addAccessCode('residente', customAccessCodes.residente);
      
      await service.save();
      console.log(`Servicio ${serviceData.displayName} inicializado con códigos personalizados`);
    } else {
      // Actualizar códigos existentes si es necesario
      let updated = false;
      
      // Verificar y actualizar cada rol
      for (const [role, code] of Object.entries(customAccessCodes)) {
        const existingCode = existingService.accessCodes.find(ac => ac.role === role && ac.isActive);
        if (!existingCode || existingCode.code !== code) {
          existingService.addAccessCode(role, code);
          updated = true;
        }
      }
      
      if (updated) {
        await existingService.save();
        console.log(`Códigos actualizados para ${serviceData.displayName}`);
      }
    }
  }
};

// Método para actualizar códigos de acceso globalmente
serviceSchema.statics.updateGlobalAccessCodes = async function() {
  const customAccessCodes = {
    'administrador': 'ADM-10000000025',
    'guardia': 'GRD-10000000030',
    'residente': 'RES-10000000035'
  };
  
  const services = await this.find({ isActive: true });
  
  for (const service of services) {
    let updated = false;
    
    for (const [role, code] of Object.entries(customAccessCodes)) {
      const existingCode = service.accessCodes.find(ac => ac.role === role && ac.isActive);
      if (!existingCode || existingCode.code !== code) {
        service.addAccessCode(role, code);
        updated = true;
      }
    }
    
    if (updated) {
      await service.save();
      console.log(`Códigos actualizados para ${service.displayName}`);
    }
  }
};

const Service = mongoose.model('Service', serviceSchema);

export default Service;