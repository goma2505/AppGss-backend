import express from 'express';
import Package from '../models/Package.js';
import { auth, adminAuth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all packages (admin/guard view)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const userRole = req.user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'administrador' || userRole === 'manager' || userRole === 'supervisor';

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (!isAdmin) {
      if (userRole === 'guardia') {
        if (Array.isArray(req.user.allowedServices) && req.user.allowedServices.length > 0) {
          query.serviceCode = { $in: req.user.allowedServices.map(s => String(s).toUpperCase()) };
        } else if (req.user.serviceCode) {
          query.serviceCode = String(req.user.serviceCode).toUpperCase();
        }
      } else if (req.user.serviceCode) {
        query.serviceCode = String(req.user.serviceCode).toUpperCase();
      }
    } else if (req.query.serviceCode) {
      query.serviceCode = String(req.query.serviceCode).toUpperCase();
    }

    const packages = await Package.find(query)
      .populate('recipientId', 'name username email')
      .populate('receivedBy', 'name username')
      .populate('deliveredBy', 'name username')
      .sort({ createdAt: -1 });
    
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Get user's packages
router.get('/my-packages', auth, async (req, res) => {
  try {
    const packages = await Package.find({ recipientId: req.user.id })
      .populate('receivedBy', 'name username')
      .populate('deliveredBy', 'name username')
      .sort({ createdAt: -1 });
    
    res.json(packages);
  } catch (error) {
    console.error('Error fetching user packages:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Register new package arrival
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, senderName, description, trackingNumber, size, serviceId, recipientAddress, recipientPhone } = req.body;
    
    const packageData = new Package({
      recipientId,
      senderName,
      description,
      trackingNumber,
      size,
      status: 'received',
      receivedBy: req.user.id,
      receivedAt: new Date(),
      serviceCode: (serviceId || req.user.serviceCode || '').toString().toUpperCase(),
      notes: req.body.notes || '',
      location: {
        apartment: recipientAddress || '',
      }
    });
    
    await packageData.save();
    await packageData.populate(['recipientId', 'receivedBy']);
    
    res.status(201).json(packageData);
  } catch (error) {
    console.error('Error registering package:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Deliver package to resident
router.put('/:id/deliver', auth, async (req, res) => {
  try {
    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      return res.status(404).json({ msg: 'Paquete no encontrado' });
    }
    
    if (packageData.status !== 'received') {
      return res.status(400).json({ msg: 'El paquete ya fue entregado o no está disponible' });
    }
    
    packageData.status = 'delivered';
    packageData.deliveredBy = req.user.id;
    packageData.deliveredAt = new Date();
    
    await packageData.save();
    await packageData.populate(['recipientId', 'receivedBy', 'deliveredBy']);
    
    res.json(packageData);
  } catch (error) {
    console.error('Error delivering package:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Notify resident about package
router.post('/:id/notify', auth, async (req, res) => {
  try {
    const packageData = await Package.findById(req.params.id)
      .populate('recipientId', 'name email phone');
    
    if (!packageData) {
      return res.status(404).json({ msg: 'Paquete no encontrado' });
    }
    
    // Here you would typically send a notification (email, SMS, push notification)
    // For now, we'll just update the notification status
    packageData.notificationSent = true;
    packageData.notificationSentAt = new Date();
    
    await packageData.save();
    
    res.json({ msg: 'Notificación enviada exitosamente', package: packageData });
  } catch (error) {
    console.error('Error sending package notification:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Update package status
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      return res.status(404).json({ msg: 'Paquete no encontrado' });
    }
    
    if (status) packageData.status = status;
    if (notes) packageData.notes = notes;
    
    await packageData.save();
    await packageData.populate(['recipientId', 'receivedBy', 'deliveredBy']);
    
    res.json(packageData);
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Delete package (admin or supervisor)
router.delete('/:id', auth, authorize('admin', 'administrador', 'supervisor'), async (req, res) => {
  try {
    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      return res.status(404).json({ msg: 'Paquete no encontrado' });
    }
    
    await Package.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Paquete eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Get package statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Package.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const monthlyStats = await Package.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json({
      statusStats: stats,
      monthlyStats: monthlyStats
    });
  } catch (error) {
    console.error('Error fetching package stats:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

export default router;