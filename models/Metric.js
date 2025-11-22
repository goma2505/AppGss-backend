import mongoose from 'mongoose';

const MetricSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, default: 0 },
  attributes: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

const Metric = mongoose.model('Metric', MetricSchema);

export default Metric;