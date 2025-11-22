import mongoose from 'mongoose'

const CommunityServiceSchema = new mongoose.Schema({
  serviceCode: { type: String, required: true, uppercase: true, index: true },
  name: { type: String, required: true, trim: true },
  notes: { type: String, default: '' },
  phone: { type: String, default: '' },
  externalUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

CommunityServiceSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); })

CommunityServiceSchema.index({ serviceCode: 1, name: 1 }, { unique: true })

const CommunityService = mongoose.model('CommunityService', CommunityServiceSchema)

export default CommunityService