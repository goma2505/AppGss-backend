import express from 'express';
import PanicAlert from '../models/PanicAlert.js';
import { pushNotification } from './panicNotifications.js';
import { auth, adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all panic alerts (admin only)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const alerts = await PanicAlert.find()
      .populate('userId', 'name username email')
      .populate('responderId', 'name username')
      .sort({ createdAt: -1 });
    
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching panic alerts:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Get user's panic alerts
router.get('/my-alerts', auth, async (req, res) => {
  try {
    const alerts = await PanicAlert.find({ userId: req.user.id })
      .populate('responderId', 'name username')
      .sort({ createdAt: -1 });
    
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching user panic alerts:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Create panic alert
const lastAlertByUser = new Map();

router.post('/', auth, async (req, res) => {
  try {
    const { location, description, severity = 'high', notes } = req.body;
    const now = Date.now();
    const last = lastAlertByUser.get(req.user.id) || 0;
    if (now - last < 60000) {
      const failed = new PanicAlert({ userId: req.user.id, description: 'Intento bloqueado por límite de frecuencia', severity, status: 'false_alarm', timestamp: new Date(), notes });
      await failed.save();
      return res.status(429).json({ msg: 'Demasiadas alertas en poco tiempo' });
    }
    
    const alert = new PanicAlert({
      userId: req.user.id,
      location,
      description: description || 'Alerta de pánico activada',
      severity,
      status: 'active',
      timestamp: new Date(),
      notes
    });
    
    await alert.save();
    await alert.populate('userId', 'name username email');
    pushNotification({ id: alert._id, timestamp: alert.timestamp, user: alert.userId, status: alert.status, description: alert.description })
    lastAlertByUser.set(req.user.id, now);
    
    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating panic alert:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Update panic alert status
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, response, responderId } = req.body;
    
    const alert = await PanicAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ msg: 'Alerta no encontrada' });
    }
    
    // Update fields
    if (status) alert.status = status;
    if (response) alert.response = response;
    if (responderId) alert.responderId = responderId;
    if (status === 'responded' || status === 'resolved') {
      alert.responseTime = new Date();
    }
    
    await alert.save();
    await alert.populate(['userId', 'responderId']);
    
    res.json(alert);
  } catch (error) {
    console.error('Error updating panic alert:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Delete panic alert (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const alert = await PanicAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ msg: 'Alerta no encontrada' });
    }
    
    await PanicAlert.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Alerta eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting panic alert:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

export default router;