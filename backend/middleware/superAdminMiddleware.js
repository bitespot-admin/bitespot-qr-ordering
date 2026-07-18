const jwt = require('jsonwebtoken');

// Deliberately a separate cookie name from the restaurant-owner "token"
// cookie, so a browser can't accidentally mix up a super admin session
// with a restaurant admin session (e.g. testing both in one browser).
function protectSuperAdmin(req, res, next) {
  const token = req.cookies.super_token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    req.superAdmin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
}

module.exports = { protectSuperAdmin };
