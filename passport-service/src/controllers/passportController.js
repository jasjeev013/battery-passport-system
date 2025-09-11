const { validationResult } = require('express-validator');
const BatteryPassport = require('../models/BatteryPassport');
const { sendEvent } = require('../config/kafka');

// Create a new battery passport
const createPassport = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { data } = req.body;

    // Check if battery identifier already exists
    const existingPassport = await BatteryPassport.findOne({
      'data.generalInformation.batteryIdentifier': data.generalInformation.batteryIdentifier
    });

    if (existingPassport) {
      return res.status(400).json({
        message: 'Battery passport with this identifier already exists'
      });
    }

    // Create new battery passport
    const passport = new BatteryPassport({
      data,
      createdBy: req.user.userId
    });

    await passport.save();

    await sendEvent('passport.created', {
      passportId: passport._id,
      batteryIdentifier: passport.data.generalInformation.batteryIdentifier,
      modelName: passport.data.generalInformation.batteryModel.modelName,
      manufacturerName: passport.data.generalInformation.manufacturerInformation.manufacturerName,
      createdBy: req.user.userId,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Battery passport created successfully',
      passport
    });
  } catch (error) {
    console.error('Create passport error:', error);
    res.status(500).json({ message: 'Server error during passport creation' });
  }
};

// Get passport by ID
const getPassport = async (req, res) => {
  try {
    const { id } = req.params;

    const passport = await BatteryPassport.findById(id).populate('createdBy', 'email role');

    if (!passport) {
      return res.status(404).json({ message: 'Battery passport not found' });
    }

    // Check if user has access (admin or owner)
    if (req.user.role !== 'admin' && passport.createdBy._id.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own passports.'
      });
    }

    res.json({
      message: 'Battery passport retrieved successfully',
      passport
    });
  } catch (error) {
    console.error('Get passport error:', error);
    res.status(500).json({ message: 'Server error during passport retrieval' });
  }
};

// Get all passports (admin only) or user's own passports
const getAllPassports = async (req, res) => {
  try {
    let query = { isActive: true };

    // If user is not admin, only show their own passports
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.userId;
    }

    const passports = await BatteryPassport.find(query)
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Passports retrieved successfully',
      count: passports.length,
      passports
    });
  } catch (error) {
    console.error('Get all passports error:', error);
    res.status(500).json({ message: 'Server error during passports retrieval' });
  }
};

// Update passport by ID
const updatePassport = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    const passport = await BatteryPassport.findById(id);

    if (!passport) {
      return res.status(404).json({ message: 'Battery passport not found' });
    }

    // Check if user is admin or the creator
    if (req.user.role !== 'admin' && passport.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'Access denied. You can only update your own passports.'
      });
    }

    // Update passport
    const updatedPassport = await BatteryPassport.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'email role');

    await sendEvent('passport.updated', {
      passportId: updatedPassport._id,
      batteryIdentifier: updatedPassport.data.generalInformation.batteryIdentifier,
      updatedBy: req.user.userId,
      updatedAt: new Date().toISOString(),
      updatedFields: Object.keys(updateData)
    });

    res.json({
      message: 'Battery passport updated successfully',
      passport: updatedPassport
    });
  } catch (error) {
    console.error('Update passport error:', error);
    res.status(500).json({ message: 'Server error during passport update' });
  }
};

// Delete passport by ID (soft delete)
const deletePassport = async (req, res) => {
  try {
    const { id } = req.params;

    const passport = await BatteryPassport.findById(id);

    if (!passport) {
      return res.status(404).json({ message: 'Battery passport not found' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Only admin can delete passports.'
      });
    }

    // Soft delete by setting isActive to false
    await BatteryPassport.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedAt: Date.now()
      }
    );

    await sendEvent('passport.deleted', {
      passportId: id,
      batteryIdentifier: passport.data.generalInformation.batteryIdentifier,
      deletedBy: req.user.userId,
      deletedAt: new Date().toISOString()
    });

    res.json({
      message: 'Battery passport deleted successfully'
    });
  } catch (error) {
    console.error('Delete passport error:', error);
    res.status(500).json({ message: 'Server error during passport deletion' });
  }
};

module.exports = {
  createPassport,
  getPassport,
  getAllPassports,
  updatePassport,
  deletePassport
};