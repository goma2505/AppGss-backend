import express from 'express';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import accessCodeService from '../services/accessCodeService.js';

const router = express.Router();

// Mock data para fraccionamientos
let subdivisions = [
  {
    _id: 'alba',
    name: 'Alba',
    address: 'Valadez, Colonia Hacienda de Alba, 37547 León de los Aldama, Gto.',
    guardCount: 3,
    description: 'Fraccionamiento residencial Alba con excelente ubicación y seguridad 24/7',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    residents: 45,
    totalUnits: 60,
    amenities: ['Alberca', 'Cancha futbol', 'Dogpark'],
    rules: [
      'Horario de piscina: 6:00 AM - 10:00 PM',
      'Mascotas permitidas con correa',
      'Velocidad máxima 20 km/h',
      'Silencio después de las 10:00 PM'
    ],
    contact: {
      phone: '479 111 6844',
      gatehousePhone: '479 222 3344',
      gardenerPhone: '479 111 6844',
      email: 'administracion@alba.com',
      manager: 'Ana María Rodríguez'
    },
    payment: {
      instructions: 'Pagos mensuales vía transferencia bancaria. Referencia: ALBA-<tu ID>.',
      link: 'https://pagos.alba.mx'
    },
    emergencyContact: '+57 300 911-1234',
    guards: [
      { _id: 'guard1', name: 'Juan Pérez', shift: 'morning', phone: '+57 301 234 5678' },
      { _id: 'guard2', name: 'María García', shift: 'afternoon', phone: '+57 302 345 6789' },
      { _id: 'guard3', name: 'Carlos López', shift: 'night', phone: '+57 303 456 7890' }
    ]
  },
  {
    _id: 'privanza',
    name: 'Privanza',
    address: 'Avenida 30 #789-012, Cartagena',
    guardCount: 2,
    description: 'Conjunto residencial Privanza con diseño moderno y espacios verdes',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    residents: 32,
    totalUnits: 40,
    amenities: ['Piscina', 'BBQ', 'Zona verde', 'Parqueadero visitantes'],
    rules: [
      'Horario de piscina: 7:00 AM - 9:00 PM',
      'Registro obligatorio de visitantes',
      'No se permiten fiestas después de 11:00 PM',
      'Mascotas máximo 2 por apartamento'
    ],
    contact: {
      phone: '+57 5 234-5678',
      email: 'info@privanza.com',
      manager: 'Carlos Mendoza'
    },
    emergencyContact: '+57 301 911-2345',
    guards: [
      { _id: 'guard4', name: 'Ana Rodríguez', shift: 'morning', phone: '+57 304 567 8901' },
      { _id: 'guard5', name: 'Luis Martínez', shift: 'night', phone: '+57 305 678 9012' }
    ]
  },
  {
    _id: 'cartagena',
    name: 'Cartagena',
    address: 'Calle 45 #234-567, Cartagena',
    guardCount: 4,
    description: 'Urbanización Cartagena con amplios espacios y excelente conectividad',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    residents: 67,
    totalUnits: 80,
    amenities: ['Piscina olímpica', 'Gimnasio completo', 'Cancha de tenis', 'Salón de eventos', 'Zona BBQ', 'Parque infantil'],
    rules: [
      'Horario de amenidades: 5:00 AM - 11:00 PM',
      'Reserva previa para salón de eventos',
      'Máximo 3 mascotas por unidad',
      'Velocidad máxima 15 km/h en vías internas'
    ],
    contact: {
      phone: '+57 5 345-6789',
      email: 'administracion@cartagena.com',
      manager: 'Roberto Silva'
    },
    emergencyContact: '+57 302 911-3456',
    guards: [
      { _id: 'guard6', name: 'Pedro Sánchez', shift: 'morning', phone: '+57 306 789 0123' },
      { _id: 'guard7', name: 'Laura Gómez', shift: 'afternoon', phone: '+57 307 890 1234' },
      { _id: 'guard8', name: 'Miguel Torres', shift: 'night', phone: '+57 308 901 2345' },
      { _id: 'guard9', name: 'Sofia Herrera', shift: 'weekend', phone: '+57 309 012 3456' }
    ]
  },
  {
    _id: 'san-julian-1',
    name: 'San Julian 1',
    address: 'Calle 78 #45-123, Cartagena',
    guardCount: 2,
    description: 'Fraccionamiento San Julian 1 con excelente ubicación',
    isActive: true,
    createdAt: new Date('2024-02-10'),
    residents: 28,
    totalUnits: 35,
    amenities: ['Piscina', 'Zona verde', 'Parqueadero'],
    rules: [
      'Horario de piscina: 6:00 AM - 9:00 PM',
      'Mascotas permitidas con correa',
      'Velocidad máxima 20 km/h',
      'Silencio después de las 10:00 PM'
    ],
    contact: {
      phone: '+57 5 456-7890',
      email: 'administracion@sanjulian1.com',
      manager: 'Elena Vargas'
    },
    emergencyContact: '+57 304 911-4567',
    guards: [
      { _id: 'guard10', name: 'Roberto Silva', shift: 'morning', phone: '+57 310 123 4567' },
      { _id: 'guard11', name: 'Carmen Vega', shift: 'night', phone: '+57 311 234 5678' }
    ]
  },
  {
    _id: 'casas-yes',
    name: 'Casas Yes',
    address: 'Avenida 25 #67-890, Cartagena',
    guardCount: 3,
    description: 'Fraccionamiento Casas Yes con diseño moderno',
    isActive: true,
    createdAt: new Date('2024-02-20'),
    residents: 42,
    totalUnits: 50,
    amenities: ['Piscina', 'Gimnasio', 'Salón social', 'Zona BBQ'],
    rules: [
      'Horario de amenidades: 6:00 AM - 10:00 PM',
      'Registro obligatorio de visitantes',
      'Mascotas máximo 2 por unidad',
      'Velocidad máxima 15 km/h'
    ],
    contact: {
      phone: '+57 5 567-8901',
      email: 'info@casasyes.com',
      manager: 'Fernando Castillo'
    },
    emergencyContact: '+57 305 911-5678',
    guards: [
      { _id: 'guard12', name: 'Diego Morales', shift: 'morning', phone: '+57 312 345 6789' },
      { _id: 'guard13', name: 'Patricia Ruiz', shift: 'afternoon', phone: '+57 313 456 7890' },
      { _id: 'guard14', name: 'Fernando Castro', shift: 'night', phone: '+57 314 567 8901' }
    ]
  }
];

