import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import auth, { authorize } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'payments')
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const base = path.basename(file.originalname)
    const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_').toLowerCase()
    cb(null, `${Date.now()}-${sanitized}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|jpeg|jpg|png/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (mimetype && extname) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten PDF, JPG y PNG'))
    }
  }
})

// In-memory storage
const receipts = []

router.post('/receipts', auth, authorize('residente', 'administrador', 'admin'), upload.single('receipt'), async (req, res) => {
  try {
    const id = Date.now().toString()
    const file = req.file
    if (!file) return res.status(400).json({ msg: 'Archivo requerido' })
    const user = req.user || {}
    const item = {
      id,
      userId: user.id || user._id,
      user: { id: user.id || user._id, role: user.role, name: user.name, username: user.username },
      originalName: file.originalname,
      fileName: file.filename,
      fileUrl: `/uploads/payments/${file.filename}`,
      mime: file.mimetype,
      size: file.size,
      note: req.body?.note || '',
      status: 'submitted',
      createdAt: Date.now(),
      auditLog: [ { action: 'upload', by: { id: user.id || user._id, role: user.role }, at: Date.now() } ]
    }
    receipts.push(item)
    res.json({ success: true, id, receipt: item })
  } catch (e) {
    res.status(500).json({ msg: 'Error al subir comprobante' })
  }
})

router.get('/receipts', auth, authorize('admin', 'administrador', 'comite'), async (req, res) => {
  res.json({ receipts })
})

router.put('/receipts/:id', auth, authorize('comite'), async (req, res) => {
  try {
    const id = req.params.id
    const idx = receipts.findIndex(r => r.id === id)
    if (idx === -1) return res.status(404).json({ msg: 'Registro no encontrado' })
    const prev = receipts[idx]
    const patch = {}
    if (typeof req.body.status !== 'undefined') patch.status = String(req.body.status)
    if (typeof req.body.amount !== 'undefined') patch.amount = Number(req.body.amount)
    if (typeof req.body.note !== 'undefined') patch.note = String(req.body.note)
    receipts[idx] = { ...prev, ...patch }
    const user = req.user || {}
    receipts[idx].auditLog = receipts[idx].auditLog || []
    receipts[idx].auditLog.push({ action: 'edit', by: { id: user.id || user._id, role: user.role }, at: Date.now(), details: Object.keys(patch).join(',') })
    res.json({ success: true, receipt: receipts[idx] })
  } catch (e) {
    res.status(500).json({ msg: 'Error al actualizar registro' })
  }
})

export default router