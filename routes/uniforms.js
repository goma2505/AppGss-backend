import express from 'express';
import mongoose from 'mongoose';
import UniformRequest from '../models/UniformRequest.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();
const inMemoryUniformRequests = [];

const normalizeStatus = (s) => {
  const map = {
    pendiente: 'pending',
    aprobado: 'approved',
    entregado: 'delivered',
    rechazado: 'rejected',
    cancelado: 'cancelled'
  };
  const k = String(s || '').toLowerCase();
  return map[k] || s;
};

// Obtener todas las solicitudes de uniformes (solo admin/supervisor)
router.get('/requests', auth, adminAuth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const requests = inMemoryUniformRequests
        .slice()
        .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
      return res.json(requests);
    }

    const requests = await UniformRequest.find()
      .populate('userId', 'name email')
      .populate('serviceId', 'name location')
      .populate('processedBy', 'name')
      .sort({ requestDate: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching uniform requests:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener solicitudes de uniformes del usuario actual
router.get('/my-requests', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const requests = inMemoryUniformRequests
        .filter(r => String(r.userId) === String(req.user.id))
        .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
      return res.json(requests);
    }
    const requests = await UniformRequest.find({ userId: req.user.id })
      .populate('serviceId', 'name location')
      .sort({ requestDate: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching user uniform requests:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nueva solicitud de uniforme personal
router.post('/request/personal', auth, async (req, res) => {
  try {
    const { personalItems, notes } = req.body;
    
    // Validar que al menos un item esté solicitado
    const hasItems = Object.values(personalItems).some(item => item.requested);
    if (!hasItems) {
      return res.status(400).json({ message: 'Debe solicitar al menos un artículo' });
    }

    if (mongoose.connection.readyState !== 1) {
      const request = {
        _id: String(Date.now()),
        userId: req.user.id,
        guardName: req.user.name || 'Guardia',
        requestType: 'personal',
        personalItems,
        notes,
        status: 'pending',
        requestDate: new Date()
      };
      inMemoryUniformRequests.push(request);
      return res.status(201).json({ message: 'Solicitud de uniforme creada exitosamente', request });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const uniformRequest = new UniformRequest({
      userId: req.user.id,
      guardName: user.name,
      requestType: 'personal',
      personalItems,
      notes
    });

    await uniformRequest.save();
    res.status(201).json({ message: 'Solicitud de uniforme creada exitosamente', request: uniformRequest });
  } catch (error) {
    console.error('Error creating personal uniform request:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nueva solicitud de equipo por servicio
router.post('/request/service-equipment', auth, async (req, res) => {
  try {
    const { serviceId, serviceName, serviceEquipment, notes } = req.body;
    
    // Validar que al menos un equipo esté solicitado
    const hasEquipment = Object.values(serviceEquipment).some(item => item.requested);
    if (!hasEquipment) {
      return res.status(400).json({ message: 'Debe solicitar al menos un equipo' });
    }

    if (mongoose.connection.readyState !== 1) {
      const request = {
        _id: String(Date.now()),
        userId: req.user.id,
        guardName: req.user.name || 'Guardia',
        requestType: 'service_equipment',
        serviceId,
        serviceName: serviceName || 'Servicio',
        serviceEquipment,
        notes,
        status: 'pending',
        requestDate: new Date()
      };
      inMemoryUniformRequests.push(request);
      return res.status(201).json({ message: 'Solicitud de equipo creada exitosamente', request });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const uniformRequest = new UniformRequest({
      userId: req.user.id,
      guardName: user.name,
      requestType: 'service_equipment',
      serviceId,
      serviceName,
      serviceEquipment,
      notes
    });

    await uniformRequest.save();
    res.status(201).json({ message: 'Solicitud de equipo creada exitosamente', request: uniformRequest });
  } catch (error) {
    console.error('Error creating service equipment request:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar estado de solicitud (solo admin/supervisor)
router.put('/requests/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    if (!['pending', 'approved', 'delivered', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const request = await UniformRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    request.status = status;
    request.adminNotes = adminNotes;
    request.processedDate = new Date();
    request.processedBy = req.user.id;

    await request.save();
    res.json({ message: 'Estado de solicitud actualizado', request });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar solicitud (solo admin/supervisor)
router.delete('/requests/:id', auth, adminAuth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const idx = inMemoryUniformRequests.findIndex(r => String(r._id) === String(req.params.id));
      if (idx === -1) {
        return res.status(404).json({ message: 'Solicitud no encontrada' });
      }
      inMemoryUniformRequests.splice(idx, 1);
      return res.json({ message: 'Solicitud eliminada exitosamente' });
    }

    const request = await UniformRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    await UniformRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Solicitud eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting uniform request:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Cancelar solicitud (guardia puede cancelar su propia solicitud si está pendiente)
router.put('/requests/:id/cancel', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const idx = inMemoryUniformRequests.findIndex(r => String(r._id) === String(req.params.id));
      if (idx === -1) {
        return res.status(404).json({ message: 'Solicitud no encontrada' });
      }
      const request = inMemoryUniformRequests[idx];
      if (String(request.userId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'No autorizado para cancelar esta solicitud' });
      }
      inMemoryUniformRequests.splice(idx, 1);
      return res.json({ message: 'Solicitud cancelada y eliminada' });
    }

    const request = await UniformRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    if (String(request.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'No autorizado para cancelar esta solicitud' });
    }
    const current = normalizeStatus(request.status);
    if (!['pending', 'approved'].includes(current)) {
      return res.status(400).json({ message: 'La solicitud no puede cancelarse en este estado' });
    }
    await UniformRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Solicitud cancelada y eliminada' });
  } catch (error) {
    console.error('Error cancelling uniform request:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;