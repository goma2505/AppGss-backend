import express from 'express';
import auth from '../middleware/auth.js';
import Attendance from '../models/Attendance.js';
import mongoose from 'mongoose';

const router = express.Router();

// Crear nueva asistencia
router.post('/', auth, async (req, res) => {
  try {
    const { status, notes, checkInTime, checkOutTime, serviceCode, fraccionamiento, guardId, date, biometricVerified } = req.body;
    const effectiveStatus = status || 'presente';
    const userId = guardId || req.user.id;

    // Validar guardId
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(400).json({ message: 'Usuario inválido para registrar asistencia' });
    }

    const todayStr = (date && typeof date === 'string') ? date : new Date().toISOString().split('T')[0];
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    const parseTime = (t) => {
      if (!t) return null;
      try {
        if (typeof t === 'string' && t.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
          const [hh, mm, ss] = t.split(':');
          const d = new Date(dayStart);
          d.setUTCHours(parseInt(hh, 10), parseInt(mm, 10), ss ? parseInt(ss, 10) : 0, 0);
          return d;
        }
        return new Date(t);
      } catch (_) {
        return null;
      }
    };

    const inTime = parseTime(checkInTime);
    const outTime = parseTime(checkOutTime);
    const svcCode = String(serviceCode || fraccionamiento || req.user.serviceCode || '').toUpperCase() || undefined;

    if (outTime) {
      // Registrar salida: actualizar la asistencia del día con checkOutTime vacío
      const openAttendance = await Attendance.findOne({
        guard: userId,
        checkInTime: { $gte: dayStart, $lte: dayEnd },
        checkOutTime: null
      }).sort({ checkInTime: -1 });

      if (openAttendance) {
        openAttendance.checkOutTime = outTime;
        openAttendance.status = effectiveStatus;
        openAttendance.notes = notes || openAttendance.notes;
        if (svcCode) openAttendance.serviceCode = svcCode;
        await openAttendance.save();
        return res.status(200).json(openAttendance);
      }
      // Si no hay entrada previa, crear registro con solo salida
      const attendance = new Attendance({
        guard: userId,
        status: effectiveStatus,
        notes: notes || '',
        checkOutTime: outTime,
        serviceCode: svcCode,
        biometricVerified: !!biometricVerified
      });
      await attendance.save();
      return res.status(201).json(attendance);
    }

    // Registrar entrada
    const attendance = new Attendance({
      guard: userId,
      status: effectiveStatus,
      notes: notes || '',
      checkInTime: inTime || new Date(),
      checkOutTime: null,
      serviceCode: svcCode,
      biometricVerified: !!biometricVerified
    });
    await attendance.save();
    return res.status(201).json(attendance);
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar asistencia
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Asistencia no encontrada' });
    }
    
    // Verificar que el usuario puede actualizar esta asistencia
    if (attendance.guard.toString() !== req.user.id && !['admin', 'administrador', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado para actualizar esta asistencia' });
    }
    
    if (status) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;
    attendance.updatedAt = new Date();
    
    await attendance.save();
    
    res.json({
      message: 'Asistencia actualizada exitosamente',
      attendance
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener asistencias por guardia
router.get('/guard/:guardId', auth, async (req, res) => {
  try {
    const { guardId } = req.params;
    
    // Verificar que el usuario puede ver estas asistencias
    if (guardId !== req.user.id && !['admin', 'administrador', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado para ver estas asistencias' });
    }
    
    const attendances = await Attendance.find({ guard: guardId })
      .populate('schedule')
      .sort({ timestamp: -1 });
    
    res.json(attendances);
  } catch (error) {
    console.error('Error fetching attendances:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener asistencia del día por guardia
router.get('/:guardId/:date', auth, async (req, res) => {
  try {
    const { guardId, date } = req.params;
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const attendance = await Attendance.findOne({
      guard: guardId,
      checkInTime: { $gte: dayStart, $lte: dayEnd }
    });
    res.json(attendance || null);
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener todas las asistencias (admin/supervisor)
router.get('/', auth, async (req, res) => {
  try {
    if (!['admin', 'administrador', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    const attendances = await Attendance.find()
      .populate('guard', 'name email')
      .populate('schedule')
      .sort({ timestamp: -1 });
    
    res.json(attendances);
  } catch (error) {
    console.error('Error fetching all attendances:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;