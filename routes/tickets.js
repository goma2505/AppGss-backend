import express from 'express';
import Ticket from '../models/Ticket.js';
import { auth, adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all tickets
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const isAdmin = req.user.role === 'admin' || req.user.role === 'administrador';

    // Filtrar por fraccionamiento/subdivisión
    if (isAdmin) {
      if (req.query.serviceCode) {
        query.serviceCode = req.query.serviceCode;
      }
    } else {
      if (req.user.role === 'guardia' && Array.isArray(req.user.allowedServices) && req.user.allowedServices.length > 0) {
        query.serviceCode = { $in: req.user.allowedServices };
      } else if (req.user.serviceCode) {
        query.serviceCode = req.user.serviceCode;
      }
      // Usuarios no admin (excepto guardia) solo ven sus propios tickets
      if (req.user.role !== 'guardia') {
        query.userId = req.user.id;
      }
    }

    const tickets = await Ticket.find(query)
      .populate('userId', 'name username email')
      .populate('assignedTo', 'name username')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Get user's tickets
router.get('/my-tickets', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id })
      .populate('assignedTo', 'name username')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Create ticket
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, priority = 'medium', serviceCode: bodyServiceCode } = req.body;

    const isAdmin = req.user.role === 'admin' || req.user.role === 'administrador';
    const serviceCode = isAdmin ? bodyServiceCode : req.user.serviceCode;

    if (!isAdmin && !serviceCode) {
      return res.status(400).json({ msg: 'Tu usuario no tiene fraccionamiento asignado (serviceCode) para crear el ticket.' });
    }

    const ticket = new Ticket({
      userId: req.user.id,
      title,
      description,
      category,
      priority,
      status: 'open',
      serviceCode
    });

    await ticket.save();
    await ticket.populate('userId', 'name username email');

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Update ticket
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, assignedTo, response, priority } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'administrador';
    if (!isAdmin) {
      const isOwner = ticket.userId.toString() === req.user.id;
      const guardHasAccess = req.user.role === 'guardia' && Array.isArray(req.user.allowedServices) && req.user.allowedServices.includes(ticket.serviceCode);

      if (!isOwner && !guardHasAccess) {
        return res.status(403).json({ msg: 'No autorizado' });
      }
    }

    // Update fields
    if (status) ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (response) ticket.response = response;
    if (priority) ticket.priority = priority;

    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();
    await ticket.populate(['userId', 'assignedTo']);

    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Delete ticket (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }

    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Ticket eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Get ticket statistics (admin only)
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const match = {};
    if (req.query.serviceCode) {
      match.serviceCode = req.query.serviceCode;
    }

    const stats = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Ticket.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      categoryStats: categoryStats
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

export default router;