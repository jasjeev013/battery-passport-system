const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('Role must be either admin or user')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected test route (optional)
router.get('/profile', authenticate, (req, res) => {
  res.json({
    message: 'Profile accessed successfully',
    user: req.user
  });
});

// Admin only test route (optional)
router.get('/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({
    message: 'Admin route accessed successfully',
    user: req.user
  });
});

module.exports = router;