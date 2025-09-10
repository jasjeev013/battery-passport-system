const mongoose = require('mongoose');
require('./User');
const manufacturerInformationSchema = new mongoose.Schema({
  manufacturerName: {
    type: String,
    required: true,
    trim: true
  },
  manufacturerIdentifier: {
    type: String,
    required: true,
    trim: true
  }
});

const batteryModelSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true
  },
  modelName: {
    type: String,
    required: true,
    trim: true
  }
});

const generalInformationSchema = new mongoose.Schema({
  batteryIdentifier: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  batteryModel: {
    type: batteryModelSchema,
    required: true
  },
  batteryMass: {
    type: Number,
    required: true,
    min: 0
  },
  batteryCategory: {
    type: String,
    required: true,
    enum: ['EV', 'Consumer Electronics', 'Industrial', 'Energy Storage', 'Other'],
    trim: true
  },
  batteryStatus: {
    type: String,
    required: true,
    enum: ['Original', 'Refurbished', 'Second Life', 'Recycled'],
    trim: true
  },
  manufacturingDate: {
    type: Date,
    required: true
  },
  manufacturingPlace: {
    type: String,
    required: true,
    trim: true
  },
  warrantyPeriod: {
    type: String,
    required: true,
    trim: true
  },
  manufacturerInformation: {
    type: manufacturerInformationSchema,
    required: true
  }
});

const hazardousSubstanceSchema = new mongoose.Schema({
  substanceName: {
    type: String,
    required: true,
    trim: true
  },
  chemicalFormula: {
    type: String,
    required: true,
    trim: true
  },
  casNumber: {
    type: String,
    required: true,
    trim: true
  }
});

const materialCompositionSchema = new mongoose.Schema({
  batteryChemistry: {
    type: String,
    required: true,
    trim: true
  },
  criticalRawMaterials: [{
    type: String,
    trim: true
  }],
  hazardousSubstances: [hazardousSubstanceSchema]
});

const carbonFootprintSchema = new mongoose.Schema({
  totalCarbonFootprint: {
    type: Number,
    required: true,
    min: 0
  },
  measurementUnit: {
    type: String,
    required: true,
    default: "kg CO2e",
    trim: true
  },
  methodology: {
    type: String,
    required: true,
    trim: true
  }
});

const batteryPassportSchema = new mongoose.Schema({
  data: {
    generalInformation: {
      type: generalInformationSchema,
      required: true
    },
    materialComposition: {
      type: materialCompositionSchema,
      required: true
    },
    carbonFootprint: {
      type: carbonFootprintSchema,
      required: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Update the updatedAt field before saving
batteryPassportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BatteryPassport', batteryPassportSchema);