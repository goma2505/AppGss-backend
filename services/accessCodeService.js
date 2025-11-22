import AccessCode from '../models/AccessCode.js';
import User from '../models/User.js';

class AccessCodeService {
  /**
   * Genera un nuevo código de acceso
   * @param {Object} params - Parámetros para generar el código
   * @param {string} params.subdivision - Fraccionamiento
   * @param {string} params.accountType - Tipo de cuenta (RESIDENT/COMMITTEE)
   * @param {string} params.generatedBy - ID del usuario administrador
   * @param {Date} params.expiresAt - Fecha de expiración (opcional)
   * @param {string} params.notes - Notas adicionales (opcional)
   * @param {Object} params.metadata - Metadatos adicionales (opcional)
   * @returns {Promise<AccessCode>} Código de acceso generado
   */
  async generateAccessCode(params) {
    const { subdivision, accountType, generatedBy, expiresAt, notes, metadata } = params;
    
    // Validar que el usuario que genera sea administrador
    const admin = await User.findById(generatedBy);
    const adminRoles = ['admin','administrador','manager','supervisor'];
    if (!admin || !adminRoles.includes(admin.role)) {
      throw new Error('Solo los administradores pueden generar códigos de acceso');
    }
    
    // Obtener el próximo número secuencial
    const sequentialNumber = await AccessCode.getNextSequentialNumber(subdivision, accountType);
    
    // Generar el código completo
    const code = AccessCode.generateCode(subdivision, accountType, sequentialNumber);
    
    // Crear el código de acceso
    const accessCode = new AccessCode({
      code,
      subdivision,
      accountType,
      sequentialNumber,
      generatedBy,
      expiresAt,
      notes: notes || '',
      metadata: metadata || {}
    });
    
    await accessCode.save();
    
    // Poblar información del administrador
    await accessCode.populate('generatedBy', 'name email');
    
    return accessCode;
  }
  
  /**
   * Genera múltiples códigos de acceso
   * @param {Object} params - Parámetros para generar códigos
   * @param {string} params.subdivision - Fraccionamiento
   * @param {string} params.accountType - Tipo de cuenta
   * @param {number} params.quantity - Cantidad de códigos a generar
   * @param {string} params.generatedBy - ID del usuario administrador
   * @param {Date} params.expiresAt - Fecha de expiración (opcional)
   * @param {string} params.notes - Notas adicionales (opcional)
   * @returns {Promise<AccessCode[]>} Array de códigos generados
   */
  async generateMultipleAccessCodes(params) {
    const { subdivision, accountType, quantity, generatedBy, expiresAt, notes } = params;
    
    if (quantity > 100) {
      throw new Error('No se pueden generar más de 100 códigos a la vez');
    }
    
    const codes = [];
    
    for (let i = 0; i < quantity; i++) {
      const code = await this.generateAccessCode({
        subdivision,
        accountType,
        generatedBy,
        expiresAt,
        notes: notes || `Lote generado - ${i + 1}/${quantity}`
      });
      codes.push(code);
    }
    
    return codes;
  }
  
  /**
   * Valida un código de acceso
   * @param {string} code - Código a validar
   * @returns {Promise<Object>} Resultado de la validación
   */
  async validateAccessCode(code) {
    const accessCode = await AccessCode.findOne({ code });
    
    if (!accessCode) {
      return {
        valid: false,
        error: 'Código de acceso no encontrado',
        code: 'CODE_NOT_FOUND'
      };
    }
    
    if (!accessCode.isAvailable()) {
      return {
        valid: false,
        error: `Código de acceso ${accessCode.status.toLowerCase()}`,
        code: `CODE_${accessCode.status}`,
        accessCode
      };
    }
    
    return {
      valid: true,
      accessCode
    };
  }
  
  /**
   * Usa un código de acceso durante el registro
   * @param {string} code - Código a usar
   * @param {string} userId - ID del usuario que usa el código
   * @returns {Promise<AccessCode>} Código actualizado
   */
  async useAccessCode(code, userId) {
    const validation = await this.validateAccessCode(code);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const accessCode = validation.accessCode;
    await accessCode.markAsUsed(userId);
    
    return accessCode;
  }
  
  /**
   * Obtiene códigos de acceso con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} Códigos y metadatos de paginación
   */
  async getAccessCodes(filters = {}, options = {}) {
    const {
      subdivision,
      accountType,
      status,
      generatedBy,
      usedBy,
      dateFrom,
      dateTo
    } = filters;
    
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    // Construir query
    const query = {};
    
    if (subdivision) query.subdivision = subdivision;
    if (accountType) query.accountType = accountType;
    if (status) query.status = status;
    if (generatedBy) query.generatedBy = generatedBy;
    if (usedBy) query.usedBy = usedBy;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // Ejecutar consulta con paginación
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [codes, total] = await Promise.all([
      AccessCode.find(query)
        .populate('generatedBy', 'name email')
        .populate('usedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      AccessCode.countDocuments(query)
    ]);
    
    return {
      codes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Obtiene estadísticas de códigos de acceso
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Object>} Estadísticas
   */
  async getAccessCodeStats(filters = {}) {
    const { subdivision, accountType, dateFrom, dateTo } = filters;
    
    // Construir match para agregación
    const matchStage = {};
    if (subdivision) matchStage.subdivision = subdivision;
    if (accountType) matchStage.accountType = accountType;
    
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }
    
    const stats = await AccessCode.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          used: { $sum: { $cond: [{ $eq: ['$status', 'USED'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] } },
          revoked: { $sum: { $cond: [{ $eq: ['$status', 'REVOKED'] }, 1, 0] } }
        }
      }
    ]);
    
    // Estadísticas por fraccionamiento
    const subdivisionStats = await AccessCode.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$subdivision',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          used: { $sum: { $cond: [{ $eq: ['$status', 'USED'] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    // Estadísticas por tipo de cuenta
    const accountTypeStats = await AccessCode.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$accountType',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          used: { $sum: { $cond: [{ $eq: ['$status', 'USED'] }, 1, 0] } }
        }
      }
    ]);
    
    return {
      general: stats[0] || {
        total: 0,
        active: 0,
        used: 0,
        expired: 0,
        revoked: 0
      },
      bySubdivision: subdivisionStats,
      byAccountType: accountTypeStats
    };
  }
  
  /**
   * Revoca un código de acceso
   * @param {string} codeId - ID del código a revocar
   * @param {string} revokedBy - ID del usuario que revoca
   * @returns {Promise<AccessCode>} Código revocado
   */
  async revokeAccessCode(codeId, revokedBy) {
    const accessCode = await AccessCode.findById(codeId);
    
    if (!accessCode) {
      throw new Error('Código de acceso no encontrado');
    }
    
    if (accessCode.status === 'USED') {
      throw new Error('No se puede revocar un código ya utilizado');
    }
    
    await accessCode.revoke();
    
    return accessCode;
  }
  
  /**
   * Limpia códigos expirados
   * @returns {Promise<number>} Cantidad de códigos limpiados
   */
  async cleanExpiredCodes() {
    const result = await AccessCode.updateMany(
      {
        status: 'ACTIVE',
        expiresAt: { $lt: new Date() }
      },
      {
        status: 'EXPIRED'
      }
    );
    
    return result.modifiedCount;
  }
}

export default new AccessCodeService();