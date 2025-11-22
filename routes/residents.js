import express from 'express';
import auth from '../middleware/auth.js';

const router = express.Router();

// Mock data for residents
let residents = [
  {
    _id: '1',
    name: 'Ana García',
    email: 'ana.garcia@email.com',
    phone: '555-0123',
    address: 'Calle 123 #45-67',
    serviceId: 'ALBA',
    status: 'active'
  },
  {
    _id: '2',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@email.com',
    phone: '555-0456',
    address: 'Carrera 89 #12-34',
    serviceId: 'PRIVANZA',
    status: 'active'
  }
];

// Get all residents
router.get('/', auth, async (req, res) => {
  try {
    res.json(residents);
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Get resident by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const resident = residents.find(r => r._id === req.params.id);
    if (!resident) {
      return res.status(404).json({ message: 'Residente no encontrado' });
    }
    res.json(resident);
  } catch (error) {
    console.error('Error fetching resident:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;