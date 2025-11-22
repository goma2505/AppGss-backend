import express from 'express';
import Notice from '../models/Notice.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { auth, authorize } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/notices');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen, PDF y documentos'));
    }
  }
});

// Datos en memoria para fallback
let inMemoryNotices = [
  {
    _id: '1',
    title: 'Mantenimiento de áreas comunes',
    content: 'Se realizará mantenimiento en las áreas comunes el próximo fin de semana.',
    type: 'aviso',
    priority: 'media',
    status: 'activo',
    createdBy: 'admin',
    createdByRole: 'admin',
    serviceCode: 'ALBA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '2',
    title: 'Incidente en estacionamiento',
    content: 'Se reportó un incidente menor en el área de estacionamiento.',
    type: 'incidente',
    priority: 'alta',
    status: 'activo',
    createdBy: 'guardia',
    createdByRole: 'guardia',
    serviceCode: 'ALBA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// GET /api/notices - Obtener todos los avisos
router.get('/', auth, async (req, res) => {
  try {
    console.log('📋 Fetching notices...');
    let notices = [];
    const userServiceCode = req.user?.serviceCode || 'ALBA';
    
    // Intentar usar MongoDB primero
    try {
      notices = await Notice.find({
        serviceId: userServiceCode
      }).sort({ createdAt: -1 });
      console.log(`✅ Found ${notices.length} notices in MongoDB`);
    } catch (dbError) {
      console.log('❌ MongoDB error, using in-memory data:', dbError.message);
      notices = inMemoryNotices.filter(notice => 
        notice.serviceCode === userServiceCode
      );
    }
    
    res.json(notices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener avisos' });
  }
});

// POST /api/notices - Crear nuevo aviso
router.post('/', auth, authorize('admin','administrador','manager','supervisor','guardia','comite'), upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('📝 Creating new notice...');
    const { title, content, description, type, priority } = req.body;
    
    // Validar datos requeridos
    if (!title || !(description || content) || !type) {
      return res.status(400).json({ msg: 'Título, descripción/contenido y tipo son requeridos' });
    }
    
    // Procesar archivos adjuntos
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];
    
    const userServiceCode = req.user?.serviceCode || 'ALBA';
    const noticeData = {
      title,
      description: description || content,
      content: content || description,
      type,
      priority: priority || 'media',
      status: 'activo',
      createdBy: req.user?._id,
      createdByRole: req.user?.role,
      serviceId: userServiceCode,
      attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    let newNotice;
    
    // Intentar guardar en MongoDB primero
    try {
      newNotice = new Notice(noticeData);
      await newNotice.save();
      console.log('✅ Notice saved to MongoDB');
    } catch (dbError) {
      console.log('❌ MongoDB error, saving to memory:', dbError.message);
      // Fallback a datos en memoria
      newNotice = {
        _id: Date.now().toString(),
        ...noticeData,
        serviceCode: userServiceCode
      };
      inMemoryNotices.unshift(newNotice);
    }
    
    res.status(201).json({
      msg: 'Aviso creado exitosamente',
      notice: newNotice
    });
    
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ msg: 'Error del servidor al crear aviso' });
  }
});

// PUT /api/notices/:id - Actualizar aviso
router.put('/:id', auth, authorize('admin','administrador','manager','supervisor','guardia','comite'), async (req, res) => {
  try {
    const { title, content, description, type, priority, status } = req.body;
    const noticeId = req.params.id;
    
    let updatedNotice;
    
    // Intentar actualizar en MongoDB primero
    try {
      updatedNotice = await Notice.findByIdAndUpdate(
        noticeId,
        {
          title,
          content: content || description,
          description: description || content,
          type,
          priority,
          status,
          updatedAt: new Date().toISOString()
        },
        { new: true }
      );
      
      if (!updatedNotice) {
        return res.status(404).json({ msg: 'Aviso no encontrado' });
      }
      
      console.log('✅ Notice updated in MongoDB');
    } catch (dbError) {
      console.log('❌ MongoDB error, updating in memory:', dbError.message);
      // Fallback a datos en memoria
      const noticeIndex = inMemoryNotices.findIndex(n => n._id === noticeId);
      if (noticeIndex === -1) {
        return res.status(404).json({ msg: 'Aviso no encontrado' });
      }
      
      inMemoryNotices[noticeIndex] = {
        ...inMemoryNotices[noticeIndex],
        title,
        content: content || description,
        type,
        priority,
        status,
        updatedAt: new Date().toISOString()
      };
      updatedNotice = inMemoryNotices[noticeIndex];
    }
    
    res.json({
      msg: 'Aviso actualizado exitosamente',
      notice: updatedNotice
    });
    
  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({ msg: 'Error del servidor al actualizar aviso' });
  }
});

// DELETE /api/notices/:id - Eliminar aviso
router.delete('/:id', auth, authorize('admin','administrador','manager','supervisor','guardia','comite'), async (req, res) => {
  try {
    const noticeId = req.params.id;
    let deleted = false;
    
    // Intentar eliminar en MongoDB primero
    try {
      const result = await Notice.findByIdAndDelete(noticeId);
      if (result) {
        deleted = true;
      }
    } catch (dbError) {
      console.log('❌ MongoDB error, deleting in memory:', dbError.message);
      const noticeIndex = inMemoryNotices.findIndex(n => n._id === noticeId);
      if (noticeIndex !== -1) {
        inMemoryNotices.splice(noticeIndex, 1);
        deleted = true;
      }
    }
    
    if (!deleted) {
      return res.status(404).json({ msg: 'Aviso no encontrado' });
    }
    
    res.json({ msg: 'Aviso eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ msg: 'Error del servidor al eliminar aviso' });
  }
});

export default router;