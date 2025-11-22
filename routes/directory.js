import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware de autenticación
const auth = (req, res, next) => {
  let token = req.header('x-auth-token');
  
  // También verificar header Authorization con Bearer token
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_jwt_secret');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Middleware de autorización para administradores
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access denied: insufficient permissions' });
    }
    
    next();
  };
};

// Datos en memoria para fallback
const inMemoryDirectory = {
  committee: [
    {
      id: 1,
      name: 'María Elena González',
      position: 'Presidenta',
      phone: '555-0101',
      email: 'presidenta@fraccionamiento.com',
      avatar: null,
      description: 'Encargada de la administración general y toma de decisiones del fraccionamiento.',
      serviceCode: 'ALBA'
    },
    {
      id: 2,
      name: 'Carlos Mendoza',
      position: 'Tesorero',
      phone: '555-0102',
      email: 'tesorero@fraccionamiento.com',
      avatar: null,
      description: 'Responsable de las finanzas y presupuesto del fraccionamiento.',
      serviceCode: 'ALBA'
    },
    {
      id: 3,
      name: 'Ana Patricia Ruiz',
      position: 'Secretaria',
      phone: '555-0103',
      email: 'secretaria@fraccionamiento.com',
      avatar: null,
      description: 'Encargada de la documentación y comunicaciones oficiales.',
      serviceCode: 'ALBA'
    }
  ],
  guards: [
    {
      id: 4,
      name: 'Roberto Silva',
      position: 'Jefe de Seguridad',
      phone: '555-0201',
      email: 'jefe.seguridad@fraccionamiento.com',
      avatar: null,
      description: 'Supervisor del equipo de seguridad y coordinador de turnos.',
      shift: 'Diurno',
      serviceCode: 'ALBA'
    },
    {
      id: 5,
      name: 'Miguel Torres',
      position: 'Guardia de Seguridad',
      phone: '555-0202',
      email: 'guardia1@fraccionamiento.com',
      avatar: null,
      description: 'Guardia de seguridad turno matutino.',
      shift: 'Matutino (6:00 AM - 2:00 PM)',
      serviceCode: 'ALBA'
    },
    {
      id: 6,
      name: 'José Ramírez',
      position: 'Guardia de Seguridad',
      phone: '555-0203',
      email: 'guardia2@fraccionamiento.com',
      avatar: null,
      description: 'Guardia de seguridad turno vespertino.',
      shift: 'Vespertino (2:00 PM - 10:00 PM)',
      serviceCode: 'ALBA'
    },
    {
      id: 7,
      name: 'Luis Hernández',
      position: 'Guardia de Seguridad',
      phone: '555-0204',
      email: 'guardia3@fraccionamiento.com',
      avatar: null,
      description: 'Guardia de seguridad turno nocturno.',
      shift: 'Nocturno (10:00 PM - 6:00 AM)',
      serviceCode: 'ALBA'
    }
  ]
};

