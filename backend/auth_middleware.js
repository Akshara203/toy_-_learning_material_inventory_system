import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'preschool_secret_key_change_me_938173';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    
    req.user = user;
    next();
  });
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Missing user authentication session' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: `Forbidden: This action requires one of the following roles: [${roles.join(', ')}]. Your role is ${req.user.role}.` 
      });
      return;
    }

    next();
  };
}

export { JWT_SECRET };
