import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  // Información del guardia
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Información del fraccionamiento
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  
  // Fecha del turno
  shiftDate: {
    type: Date,
    required: true
  },
  
  // Horarios programados
  scheduledStartTime: {
    type: Date,
    required: true
  },
  
  scheduledEndTime: {
    type: Date,
    required: true
  },
  
  // Registro biométrico de inicio
  biometricStartTime: {
    type: Date,
    default: null
  },
  
  // Registro de inicio en la app (ventana de 30 min)
  appStartTime: {
    type: Date,
    default: null
  },
  
  // Registro de fin de turno
  endTime: {
    type: Date,
    default: null
  },
  
  // Estado del turno
  status: {
    type: String,
    enum: ['scheduled', 'biometric_registered', 'active', 'on_break', 'on_patrol', 'completed', 'missed'],
    default: 'scheduled'
  },
  
  // Actividades durante el turno
  activities: [{
    type: {
      type: String,
      enum: ['break_start', 'break_end', 'patrol_start', 'patrol_end', 'incident'],
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    notes: {
      type: String,
      default: ''
    },
    location: {
      latitude: Number,
      longitude: Number
    }
  }],
  
  // Validación de ventana de tiempo (30 min después del biométrico)
  isWithinTimeWindow: {
    type: Boolean,
    default: false
  },
  
  // Tiempo total trabajado (en minutos)
  totalWorkedMinutes: {
    type: Number,
    default: 0
  },
  
  // Tiempo en break (en minutos)
  totalBreakMinutes: {
    type: Number,
    default: 0
  },
  
  // Tiempo en rondín (en minutos)
  totalPatrolMinutes: {
    type: Number,
    default: 0
  },
  
  // Notas adicionales
  notes: {
    type: String,
    default: ''
  },
  
  // Información de creación y actualización
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
shiftSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para verificar si está dentro de la ventana de tiempo
shiftSchema.methods.checkTimeWindow = function() {
  if (!this.biometricStartTime) return false;
  
  const windowEnd = new Date(this.biometricStartTime.getTime() + 30 * 60 * 1000); // 30 minutos
  const now = new Date();
  
  return now <= windowEnd;
};

// Método para calcular tiempo trabajado
shiftSchema.methods.calculateWorkedTime = function() {
  if (!this.appStartTime || !this.endTime) return 0;
  
  const totalTime = (this.endTime - this.appStartTime) / (1000 * 60); // en minutos
  return Math.max(0, totalTime - this.totalBreakMinutes);
};

// Método para iniciar break
shiftSchema.methods.startBreak = function() {
  this.status = 'on_break';
  this.activities.push({
    type: 'break_start',
    timestamp: new Date()
  });
};

// Método para terminar break
shiftSchema.methods.endBreak = function() {
  const lastBreakStart = this.activities
    .filter(a => a.type === 'break_start')
    .pop();
    
  if (lastBreakStart) {
    const breakDuration = (new Date() - lastBreakStart.timestamp) / (1000 * 60);
    this.totalBreakMinutes += breakDuration;
  }
  
  this.status = 'active';
  this.activities.push({
    type: 'break_end',
    timestamp: new Date()
  });
};

// Método para iniciar rondín
shiftSchema.methods.startPatrol = function(location = null) {
  this.status = 'on_patrol';
  this.activities.push({
    type: 'patrol_start',
    timestamp: new Date(),
    location: location
  });
};

// Método para terminar rondín
shiftSchema.methods.endPatrol = function(location = null) {
  const lastPatrolStart = this.activities
    .filter(a => a.type === 'patrol_start')
    .pop();
    
  if (lastPatrolStart) {
    const patrolDuration = (new Date() - lastPatrolStart.timestamp) / (1000 * 60);
    this.totalPatrolMinutes += patrolDuration;
  }
  
  this.status = 'active';
  this.activities.push({
    type: 'patrol_end',
    timestamp: new Date(),
    location: location
  });
};

// Índices para optimizar consultas
shiftSchema.index({ userId: 1, shiftDate: 1 });
shiftSchema.index({ serviceId: 1, shiftDate: 1 });
shiftSchema.index({ status: 1 });
shiftSchema.index({ scheduledStartTime: 1 });

export default mongoose.model('Shift', shiftSchema);