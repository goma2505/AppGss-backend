import express from 'express';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import UniformRequest from '../models/UniformRequest.js';
import PayrollAdvance from '../models/PayrollAdvance.js';

const router = express.Router();

// Utilidades para generar username
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const connectors = new Set(['de','del','la','las','los','y']);
const buildUsername = (fullName) => {
  const parts = normalize(fullName).split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  let idx = parts.length - 1; while (idx >= 0 && connectors.has(parts[idx])) idx--;
  const ap2 = parts[idx] || '';
  let j = idx - 1; while (j > 0 && connectors.has(parts[j])) j--;
  const ap1 = parts[j] || parts[1] || '';
  return `${first}.${ap1}.${ap2.slice(0,1)}`;
};

// Obtener todos los guardias (admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { serviceCode, active } = req.query;
    const query = { role: 'guardia' };
    if (serviceCode) query.serviceCodes = serviceCode.toUpperCase();
    if (active !== undefined) query.isActive = active === 'true';
    const list = await User.find(query).select('-password');
    res.json({ success: true, guards: list, total: list.length });
  } catch (error) {
    console.error('Error fetching guards:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Obtener guardias por fraccionamiento
router.get('/subdivision/:subdivisionId', auth, async (req, res) => {
  try {
    const { subdivisionId } = req.params;
    
    const subdivisionGuards = guards.filter(guard => 
      guard.subdivision === subdivisionId && guard.isActive
    );
    
    res.json({
      success: true,
      guards: subdivisionGuards,
      total: subdivisionGuards.length
    });
  } catch (error) {
    console.error('Error fetching subdivision guards:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Crear nuevo guardia con cuenta automática (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name) return res.status(400).json({ success:false, message:'Nombre es requerido' });
    const username = buildUsername(name);
    const exists = await User.findOne({ $or: [{username},{email}] });
    if (exists) return res.status(400).json({ success:false, message:'Usuario ya existe' });
    const userAccount = new User({
      name,
      username,
      email,
      password: password || 'Prueba1234',
      role: 'guardia',
      serviceCodes: []
    });
    await userAccount.save();
    res.status(201).json({ success:true, guard: userAccount.toPublicJSON() });
  } catch (error) {
    console.error('Error creating guard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Actualizar guardia (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive, experience, certifications } = req.body;
    const user = await User.findById(id);
    if (!user || user.role !== 'guardia') return res.status(404).json({ success:false, message:'Guardia no encontrado' });
    if (email && email !== user.email) {
      const dup = await User.findOne({ email });
      if (dup) return res.status(400).json({ success:false, message:'Ya existe un usuario con este email' });
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (isActive !== undefined) user.isActive = !!isActive;
    if (typeof experience !== 'undefined') user.experience = String(experience);
    if (Array.isArray(certifications)) user.certifications = certifications.map(String);
    await user.save();
    res.json({ success:true, guard: user.toPublicJSON() });
  } catch (error) {
    console.error('Error updating guard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Eliminar guardia (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.role !== 'guardia') return res.status(404).json({ success:false, message:'Guardia no encontrado' });
    await user.deleteOne();
    res.json({ success:true });
  } catch (error) {
    console.error('Error deleting guard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Obtener servicios disponibles para guardias
router.get('/services', auth, async (req, res) => {
  try {
    const Service = (await import('../models/Service.js')).default;
    const services = await Service.find({ isActive: true }).select('serviceId serviceCode name displayName');
    res.json({ success:true, services });
  } catch (error) {
    console.error('Error fetching guard services:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Asignar servicio a guardia (admin)
router.post('/:guardId/services', adminAuth, async (req, res) => {
  try {
    const { guardId } = req.params;
    const { serviceCode } = req.body;
    const user = await User.findById(guardId);
    if (!user || user.role !== 'guardia') return res.status(404).json({ success:false, message:'Guardia no encontrado' });
    const code = (serviceCode||'').toUpperCase();
    if (!user.serviceCodes) user.serviceCodes = [];
    if (user.serviceCodes.includes(code)) return res.status(400).json({ success:false, message:'Servicio ya asignado' });
    user.serviceCodes.push(code);
    await user.save();
    res.json({ success:true, guard: user.toPublicJSON() });
  } catch (error) {
    console.error('Error assigning service to guard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Remover servicio de guardia (admin)
router.delete('/:guardId/services/:serviceCode', adminAuth, async (req, res) => {
  try {
    const { guardId, serviceCode } = req.params;
    const user = await User.findById(guardId);
    if (!user || user.role !== 'guardia') return res.status(404).json({ success:false, message:'Guardia no encontrado' });
    const code = (serviceCode||'').toUpperCase();
    if (!user.serviceCodes || !user.serviceCodes.includes(code)) return res.status(404).json({ success:false, message:'Servicio no asignado' });
    user.serviceCodes = user.serviceCodes.filter(s => s !== code);
    await user.save();
    res.json({ success:true, guard: user.toPublicJSON() });
  } catch (error) {
    console.error('Error removing service from guard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Obtener estadísticas de guardias (admin)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalGuards = await User.countDocuments({ role:'guardia' });
    const activeGuards = await User.countDocuments({ role:'guardia', isActive:true });
    const inactiveGuards = totalGuards - activeGuards;
    res.json({ success:true, stats: { total: totalGuards, active: activeGuards, inactive: inactiveGuards } });
  } catch (error) {
    console.error('Error fetching guard stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Información general para gestión de guardias (uniformes y adelantos)
router.get('/overview', adminAuth, async (req, res) => {
  try {
    const uniformsTotal = await UniformRequest.countDocuments({});
    const advancesTotal = await PayrollAdvance.countDocuments({});
    res.json({ success:true, uniforms:{ total: uniformsTotal }, advances:{ total: advancesTotal } });
  } catch (error) {
    res.status(500).json({ success:false, message:'Error obteniendo información general' });
  }
});

export default router;