// Obtener todos los fraccionamientos
router.get('/', auth, async (req, res) => {
  try {
    const { active } = req.query;
    
    let filteredSubdivisions = subdivisions;
    
    if (active !== undefined) {
      const isActive = active === 'true';
      filteredSubdivisions = subdivisions.filter(sub => sub.isActive === isActive);
    }
    
    res.json(filteredSubdivisions);
  } catch (error) {
    console.error('Error fetching subdivisions:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener fraccionamiento por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const subdivision = subdivisions.find(sub => sub._id === id);
    
    if (!subdivision) {
      return res.status(404).json({ message: 'Fraccionamiento no encontrado' });
    }
    
    res.json(subdivision);
  } catch (error) {
    console.error('Error fetching subdivision:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nuevo fraccionamiento (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, address, guardCount, description } = req.body;
    
    if (!name || !address || !guardCount) {
      return res.status(400).json({ 
        message: 'name, address y guardCount son requeridos' 
      });
    }
    
    // Verificar que no exista un fraccionamiento con el mismo nombre
    const existingSubdivision = subdivisions.find(sub => 
      sub.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingSubdivision) {
      return res.status(400).json({ 
        message: 'Ya existe un fraccionamiento con ese nombre' 
      });
    }
    
    const subdivisionId = name.toLowerCase().replace(/\s+/g, '-');
    
    const newSubdivision = {
      _id: subdivisionId,
      name,
      address,
      guardCount: parseInt(guardCount),
      description: description || '',
      isActive: true,
      createdAt: new Date(),
      residents: 0,
      guards: []
    };
    
    subdivisions.push(newSubdivision);
    
    // Generar códigos de acceso exclusivos automáticamente
    let generatedCodes = [];
    let createdGuards = [];
    try {
      // Generar 5 códigos para residentes
      const residentCodes = await accessCodeService.generateMultipleAccessCodes({
        subdivision: subdivisionId,
        accountType: 'RESIDENT',
        count: 5,
        generatedBy: req.user.id,
        notes: `Códigos automáticos para fraccionamiento ${name}`
      });
      
      // Generar 2 códigos para comité
      const committeeCodes = await accessCodeService.generateMultipleAccessCodes({
        subdivision: subdivisionId,
        accountType: 'COMMITTEE',
        count: 2,
        generatedBy: req.user.id,
        notes: `Códigos automáticos para comité de ${name}`
      });
      
      generatedCodes = [...residentCodes, ...committeeCodes];
      
      // Crear guardias automáticamente para el fraccionamiento
       const guardShifts = ['morning', 'afternoon', 'night'];
       const numGuards = parseInt(guardCount) || 2;
      
      for (let i = 0; i < Math.min(numGuards, 3); i++) {
        const guardId = `guard_${subdivisionId}_${Date.now()}_${i}`;
        const guardName = `Guardia ${guardShifts[i] === 'morning' ? 'Matutino' : guardShifts[i] === 'afternoon' ? 'Vespertino' : 'Nocturno'} - ${name}`;
        const guardEmail = `guardia.${guardShifts[i]}.${subdivisionId}@guardias.com`;
        
        const newGuard = {
          _id: guardId,
          name: guardName,
          email: guardEmail,
          phone: `+57 30${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          subdivision: subdivisionId,
          shift: guardShifts[i],
          isActive: true,
          createdAt: new Date()
        };
        
        createdGuards.push(newGuard);
        
        // Agregar al array de guardias del fraccionamiento
        newSubdivision.guards.push({
          _id: guardId,
          name: guardName,
          shift: guardShifts[i]
        });
      }
    } catch (codeError) {
      console.warn('Error generando códigos automáticos:', codeError.message);
      // Continuar sin códigos si hay error
    }
    
    res.status(201).json({
      message: 'Fraccionamiento creado exitosamente',
      subdivision: newSubdivision,
      accessCodes: generatedCodes.map(code => ({
        code: code.code,
        accountType: code.accountType,
        expiresAt: code.expiresAt
      })),
      guards: createdGuards.map(guard => ({
        id: guard._id,
        name: guard.name,
        email: guard.email,
        phone: guard.phone,
        shift: guard.shift
      }))
    });
  } catch (error) {
    console.error('Error creating subdivision:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar fraccionamiento (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, guardCount, description, isActive, generalInfo } = req.body;
    // Permitir actualización de contacto anidado
    const contact = req.body?.contact;
    const payment = req.body?.payment;

    const allowedRoles = ['admin','administrador','manager','supervisor','comite'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permisos insuficientes para actualizar fraccionamiento' });
    }
    
    const subdivisionIndex = subdivisions.findIndex(sub => sub._id === id);
    
    if (subdivisionIndex === -1) {
      return res.status(404).json({ message: 'Fraccionamiento no encontrado' });
    }
    
    const subdivision = subdivisions[subdivisionIndex];
    
    if (name) subdivision.name = name;
    if (address) subdivision.address = address;
    if (guardCount) subdivision.guardCount = parseInt(guardCount);
    if (description !== undefined) subdivision.description = description;
    // Información general opcional
    if (generalInfo !== undefined) subdivision.generalInfo = generalInfo;
    if (isActive !== undefined) subdivision.isActive = isActive;
    
    // Actualizar contacto si se envía
    if (contact && typeof contact === 'object') {
      subdivision.contact = {
        ...subdivision.contact,
        ...(contact.phone ? { phone: contact.phone } : {}),
        ...(contact.gatehousePhone ? { gatehousePhone: contact.gatehousePhone } : {}),
        ...(contact.email ? { email: contact.email } : {}),
        ...(contact.secondaryEmail ? { secondaryEmail: contact.secondaryEmail } : {}),
        ...(contact.manager ? { manager: contact.manager } : {}),
        ...(contact.gardenerPhone ? { gardenerPhone: contact.gardenerPhone } : {}),
        ...(contact.website ? { website: contact.website } : {})
      };
    }

    // Actualizar información de pagos
    if (payment && typeof payment === 'object') {
      // Si el campo existe en el payload, respetar incluso si es cadena vacía para limpiar
      const nextPayment = { ...subdivision.payment };
      if (Object.prototype.hasOwnProperty.call(payment, 'instructions')) {
        nextPayment.instructions = payment.instructions || '';
      }
      if (Object.prototype.hasOwnProperty.call(payment, 'link')) {
        nextPayment.link = payment.link || '';
      }
      subdivision.payment = nextPayment;
    }
    
    subdivision.updatedAt = new Date();
    
    subdivisions[subdivisionIndex] = subdivision;
    
    res.json({
      message: 'Fraccionamiento actualizado exitosamente',
      subdivision
    });
  } catch (error) {
    console.error('Error updating subdivision:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar fraccionamiento (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const subdivisionIndex = subdivisions.findIndex(sub => sub._id === id);
    
    if (subdivisionIndex === -1) {
      return res.status(404).json({ message: 'Fraccionamiento no encontrado' });
    }
    
    subdivisions.splice(subdivisionIndex, 1);
    
    res.json({ message: 'Fraccionamiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting subdivision:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener códigos de acceso de un fraccionamiento
router.get('/:id/access-codes', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const subdivision = subdivisions.find(sub => sub._id === id);
    
    if (!subdivision) {
      return res.status(404).json({ message: 'Fraccionamiento no encontrado' });
    }
    
    // Generar códigos según roles solicitados
    const rolesParam = (req.query.roles || '').toString();
    if (rolesParam) {
      const roles = rolesParam.split(',').map(r => r.trim().toUpperCase());
      const out = [];
      for (const role of roles) {
        try {
          const codes = await accessCodeService.generateMultipleAccessCodes({
            subdivision: id.toUpperCase(),
            accountType: role,
            quantity: 1,
            generatedBy: req.user?.id
          });
          out.push(...codes);
        } catch (_) {}
      }
      return res.json(out);
    }
    
    // Generar códigos de acceso usando el servicio
    const accessCodes = await accessCodeService.generateAccessCodes(id);
    res.json(accessCodes);
  } catch (error) {
    console.error('Error fetching access codes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de fraccionamientos
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const totalSubdivisions = subdivisions.length;
    const activeSubdivisions = subdivisions.filter(sub => sub.isActive).length;
    const totalResidents = subdivisions.reduce((sum, sub) => sum + sub.residents, 0);
    const totalGuards = subdivisions.reduce((sum, sub) => sum + sub.guardCount, 0);
    
    res.json({
      totalSubdivisions,
      activeSubdivisions,
      totalResidents,
      totalGuards
    });
  } catch (error) {
    console.error('Error fetching subdivision stats:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;