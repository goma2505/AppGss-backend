import express from 'express'
import auth, { authorize } from '../middleware/auth.js'
import CommunityService from '../models/CommunityService.js'

const router = express.Router()

const isValidPhone = (p) => {
  if (!p) return true
  const digits = String(p).replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}
const isValidUrl = (u) => {
  if (!u) return true
  try { const x = new URL(u); return ['http:','https:'].includes(x.protocol) } catch (_) { return false }
}

router.get('/', auth, async (req, res) => {
  try {
    const code = (req.query.serviceCode || req.user?.serviceCode || '').toUpperCase()
    if (!code) return res.json({ services: [] })
    const list = await CommunityService.find({ serviceCode: code, isActive: true }).sort({ name: 1 })
    res.json({ services: list })
  } catch (e) {
    res.status(500).json({ msg: 'Error al obtener servicios' })
  }
})

router.post('/', auth, authorize('admin','administrador','manager','comite'), async (req, res) => {
  try {
    const { serviceCode, name, notes, phone, externalUrl, isActive = true } = req.body
    if (!serviceCode || !name) return res.status(400).json({ msg: 'serviceCode y name son requeridos' })
    if (!isValidPhone(phone)) return res.status(400).json({ msg: 'Teléfono inválido' })
    if (!isValidUrl(externalUrl)) return res.status(400).json({ msg: 'URL inválida' })
    const item = new CommunityService({ serviceCode: String(serviceCode).toUpperCase(), name, notes, phone, externalUrl, isActive })
    await item.save()
    res.status(201).json({ service: item })
  } catch (e) {
    res.status(500).json({ msg: 'Error al crear servicio' })
  }
})

router.put('/:id', auth, authorize('admin','administrador','manager','comite'), async (req, res) => {
  try {
    const { id } = req.params
    const { name, notes, phone, externalUrl, isActive } = req.body
    if (phone && !isValidPhone(phone)) return res.status(400).json({ msg: 'Teléfono inválido' })
    if (externalUrl && !isValidUrl(externalUrl)) return res.status(400).json({ msg: 'URL inválida' })
    const updated = await CommunityService.findByIdAndUpdate(id, { name, notes, phone, externalUrl, isActive }, { new: true })
    if (!updated) return res.status(404).json({ msg: 'Servicio no encontrado' })
    res.json({ service: updated })
  } catch (e) {
    res.status(500).json({ msg: 'Error al actualizar servicio' })
  }
})

export default router