import express from 'express';
import ShiftService from '../services/shiftService.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Obtener servicios disponibles para el usuario
router.get('/available-services', auth, async (req, res) => {
  try {
    const services = await ShiftService.getAvailableServices(req.user.id);
    res.json({ success: true, services });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Obtener turno activo del usuario
router.get('/active', auth, async (req, res) => {
  try {
    const shift = await ShiftService.getActiveShift(req.user.id);
    res.json({ success: true, shift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Registrar entrada biométrica (simulado para desarrollo)
router.post('/biometric-entry', auth, async (req, res) => {
  try {
    const { timestamp } = req.body;
    const shift = await ShiftService.registerBiometricEntry(
      req.user.id, 
      timestamp ? new Date(timestamp) : new Date()
    );
    res.json({ success: true, shift, message: 'Biometric entry registered successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Iniciar turno en la app
router.post('/start', auth, async (req, res) => {
  try {
    const { serviceId } = req.body;
    
    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'Service ID is required' });
    }
    
    const shift = await ShiftService.startShiftInApp(req.user.id, serviceId);
    res.json({ success: true, shift, message: 'Shift started successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Iniciar break
router.post('/break/start', auth, async (req, res) => {
  try {
    const shift = await ShiftService.startBreak(req.user.id);
    res.json({ success: true, shift, message: 'Break started' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Terminar break
router.post('/break/end', auth, async (req, res) => {
  try {
    const shift = await ShiftService.endBreak(req.user.id);
    res.json({ success: true, shift, message: 'Break ended' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Iniciar rondín
router.post('/patrol/start', auth, async (req, res) => {
  try {
    const { location } = req.body;
    const shift = await ShiftService.startPatrol(req.user.id, location);
    res.json({ success: true, shift, message: 'Patrol started' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Terminar rondín
router.post('/patrol/end', auth, async (req, res) => {
  try {
    const { location } = req.body;
    const shift = await ShiftService.endPatrol(req.user.id, location);
    res.json({ success: true, shift, message: 'Patrol ended' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Terminar turno
router.post('/end', auth, async (req, res) => {
  try {
    const shift = await ShiftService.endShift(req.user.id);
    res.json({ success: true, shift, message: 'Shift ended successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Crear turno programado (solo admin)
router.post('/schedule', auth, adminAuth, async (req, res) => {
  try {
    const { userId, serviceId, scheduledStartTime, scheduledEndTime } = req.body;
    
    if (!userId || !serviceId || !scheduledStartTime || !scheduledEndTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: userId, serviceId, scheduledStartTime, scheduledEndTime' 
      });
    }
    
    const shift = await ShiftService.createScheduledShift(
      userId, 
      serviceId, 
      scheduledStartTime, 
      scheduledEndTime
    );
    
    res.json({ success: true, shift, message: 'Shift scheduled successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Obtener turnos por servicio (admin/supervisor)
router.get('/by-service/:serviceId', auth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    const shifts = await ShiftService.getShiftsByService(serviceId, startDate, endDate);
    res.json({ success: true, shifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Obtener estadísticas de turnos (admin/supervisor)
router.get('/stats/:serviceId', auth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    const stats = await ShiftService.getShiftStats(serviceId, startDate, endDate);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Obtener todos los turnos (admin)
router.get('/all', auth, async (req, res) => {
  try {
    console.log('[/api/shifts/all] request by user:', req.user && { id: req.user._id || req.user.id, role: req.user.role });
    console.log('[/api/shifts/all] headers:', { authHeader: req.header('Authorization'), xAuth: req.header('x-auth-token') });
    const { startDate, endDate, status, serviceId } = req.query;
    
    const query = {};
    
    if (startDate && endDate) {
      query.shiftDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (serviceId) {
      query.serviceId = serviceId;
    }
    
    const { default: Shift } = await import('../models/Shift.js');
    const shifts = await Shift.find(query)
      .populate('userId', 'username email')
      .populate('serviceId', 'serviceName serviceCode')
      .sort({ shiftDate: -1, scheduledStartTime: 1 });
    
    res.json({ success: true, shifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;