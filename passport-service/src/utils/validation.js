const { body } = require('express-validator');

const createPassportValidation = [
  body('data.generalInformation.batteryIdentifier')
    .notEmpty()
    .withMessage('Battery identifier is required'),
  body('data.generalInformation.batteryModel.id')
    .notEmpty()
    .withMessage('Battery model ID is required'),
  body('data.generalInformation.batteryModel.modelName')
    .notEmpty()
    .withMessage('Battery model name is required'),
  body('data.generalInformation.batteryMass')
    .isNumeric()
    .withMessage('Battery mass must be a number')
    .isFloat({ min: 0 })
    .withMessage('Battery mass must be positive'),
  body('data.generalInformation.batteryCategory')
    .isIn(['EV', 'Consumer Electronics', 'Industrial', 'Energy Storage', 'Other'])
    .withMessage('Invalid battery category'),
  body('data.generalInformation.batteryStatus')
    .isIn(['Original', 'Refurbished', 'Second Life', 'Recycled'])
    .withMessage('Invalid battery status'),
  body('data.generalInformation.manufacturingDate')
    .isISO8601()
    .withMessage('Invalid manufacturing date'),
  body('data.generalInformation.manufacturerInformation.manufacturerName')
    .notEmpty()
    .withMessage('Manufacturer name is required'),
  body('data.generalInformation.manufacturerInformation.manufacturerIdentifier')
    .notEmpty()
    .withMessage('Manufacturer identifier is required'),
  body('data.materialComposition.batteryChemistry')
    .notEmpty()
    .withMessage('Battery chemistry is required'),
  body('data.carbonFootprint.totalCarbonFootprint')
    .isNumeric()
    .withMessage('Total carbon footprint must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total carbon footprint must be positive'),
  body('data.carbonFootprint.methodology')
    .notEmpty()
    .withMessage('Methodology is required')
];

const updatePassportValidation = [
  body('data.generalInformation.batteryMass')
    .optional()
    .isNumeric()
    .withMessage('Battery mass must be a number')
    .isFloat({ min: 0 })
    .withMessage('Battery mass must be positive'),
  body('data.generalInformation.batteryCategory')
    .optional()
    .isIn(['EV', 'Consumer Electronics', 'Industrial', 'Energy Storage', 'Other'])
    .withMessage('Invalid battery category'),
  body('data.generalInformation.batteryStatus')
    .optional()
    .isIn(['Original', 'Refurbished', 'Second Life', 'Recycled'])
    .withMessage('Invalid battery status'),
  body('data.carbonFootprint.totalCarbonFootprint')
    .optional()
    .isNumeric()
    .withMessage('Total carbon footprint must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total carbon footprint must be positive')
];

module.exports = {
  createPassportValidation,
  updatePassportValidation
};