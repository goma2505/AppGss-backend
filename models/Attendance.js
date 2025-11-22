import mongoose from 'mongoose';

/**
 * Attendance Schema
 * 
 * Modelo para registrar la asistencia de los guardias de seguridad
 */
const AttendanceSchema = new mongoose.Schema({
  guard: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property'
  },
  checkInTime: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  checkOutTime: { 
    type: Date,
    default: null
  },
  status: { 
    type: String, 
    enum: ['presente', 'ausente', 'tardanza', 'permiso'], 
    default: 'presente' 
  },
  serviceCode: {
    type: String,
    uppercase: true
  },
  biometricVerified: { 
    type: Boolean, 
    default: false 
  },
  notes: { 
    type: String,
    default: ''
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Índices para mejorar el rendimiento de las consultas
AttendanceSchema.index({ guard: 1, checkInTime: 1 });
AttendanceSchema.index({ property: 1 });
AttendanceSchema.index({ serviceCode: 1 });
AttendanceSchema.index({ checkInTime: 1 });

export default mongoose.model('Attendance', AttendanceSchema);