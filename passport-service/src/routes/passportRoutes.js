const express = require('express');
const { 
  createPassport, 
  getPassport, 
  getAllPassports, 
  updatePassport, 
  deletePassport 
} = require('../controllers/passportController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { createPassportValidation, updatePassportValidation } = require('../utils/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', authorize('admin'), createPassportValidation, createPassport);
router.get('/', getAllPassports);
router.get('/:id', getPassport);
router.put('/:id', authorize('admin'), updatePassportValidation, updatePassport);
router.delete('/:id', authorize('admin'), deletePassport);

module.exports = router;