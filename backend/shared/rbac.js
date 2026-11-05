const jwt = require('jsonwebtoken');
const Admin = require('../modules/users/admin.model');
const Cadet = require('../modules/users/cadet.model');

/**
 * authenticate — verifies the Bearer JWT from the Authorization header,
 * loads the full Admin or Cadet document, and attaches it to `req.user`.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid or expired token.' });
    }

    let user = null;
    let userType = decoded.userType;

    if (userType === 'admin') {
      user = await Admin.findById(decoded.id);
    } else if (userType === 'cadet') {
      user = await Cadet.findById(decoded.id);
    } else {
      // Graceful fallback for tokens without explicit userType
      user = await Admin.findById(decoded.id);
      if (user) {
        userType = 'admin';
      } else {
        user = await Cadet.findById(decoded.id);
        if (user) userType = 'cadet';
      }
    }

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User belonging to this token no longer exists.' });
    }

    if (user.status === 'suspended') {
      return res
        .status(403)
        .json({ success: false, message: 'Account suspended. Contact your CTO.' });
    }

    req.user = user;
    req.userType = userType || (user.roles?.includes('lead_admin') || user.roles?.includes('cto') ? 'admin' : 'cadet');
    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: 'Authentication error.' });
  }
}

/**
 * authorize — role-based gate.
 * Usage: `authorize('lead_admin', 'cto')`
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required.' });
    }

    const hasRole = req.user.roles?.some((r) => roles.includes(r));
    if (!hasRole) {
      return res
        .status(403)
        .json({ success: false, message: 'You do not have permission to perform this action.' });
    }

    next();
  };
}

/**
 * authorizePermission — fine-grained permission gate.
 * Lead admin and CTO bypass this check entirely.
 */
function authorizePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required.' });
    }

    const bypassRoles = ['lead_admin', 'cto'];
    if (req.user.roles?.some((r) => bypassRoles.includes(r))) {
      return next();
    }

    const hasPermission = req.user.permissions?.some((p) => permissions.includes(p));
    if (!hasPermission) {
      return res
        .status(403)
        .json({ success: false, message: 'You do not have the required permission.' });
    }

    next();
  };
}

/**
 * requireLeadOrCTO — gates access to Lead Admin or CTO only.
 */
function requireLeadOrCTO(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const roles = Array.isArray(req.user.roles)
    ? req.user.roles
    : req.user.role
    ? [req.user.role]
    : [];
  const isLead = roles.includes('lead_admin');
  const isCTO = roles.includes('cto');
  if (!isLead && !isCTO) {
    return res.status(403).json({ success: false, message: 'CTO or Lead Admin access required.' });
  }
  next();
}

/**
 * requireSUOOrAbove — gates access to Senior Under Officer (SUO), CTO, or Lead Admin.
 * Enforces: "Permission follows rank, not account type — a cadet who becomes SUO gains powers".
 */
function requireSUOOrAbove(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const roles = Array.isArray(req.user.roles)
    ? req.user.roles
    : req.user.role
    ? [req.user.role]
    : [];
  const isLead = roles.includes('lead_admin');
  const isCTO = roles.includes('cto');
  const isSUO = req.user.rank === 'SUO';

  if (!isLead && !isCTO && !isSUO) {
    return res
      .status(403)
      .json({ success: false, message: 'SUO, CTO, or Lead Admin authorization required.' });
  }
  next();
}

/**
 * scopeToUnit — sets `req.unitFilter` and `req.effectiveUnit` based on the user's unit.
 * For lead_admin, respects the `x-active-unit` header or defaults to user's unit.
 */
function scopeToUnit(req, res, next) {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.roles?.includes('lead_admin')) {
    const activeUnit = req.headers['x-active-unit'];
    req.unitFilter = activeUnit ? { unit: activeUnit } : {};
    req.effectiveUnit = activeUnit || req.user.unit || '3AB';
  } else {
    req.unitFilter = { unit: req.user.unit };
    req.effectiveUnit = req.user.unit;
  }

  next();
}

module.exports = {
  authenticate,
  authorize,
  authorizePermission,
  requireLeadOrCTO,
  requireSUOOrAbove,
  scopeToUnit,
};
