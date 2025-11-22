import express from 'express';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Obtener todos los horarios (admin/supervisor)
router.get('/', auth, async (req, res) => {
  try {
    // Verificar que el usuario tenga permisos de administrador
    if (!['admin', 'administrador', 'manager', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    
    // Mock data para horarios
    const schedules = [
      {
        _id: '1',
        guard: { _id: '1', name: 'Juan Pérez', email: 'juan@example.com' },
        service: { _id: 'alba', name: 'Alba' },
        shift: 'morning',
        startTime: '06:00',
        endTime: '14:00',
        dayOfWeek: 'monday',
        isActive: true
      },
      {
        _id: '2',
        guard: { _id: '2', name: 'María García', email: 'maria@example.com' },
        service: { _id: 'privanza', name: 'Privanza' },
        shift: 'afternoon',
        startTime: '14:00',
        endTime: '22:00',
        dayOfWeek: 'monday',
        isActive: true
      },
      {
        _id: '3',
        guard: { _id: '3', name: 'Carlos López', email: 'carlos@example.com' },
        service: { _id: 'cartagena', name: 'Cartagena' },
        shift: 'night',
        startTime: '22:00',
        endTime: '06:00',
        dayOfWeek: 'monday',
        isActive: true
      }
    ];
    
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener horarios de un guardia específico
router.get('/guard/:guardId', auth, async (req, res) => {
  try {
    const { guardId } = req.params;
    
    // Mock data para horarios del guardia
    const mySchedules = [
      {
        _id: '1',
        property: { _id: 'alba', name: 'Alba' },
        shift: 'morning',
        startTime: '06:00',
        endTime: '14:00',
        dayOfWeek: 'monday',
        isActive: true
      },
      {
        _id: '2',
        property: { _id: 'alba', name: 'Alba' },
        shift: 'morning',
        startTime: '06:00',
        endTime: '14:00',
        dayOfWeek: 'wednesday',
        isActive: true
      },
      {
        _id: '3',
        property: { _id: 'alba', name: 'Alba' },
        shift: 'morning',
        startTime: '06:00',
        endTime: '14:00',
        dayOfWeek: 'friday',
        isActive: true
      }
    ];
    
    res.json(mySchedules);
  } catch (error) {
    console.error('Error fetching guard schedules:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nuevo horario (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { guardId, serviceId, shift, startTime, endTime, dayOfWeek } = req.body;
    
    if (!guardId || !serviceId || !shift || !startTime || !endTime || !dayOfWeek) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos: guardId, serviceId, shift, startTime, endTime, dayOfWeek' 
      });
    }
    
    // Mock response para creación de horario
    const newSchedule = {
      _id: Date.now().toString(),
      guard: { _id: guardId, name: 'Guardia Asignado' },
      service: { _id: serviceId, name: 'Servicio Asignado' },
      shift,
      startTime,
      endTime,
      dayOfWeek,
      isActive: true
    };
    
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar horario (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { shift, startTime, endTime, dayOfWeek, isActive } = req.body;
    
    // Mock response para actualización
    const updatedSchedule = {
      _id: id,
      guard: { _id: '1', name: 'Guardia Actualizado' },
      service: { _id: 'alba', name: 'Alba' },
      shift: shift || 'morning',
      startTime: startTime || '06:00',
      endTime: endTime || '14:00',
      dayOfWeek: dayOfWeek || 'monday',
      isActive: isActive !== undefined ? isActive : true
    };
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar horario (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({ message: 'Horario eliminado exitosamente', id });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;