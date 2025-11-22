import Shift from '../models/Shift.js';
import User from '../models/User.js';
import Service from '../models/Service.js';

class ShiftService {
  // Crear un nuevo turno programado
  static async createScheduledShift(userId, serviceId, scheduledStartTime, scheduledEndTime) {
    try {
      const shift = new Shift({
        userId,
        serviceId,
        shiftDate: new Date(scheduledStartTime).toDateString(),
        scheduledStartTime: new Date(scheduledStartTime),
        scheduledEndTime: new Date(scheduledEndTime),
        status: 'scheduled'
      });
      
      return await shift.save();
    } catch (error) {
      throw new Error(`Error creating scheduled shift: ${error.message}`);
    }
  }
  
  // Registrar entrada biométrica
  static async registerBiometricEntry(userId, timestamp = new Date()) {
    try {
      // Buscar turno programado para hoy
      const today = new Date().toDateString();
      const shift = await Shift.findOne({
        userId,
        shiftDate: today,
        status: 'scheduled'
      }).populate('serviceId');
      
      if (!shift) {
        throw new Error('No scheduled shift found for today');
      }
      
      // Verificar que esté dentro del horario programado (con tolerancia)
      const scheduledStart = new Date(shift.scheduledStartTime);
      const tolerance = 15 * 60 * 1000; // 15 minutos de tolerancia
      const earliestStart = new Date(scheduledStart.getTime() - tolerance);
      const latestStart = new Date(scheduledStart.getTime() + tolerance);
      
      if (timestamp < earliestStart || timestamp > latestStart) {
        throw new Error('Biometric entry outside allowed time window');
      }
      
      shift.biometricStartTime = timestamp;
      shift.status = 'biometric_registered';
      shift.isWithinTimeWindow = true;
      
      return await shift.save();
    } catch (error) {
      throw new Error(`Error registering biometric entry: ${error.message}`);
    }
  }
  
  // Iniciar turno en la app (dentro de ventana de 30 min)
  static async startShiftInApp(userId, serviceId) {
    try {
      const today = new Date().toDateString();
      const shift = await Shift.findOne({
        userId,
        shiftDate: today,
        status: 'biometric_registered'
      }).populate('serviceId');
      
      if (!shift) {
        throw new Error('No biometric entry found or shift already started');
      }
      
      // Verificar ventana de 30 minutos
      if (!shift.checkTimeWindow()) {
        shift.status = 'missed';
        await shift.save();
        throw new Error('Time window expired. Cannot start shift.');
      }
      
      // Verificar que el fraccionamiento coincida
      if (shift.serviceId._id.toString() !== serviceId) {
        throw new Error('Service mismatch. Cannot start shift for different service.');
      }
      
      shift.appStartTime = new Date();
      shift.status = 'active';
      
      return await shift.save();
    } catch (error) {
      throw new Error(`Error starting shift in app: ${error.message}`);
    }
  }
  
  // Obtener turnos activos del usuario
  static async getActiveShift(userId) {
    try {
      return await Shift.findOne({
        userId,
        status: { $in: ['active', 'on_break', 'on_patrol'] }
      }).populate('serviceId').populate('userId', 'username email');
    } catch (error) {
      throw new Error(`Error getting active shift: ${error.message}`);
    }
  }
  
  // Obtener servicios disponibles para el usuario
  static async getAvailableServices(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return [];
      }
      // Admin, administrador, supervisor ven todos los servicios activos
      if (['admin', 'administrador', 'supervisor', 'manager'].includes(user.role)) {
        return await Service.find({ isActive: true }).select('serviceId serviceCode name displayName');
      }
      // Guardia: por lista de serviceCodes
      if (user.role === 'guardia') {
        if (!user.serviceCodes || user.serviceCodes.length === 0) return [];
        return await Service.find({
          serviceCode: { $in: user.serviceCodes },
          isActive: true
        }).select('serviceId serviceCode name displayName');
      }
      // Otros roles: su serviceCode principal
      if (user.serviceCode) {
        return await Service.find({ serviceCode: user.serviceCode, isActive: true }).select('serviceId serviceCode name displayName');
      }
      return [];
    } catch (error) {
      throw new Error(`Error getting available services: ${error.message}`);
    }
  }
  
  // Iniciar break
  static async startBreak(userId) {
    try {
      const shift = await this.getActiveShift(userId);
      if (!shift || shift.status !== 'active') {
        throw new Error('No active shift found');
      }
      
      shift.startBreak();
      return await shift.save();
    } catch (error) {
      throw new Error(`Error starting break: ${error.message}`);
    }
  }
  
  // Terminar break
  static async endBreak(userId) {
    try {
      const shift = await this.getActiveShift(userId);
      if (!shift || shift.status !== 'on_break') {
        throw new Error('No active break found');
      }
      
      shift.endBreak();
      return await shift.save();
    } catch (error) {
      throw new Error(`Error ending break: ${error.message}`);
    }
  }
  
  // Iniciar rondín
  static async startPatrol(userId, location = null) {
    try {
      const shift = await this.getActiveShift(userId);
      if (!shift || shift.status !== 'active') {
        throw new Error('No active shift found');
      }
      
      shift.startPatrol(location);
      return await shift.save();
    } catch (error) {
      throw new Error(`Error starting patrol: ${error.message}`);
    }
  }
  
  // Terminar rondín
  static async endPatrol(userId, location = null) {
    try {
      const shift = await this.getActiveShift(userId);
      if (!shift || shift.status !== 'on_patrol') {
        throw new Error('No active patrol found');
      }
      
      shift.endPatrol(location);
      return await shift.save();
    } catch (error) {
      throw new Error(`Error ending patrol: ${error.message}`);
    }
  }
  
  // Terminar turno
  static async endShift(userId) {
    try {
      const shift = await this.getActiveShift(userId);
      if (!shift) {
        throw new Error('No active shift found');
      }
      
      // Si está en break o rondín, terminarlo automáticamente
      if (shift.status === 'on_break') {
        shift.endBreak();
      } else if (shift.status === 'on_patrol') {
        shift.endPatrol();
      }
      
      shift.endTime = new Date();
      shift.status = 'completed';
      shift.totalWorkedMinutes = shift.calculateWorkedTime();
      
      return await shift.save();
    } catch (error) {
      throw new Error(`Error ending shift: ${error.message}`);
    }
  }
  
  // Obtener horarios por fraccionamiento (para admin/supervisores)
  static async getShiftsByService(serviceId, startDate, endDate) {
    try {
      const query = {
        serviceId
      };
      
      if (startDate && endDate) {
        query.shiftDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      return await Shift.find(query)
        .populate('userId', 'username email')
        .populate('serviceId', 'serviceName serviceCode')
        .sort({ shiftDate: -1, scheduledStartTime: 1 });
    } catch (error) {
      throw new Error(`Error getting shifts by service: ${error.message}`);
    }
  }
  
  // Obtener estadísticas de turnos
  static async getShiftStats(serviceId, startDate, endDate) {
    try {
      const matchQuery = { serviceId };
      
      if (startDate && endDate) {
        matchQuery.shiftDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      const stats = await Shift.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalWorkedMinutes: { $sum: '$totalWorkedMinutes' },
            totalBreakMinutes: { $sum: '$totalBreakMinutes' },
            totalPatrolMinutes: { $sum: '$totalPatrolMinutes' }
          }
        }
      ]);
      
      return stats;
    } catch (error) {
      throw new Error(`Error getting shift stats: ${error.message}`);
    }
  }
}

export default ShiftService;