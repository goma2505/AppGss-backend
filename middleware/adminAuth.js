const adminAuth = (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({ msg: 'Access denied. No user found.' });
    }

    // Verificar que el usuario tenga permisos de administrador
    const adminRoles = ['admin', 'administrador', 'manager', 'supervisor'];
    if (!adminRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: 'Access denied. Administrator privileges required.',
        userRole: req.user.role,
        requiredRoles: adminRoles
      });
    }

    next();
  } catch (err) {
    console.error('Admin auth middleware error:', err);
    res.status(500).json({ msg: 'Server error in admin authentication' });
  }
};

export default adminAuth;