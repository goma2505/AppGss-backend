import express from 'express';
import PayrollAdvance from '../models/PayrollAdvance.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

const normalizeStatus = (s) => {
  const map = {
    pendiente: 'pending',
    aprobado: 'approved',
    rechazado: 'rejected',
    pagado: 'paid',
    cancelado: 'cancelled'
  };
  const k = String(s || '').toLowerCase();
  return map[k] || s;
};

// Obtener todas las solicitudes de adelanto (solo admin)
router.get('/requests', auth, adminAuth, async (req, res) => {
  try {
    const requests = await PayrollAdvance.find()
      .populate('userId', 'name email')
      .populate('processedBy', 'name')
      .sort({ requestDate: -1 });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching payroll advance requests:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener solicitudes de adelanto del usuario actual
router.get('/my-requests', auth, async (req, res) => {
  try {
    const requests = await PayrollAdvance.find({ userId: req.user.id })
      .sort({ requestDate: -1 });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching user payroll advance requests:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nueva solicitud de adelanto
router.post('/request', auth, async (req, res) => {
  try {
    const { amount, reason, payrollPeriod } = req.body;
    
    // Validaciones
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar una razón para el adelanto' });
    }

    if (!payrollPeriod || !payrollPeriod.month || !payrollPeriod.year || !payrollPeriod.period) {
      return res.status(400).json({ message: 'Debe especificar el período de quincena' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si ya existe una solicitud para este período
    const existingRequest = await PayrollAdvance.findOne({
      userId: req.user.id,
      'payrollPeriod.year': payrollPeriod.year,
      'payrollPeriod.month': payrollPeriod.month,
      'payrollPeriod.period': payrollPeriod.period,
      status: { $in: ['pending', 'approved', 'paid'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'Ya existe una solicitud de adelanto para este período de quincena' 
      });
    }

    const payrollAdvance = new PayrollAdvance({
      userId: req.user.id,
      guardName: user.name,
      amount,
      reason: reason.trim(),
      payrollPeriod
    });

    await payrollAdvance.save();
    res.status(201).json({ 
      message: 'Solicitud de adelanto creada exitosamente', 
      request: payrollAdvance 
    });
  } catch (error) {
    console.error('Error creating payroll advance request:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Ya existe una solicitud de adelanto para este período de quincena' 
      });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar estado de solicitud de adelanto (solo admin)
router.put('/requests/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status, adminNotes, paymentMethod } = req.body;
    
    if (!['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    if (status === 'paid' && !paymentMethod) {
      return res.status(400).json({ message: 'Debe especificar el método de pago' });
    }

    const request = await PayrollAdvance.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    request.status = status;
    request.adminNotes = adminNotes;
    request.processedDate = new Date();
    request.processedBy = req.user.id;
    
    if (status === 'paid') {
      request.paymentDate = new Date();
      request.paymentMethod = paymentMethod;
    }

    await request.save();
    res.json({ message: 'Estado de solicitud actualizado', request });
  } catch (error) {
    console.error('Error updating payroll advance status:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar solicitud de adelanto (solo admin)
router.delete('/requests/:id', auth, adminAuth, async (req, res) => {
  try {
    const request = await PayrollAdvance.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    await PayrollAdvance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Solicitud eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting payroll advance request:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Cancelar solicitud de adelanto (guardia puede cancelar propia si está pendiente)
router.put('/requests/:id/cancel', auth, async (req, res) => {
  try {
    const request = await PayrollAdvance.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    if (String(request.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'No autorizado para cancelar esta solicitud' });
    }
    const current = normalizeStatus(request.status);
    if (!['pending'].includes(current)) {
      return res.status(400).json({ message: 'La solicitud no puede cancelarse en este estado' });
    }
    request.status = 'cancelled';
    request.processedDate = new Date();
    request.processedBy = req.user.id;
    await request.save();
    res.json({ message: 'Solicitud de adelanto cancelada', request });
  } catch (error) {
    console.error('Error cancelling payroll advance:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de adelantos (solo admin)
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const stats = await PayrollAdvance.aggregate([
      {
        $match: {
          'payrollPeriod.year': currentYear,
          'payrollPeriod.month': currentMonth
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching payroll advance stats:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;