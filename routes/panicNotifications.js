import express from 'express';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Mock data para alertas de pánico
let panicAlerts = [
  {
    _id: '1',
    resident: {
      _id: 'res1',
      name: 'Ana García',
      address: 'Calle 123 #45-67',
      phone: '555-0123'
    },
    service: {
      _id: 'alba',
      name: 'Alba'
    },
    location: {
      latitude: 10.4236,
      longitude: -75.5378
    },
    timestamp: new Date('2024-01-15T14:30:00Z'),
    status: 'active',
    priority: 'high',
    description: 'Emergencia médica reportada',
    respondedBy: null,
    responseTime: null
  },
  {
    _id: '2',
    resident: {
      _id: 'res2',
      name: 'Carlos Mendoza',
      address: 'Carrera 89 #12-34',
      phone: '555-0456'
    },
    service: {
      _id: 'privanza',
      name: 'Privanza'
    },
    location: {
      latitude: 10.4156,
      longitude: -75.5298
    },
    timestamp: new Date('2024-01-15T16:45:00Z'),
    status: 'resolved',
    priority: 'medium',
    description: 'Intrusión reportada',
    respondedBy: {
      _id: 'guard1',
      name: 'Juan Pérez'
    },
    responseTime: new Date('2024-01-15T16:52:00Z')
  }
];

// Obtener notificaciones de pánico (por defecto solo activas)
router.get('/', auth, async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    
    let filteredAlerts = panicAlerts.filter(alert => alert.status === status);
    
    // Ordenar por timestamp descendente (más recientes primero)
    filteredAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(filteredAlerts);
  } catch (error) {
    console.error('Error fetching panic notifications:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener alertas activas
router.get('/active', auth, async (req, res) => {
  try {
    const activeAlerts = panicAlerts.filter(alert => alert.status === 'active');
    
    res.json(activeAlerts);
  } catch (error) {
    console.error('Error fetching active panic alerts:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nueva alerta de pánico
router.post('/', auth, async (req, res) => {
  try {
    const { residentId, serviceId, location, description, priority = 'high' } = req.body;
    
    if (!residentId || !serviceId || !location) {
      return res.status(400).json({ 
        message: 'residentId, serviceId y location son requeridos' 
      });
    }
    
    const newAlert = {
      _id: Date.now().toString(),
      resident: {
        _id: residentId,
        name: 'Residente',
        address: 'Dirección no especificada',
        phone: 'No disponible'
      },
      service: {
        _id: serviceId,
        name: 'Servicio'
      },
      location,
      timestamp: new Date(),
      status: 'active',
      priority,
      description: description || 'Alerta de pánico activada',
      respondedBy: null,
      responseTime: null
    };
    
    panicAlerts.push(newAlert);
    
    res.status(201).json({
      message: 'Alerta de pánico creada exitosamente',
      alert: newAlert
    });
  } catch (error) {
    console.error('Error creating panic alert:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Responder a una alerta de pánico
router.put('/:id/respond', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'in_progress', notes } = req.body;
    
    const alertIndex = panicAlerts.findIndex(alert => alert._id === id);
    
    if (alertIndex === -1) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }
    
    const alert = panicAlerts[alertIndex];
    
    alert.status = status;
    alert.respondedBy = {
      _id: req.user.id,
      name: req.user.name || 'Guardia'
    };
    alert.responseTime = new Date();
    
    if (notes) {
      alert.notes = notes;
    }
    
    panicAlerts[alertIndex] = alert;
    
    res.json({
      message: 'Respuesta registrada exitosamente',
      alert
    });
  } catch (error) {
    console.error('Error responding to panic alert:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Resolver una alerta de pánico
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    
    const alertIndex = panicAlerts.findIndex(alert => alert._id === id);
    
    if (alertIndex === -1) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }
    
    const alert = panicAlerts[alertIndex];
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolution = resolution || 'Alerta resuelta';
    
    if (!alert.respondedBy) {
      alert.respondedBy = {
        _id: req.user.id,
        name: req.user.name || 'Guardia'
      };
      alert.responseTime = new Date();
    }
    
    panicAlerts[alertIndex] = alert;
    
    res.json({
      message: 'Alerta resuelta exitosamente',
      alert
    });
  } catch (error) {
    console.error('Error resolving panic alert:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Marcar notificación como leída
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const alertIndex = panicAlerts.findIndex(alert => alert._id === id);
    
    if (alertIndex === -1) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }
    
    // Marcar como leída (en este caso, la removemos de la lista)
    panicAlerts.splice(alertIndex, 1);
    
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar alerta (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const alertIndex = panicAlerts.findIndex(alert => alert._id === id);
    
    if (alertIndex === -1) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }
    
    panicAlerts.splice(alertIndex, 1);
    
    res.json({ message: 'Alerta eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting panic alert:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
export const pushNotification = (payload) => {
  try {
    const alert = {
      _id: String(Date.now()),
      resident: { _id: payload.user?.id || 'unknown', name: payload.user?.name || payload.user?.username || 'Usuario' },
      service: { _id: 'general', name: 'General' },
      location: {},
      timestamp: new Date(),
      status: 'active',
      priority: 'high',
      description: payload.description || 'Alerta de pánico activada',
      respondedBy: null,
      responseTime: null
    };
    panicAlerts.unshift(alert);
  } catch (_) {}
};