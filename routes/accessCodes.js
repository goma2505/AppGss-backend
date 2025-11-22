import express from 'express';
import AccessCode from '../models/AccessCode.js';
import accessCodeService from '../services/accessCodeService.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
const router = express.Router();

// Middleware para validar que el usuario sea administrador
const requireAdmin = [auth, adminAuth];

/**
 * @route   POST /api/access-codes/generate
 * @desc    Generar un nuevo código de acceso
 * @access  Admin only
 */
router.post('/generate', requireAdmin, async (req, res) => {
  try {
    const {
      subdivision,
      accountType,
      expiresAt,
      notes
    } = req.body;
    
    // Validaciones
    if (!subdivision || !accountType) {
      return res.status(400).json({
        success: false,
        message: 'Fraccionamiento y tipo de cuenta son requeridos'
      });
    }
    
    const validSubdivisions = [
      'ALBA', 'PRIVANZA', 'BOSQUES', 'JARDINES', 'COLINAS',
      'VALLE', 'MONTAÑA', 'LAGOS', 'PRADERAS', 'SENDEROS', 'MIRADOR'
    ];
    
    const validAccountTypes = ['COMMITTEE', 'SUPERVISOR'];
    
    if (!validSubdivisions.includes(subdivision)) {
      return res.status(400).json({
        success: false,
        message: 'Fraccionamiento no válido'
      });
    }
    
    if (!validAccountTypes.includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de cuenta no válido'
      });
    }
    
    // Generar código
    const accessCode = await accessCodeService.generateAccessCode({
      subdivision,
      accountType,
      generatedBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Código de acceso generado exitosamente',
      data: accessCode
    });
    
  } catch (error) {
    console.error('Error generando código de acceso:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/access-codes/generate-multiple
 * @desc    Generar múltiples códigos de acceso
 * @access  Admin only
 */
router.post('/generate-multiple', requireAdmin, async (req, res) => {
  try {
    const {
      subdivision,
      accountType,
      quantity,
      expiresAt,
      notes
    } = req.body;
    
    // Validaciones
    if (!subdivision || !accountType || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Fraccionamiento, tipo de cuenta y cantidad son requeridos'
      });
    }
    
    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe estar entre 1 y 100'
      });
    }
    
    // Generar códigos
    const accessCodes = await accessCodeService.generateMultipleAccessCodes({
      subdivision,
      accountType,
      quantity: parseInt(quantity),
      generatedBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes
    });
    
    res.status(201).json({
      success: true,
      message: `${accessCodes.length} códigos de acceso generados exitosamente`,
      data: accessCodes
    });
    
  } catch (error) {
    console.error('Error generando códigos múltiples:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/access-codes/validate
 * @desc    Validar un código de acceso
 * @access  Public (usado durante registro)
 */
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de acceso es requerido'
      });
    }
    
    const validation = await accessCodeService.validateAccessCode(code);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        code: validation.code
      });
    }
    
    res.json({
      success: true,
      message: 'Código de acceso válido',
      data: {
        subdivision: validation.accessCode.subdivision,
        accountType: validation.accessCode.accountType,
        subdivisionInfo: validation.accessCode.subdivisionInfo,
        accountTypeInfo: validation.accessCode.accountTypeInfo
      }
    });
    
  } catch (error) {
    console.error('Error validando código:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/access-codes/use
 * @desc    Marcar un código de acceso como usado
 * @access  Público (usado durante registro)
 */
router.post('/use', async (req, res) => {
  try {
    const { code, userId } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de acceso es requerido'
      });
    }
    const used = await accessCodeService.useAccessCode(code, userId || null);
    res.json({
      success: true,
      message: 'Código marcado como usado',
      data: used
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/access-codes
 * @desc    Obtener códigos de acceso con filtros
 * @access  Admin only
 */
router.get('/', auth, async (req, res) => {
  try {
    const {
      subdivision,
      accountType,
      status,
      generatedBy,
      usedBy,
      dateFrom,
      dateTo,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;
    
    // Mock data for testing
    const mockCodes = [
      {
        _id: '1',
        code: 'GSS001',
        subdivision: 'Alba Residencial',
        accountType: 'guard',
        status: 'active',
        generatedBy: 'admin',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        _id: '2',
        code: 'GSS002',
        subdivision: 'Villas del Sol',
        accountType: 'resident',
        status: 'used',
        generatedBy: 'admin',
        usedBy: 'user123',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000)
      }
    ];
    
    res.json({
      success: true,
      data: mockCodes,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: mockCodes.length,
        itemsPerPage: 20
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo códigos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/access-codes/stats
 * @desc    Obtener estadísticas de códigos de acceso
 * @access  Admin only
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const {
      subdivision,
      accountType,
      dateFrom,
      dateTo
    } = req.query;
    
    const filters = {
      subdivision,
      accountType,
      dateFrom,
      dateTo
    };
    
    const stats = await accessCodeService.getAccessCodeStats(filters);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   PUT /api/access-codes/:id/revoke
 * @desc    Revocar un código de acceso
 * @access  Admin only
 */
router.put('/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const accessCode = await accessCodeService.revokeAccessCode(id, req.user.id);
    
    res.json({
      success: true,
      message: 'Código de acceso revocado exitosamente',
      data: accessCode
    });
    
  } catch (error) {
    console.error('Error revocando código:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * @route   POST /api/access-codes/clean-expired
 * @desc    Limpiar códigos expirados
 * @access  Admin only
 */
router.post('/clean-expired', requireAdmin, async (req, res) => {
  try {
    const cleanedCount = await accessCodeService.cleanExpiredCodes();
    
    res.json({
      success: true,
      message: `${cleanedCount} códigos expirados limpiados`,
      data: { cleanedCount }
    });
    
  } catch (error) {
    console.error('Error limpiando códigos expirados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/access-codes/subdivisions
 * @desc    Obtener lista de fraccionamientos disponibles
 * @access  Admin only
 */
router.get('/subdivisions', requireAdmin, async (req, res) => {
  try {
    const subdivisions = [
      { code: 'ALBA', name: 'Fraccionamiento Alba' },
      { code: 'PRIVANZA', name: 'Fraccionamiento Privanza' },
      { code: 'BOSQUES', name: 'Fraccionamiento Bosques' },
      { code: 'JARDINES', name: 'Fraccionamiento Jardines' },
      { code: 'COLINAS', name: 'Fraccionamiento Colinas' },
      { code: 'VALLE', name: 'Fraccionamiento Valle' },
      { code: 'MONTAÑA', name: 'Fraccionamiento Montaña' },
      { code: 'LAGOS', name: 'Fraccionamiento Lagos' },
      { code: 'PRADERAS', name: 'Fraccionamiento Praderas' },
      { code: 'SENDEROS', name: 'Fraccionamiento Senderos' },
      { code: 'MIRADOR', name: 'Fraccionamiento Mirador' }
    ];
    
    res.json({
      success: true,
      data: subdivisions
    });
    
  } catch (error) {
    console.error('Error obteniendo fraccionamientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/access-codes/account-types
 * @desc    Obtener tipos de cuenta disponibles
 * @access  Admin only
 */
router.get('/account-types', requireAdmin, async (req, res) => {
  try {
    const accountTypes = [
      { code: 'COMMITTEE', name: 'Comité' },
      { code: 'SUPERVISOR', name: 'Supervisor de Guardias' }
    ];
    
    res.json({
      success: true,
      data: accountTypes
    });
    
  } catch (error) {
    console.error('Error obteniendo tipos de cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;