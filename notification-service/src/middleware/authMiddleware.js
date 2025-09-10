const axios = require('axios');
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token locally first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = {
  authenticate
};