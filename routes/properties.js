import express from 'express'
import auth from '../middleware/auth.js'
import User from '../models/User.js'

const router = express.Router()

// GET /api/properties?serviceCode=ALBA
router.get('/', auth, async (req, res) => {
  try {
    const code = (req.query.serviceCode || req.user?.serviceCode || '').toUpperCase()
    if (!code) return res.json({ properties: [] })
    const residents = await User.find({ role: 'residente', serviceCode: code }).select('-password')
    const list = residents.map(r => ({
      _id: String(r._id),
      name: `Residencia ${r.street || ''} ${r.number || ''}`.trim(),
      address: `${r.street || ''} ${r.number || ''}`.trim() || r.address || 'Sin dirección',
      hasAlert: false,
      alertType: '',
      paymentStatus: 'current',
      resident: r.name || r.username,
      serviceCode: code,
      residentId: String(r._id)
    }))
    res.json({ properties: list })
  } catch (e) {
    res.status(500).json({ msg: 'Error al obtener residencias' })
  }
})

export default router