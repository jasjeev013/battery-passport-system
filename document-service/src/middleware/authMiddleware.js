const axios = require('axios');
const { verifyToken } = require('../utils/jwtUtils');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token locally first
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      return next();
    } catch (localError) {
      console.log('Local token verification failed, trying auth service...');
    }

    // If local verification fails, call auth service
    try {
      const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      req.user = response.data.user;
      next();
    } catch (authError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};