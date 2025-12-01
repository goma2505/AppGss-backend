import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Service from '../models/Service.js';
import { auth, adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Get users by role
router.get('/', auth, async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    
    if (role) {
      query.role = role === 'guard' ? 'guardia' : role;
    }
    
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    
    await user.save();
    
    res.json({ msg: 'Perfil actualizado exitosamente', user: user.toObject({ transform: (doc, ret) => { delete ret.password; return ret; } }) });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Get available services for user
router.get('/available-services', auth, async (req, res) => {
  try {
    // This would typically filter services based on user's role and permissions
    const services = await Service.find({ isActive: true });
    res.json(services);
  } catch (error) {
    console.error('Error fetching available services:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Cambio de contraseña con políticas de seguridad
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Datos incompletos' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ msg: 'Contraseña actual incorrecta' });
    // Políticas: mínimo 8, mayúscula, minúscula, número
    const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!policy.test(newPassword)) {
      return res.status(400).json({ msg: 'La contraseña debe tener mínimo 8 caracteres, incluir mayúsculas, minúsculas y números' });
    }
    // Evitar reutilizar la misma contraseña
    if (currentPassword === newPassword) {
      return res.status(400).json({ msg: 'La nueva contraseña no puede ser igual a la actual' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ msg: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

router.delete('/delete-account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });
    if (['admin', 'administrador', 'superadmin'].includes(String(user.role || '').toLowerCase())) {
      return res.status(403).json({ msg: 'No autorizado para eliminar esta cuenta' });
    }
    await User.deleteOne({ _id: user._id });
    res.json({ msg: 'Cuenta eliminada exitosamente', userId: String(user._id) });
  } catch (error) {
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

router.get('/delete-account', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ msg: 'Token requerido' });
    const secret = process.env.JWT_SECRET || 'gss_production_secret_2024_change_this';
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.user?.id || payload.userId || payload.id || payload._id);
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });
    if (['admin', 'administrador', 'superadmin'].includes(String(user.role || '').toLowerCase())) {
      return res.status(403).json({ msg: 'No autorizado para eliminar esta cuenta' });
    }
    await User.deleteOne({ _id: user._id });
    res.json({ msg: 'Cuenta eliminada exitosamente', userId: String(user._id) });
  } catch (error) {
    res.status(400).json({ msg: 'Token inválido o expirado' });
  }
});

export default router;