// GET /api/directory - Obtener directorio completo (admins y residentes)
router.get('/', auth, authorize('admin', 'administrador', 'manager', 'residente', 'comite', 'supervisor'), async (req, res) => {
  try {
    console.log('📋 Fetching directory data...');
    let userServiceCode = req.user.serviceCode || 'ALBA';
    // Permitir override por query param solo a admin
    const requestedCode = (req.query.serviceCode || '').toUpperCase();
    const adminRoles = ['admin', 'administrador', 'manager'];
    if (requestedCode && adminRoles.includes(req.user.role)) {
      userServiceCode = requestedCode;
    }
    
    let committee = [];
    let guards = [];
    
    // Intentar obtener datos de MongoDB primero
    try {
      // Buscar miembros del comité
      const committeeMembers = await User.find({
        role: { $in: ['comite', 'administrador', 'manager'] },
        serviceCode: userServiceCode,
        isActive: true
      }).select('-password');
      
      // Buscar guardias
      const guardMembers = await User.find({
        role: 'guardia',
        serviceCode: userServiceCode,
        isActive: true
      }).select('-password');
      
      committee = committeeMembers.map(member => ({
        id: member._id,
        name: member.name || member.username,
        position: member.position || 'Miembro del Comité',
        phone: member.phone || 'No disponible',
        email: member.email,
        avatar: member.avatar || null,
        description: member.description || 'Miembro del comité directivo.',
        serviceCode: member.serviceCode
      }));
      
      guards = guardMembers.map(guard => ({
        id: guard._id,
        name: guard.name || guard.username,
        position: guard.position || 'Guardia de Seguridad',
        email: guard.email,
        avatar: guard.avatar || null,
        description: guard.description || 'Personal de seguridad del fraccionamiento.',
        experience: guard.experience || '—',
        certifications: Array.isArray(guard.certifications) ? guard.certifications : [],
        serviceCode: guard.serviceCode
      }));
      
      console.log(`✅ Found ${committee.length} committee members and ${guards.length} guards in MongoDB`);
      
    } catch (dbError) {
      console.log('❌ MongoDB error, using in-memory data:', dbError.message);
      // Fallback a datos en memoria (actualizado con cuentas reales conocidas)
      const fallbackGuards = [
        { id: 'g-karem', name: 'Karem Sarahí Lara Sánchez', serviceCode: 'ALBA' },
        { id: 'g-narciso', name: 'Narciso Hernández del Ángel', serviceCode: 'ALBA' },
        { id: 'g-citlali', name: 'Citlali Sarahí Rocha Lara', serviceCode: 'ALBA' },
        { id: 'g-luisangel', name: 'Luis Angel Ramírez Saldaña', serviceCode: 'ALBA' },
        { id: 'g-extra', name: 'Guardia Asignado 5', serviceCode: 'ALBA' }
      ];
      committee = inMemoryDirectory.committee.filter(member => member.serviceCode === userServiceCode);
      guards = fallbackGuards.filter(g => g.serviceCode === userServiceCode).map(g => ({
        id: g.id,
        name: g.name,
        position: 'Guardia de Seguridad',
        email: '',
        avatar: null,
        description: 'Personal de seguridad del fraccionamiento.',
        experience: '—',
        certifications: [],
        serviceCode: g.serviceCode
      }));
    }
    
    res.json({
      committee,
      guards,
      serviceCode: userServiceCode
    });
    
  } catch (error) {
    console.error('Error fetching directory:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener directorio' });
  }
});

// GET /api/directory/committee - Obtener solo miembros del comité
router.get('/committee', auth, authorize('admin', 'administrador', 'manager'), async (req, res) => {
  try {
    const userServiceCode = req.user.serviceCode || 'ALBA';
    let committee = [];
    
    try {
      const committeeMembers = await User.find({
        role: { $in: ['comite', 'administrador', 'manager'] },
        serviceCode: userServiceCode,
        isActive: true
      }).select('-password');
      
      committee = committeeMembers.map(member => ({
        id: member._id,
        name: member.name || member.username,
        position: member.position || 'Miembro del Comité',
        phone: member.phone || 'No disponible',
        email: member.email,
        avatar: member.avatar || null,
        description: member.description || 'Miembro del comité directivo.',
        serviceCode: member.serviceCode
      }));
      
    } catch (dbError) {
      committee = inMemoryDirectory.committee.filter(member => 
        member.serviceCode === userServiceCode
      );
    }
    
    res.json(committee);
    
  } catch (error) {
    console.error('Error fetching committee:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener comité' });
  }
});

// GET /api/directory/guards - Obtener solo guardias
router.get('/guards', auth, authorize('admin', 'administrador', 'manager'), async (req, res) => {
  try {
    const userServiceCode = req.user.serviceCode || 'ALBA';
    let guards = [];
    
    try {
      const guardMembers = await User.find({
        role: 'guardia',
        serviceCode: userServiceCode,
        isActive: true
      }).select('-password');
      
      guards = guardMembers.map(guard => ({
        id: guard._id,
        name: guard.name || guard.username,
        position: guard.position || 'Guardia de Seguridad',
        phone: guard.phone || 'No disponible',
        email: guard.email,
        avatar: guard.avatar || null,
        description: guard.description || 'Personal de seguridad del fraccionamiento.',
        shift: guard.shift || 'No asignado',
        serviceCode: guard.serviceCode
      }));
      
    } catch (dbError) {
      guards = inMemoryDirectory.guards.filter(guard => 
        guard.serviceCode === userServiceCode
      );
    }
    
    res.json(guards);
    
  } catch (error) {
    console.error('Error fetching guards:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener guardias' });
  }
});

export default router;