const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nieautoryzowany dostęp' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Brak uprawnień do tej akcji' });
    }

    next();
  };
};

// Dla wielu ról (admin lub manager)
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nieautoryzowany dostęp' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak uprawnień do tej akcji' });
    }

    next();
  };
};

module.exports = { requireRole, requireAnyRole };