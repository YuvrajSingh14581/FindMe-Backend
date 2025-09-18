import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log('Auth Header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Authorization header missing or malformed');
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  console.log('Token:', token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    const user = await User.findById(decoded.id).select('-password');
    console.log('User found:', user);
    if (!user) {
      console.log('User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    console.log('User attached to req:', req.user);
    next();
  } catch (error) {
    console.log('JWT verification error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('AuthorizeRoles - User role:', req.user?.role);
    console.log('AuthorizeRoles - Required roles:', roles);
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('Forbidden: Insufficient permissions');
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    console.log('Role authorized, proceeding...');
    next();
  };
};
