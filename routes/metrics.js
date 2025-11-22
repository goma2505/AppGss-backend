import express from 'express';
import Metric from '../models/Metric.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { name, value, attributes } = req.body || {};
    if (!name) return res.status(400).json({ msg: 'Nombre de métrica requerido' });
    const metric = new Metric({ name, value, attributes });
    await metric.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ msg: 'Error al registrar métrica' });
  }
});

export default router;