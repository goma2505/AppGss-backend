import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Authentication middleware
export const auth = async (req, res, next) => {
  try {
    // Support both x-auth-token and Authorization Bearer formats
    let token = req.header('x-auth-token');
    
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_jwt_secret');

    // Try to fetch user from MongoDB; if not found, fallback to token payload (in-memory user scenario)
    let user = null;
    try {
      user = await User.findById(decoded.user.id).select('-password');
    } catch (e) {
      user = null;
    }

    if (user) {
      req.user = user;
    } else {
      // Fallback: use the decoded token info to set minimal user context
      // Ensures routes requiring req.user.role / req.user.id keep working with in-memory accounts
      req.user = {
        id: decoded.user.id,
        _id: decoded.user.id,
        role: decoded.user.role,
        name: decoded.user.name,
        email: decoded.user.email,
      };
    }

    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Admin authentication middleware
export const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: 'Not authorized' });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'administrador') {
    return res.status(403).json({ msg: 'Access denied: admin privileges required' });
  }
  
  next();
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access denied: insufficient permissions' });
    }
    
    next();
  };
};

// Require admin middleware (alternative name)
export const requireAdmin = adminAuth;

// Default export for backward compatibility
export default auth;