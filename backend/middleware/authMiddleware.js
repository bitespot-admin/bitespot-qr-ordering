const jwt = require('jsonwebtoken');

// Protects admin/restaurant routes. Reads the JWT from the HttpOnly
// cookie (never from a header/localStorage), verifies it, and attaches
// the restaurant owner's identity to req.user for downstream controllers.
function protect(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, restaurantId, username }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
}

module.exports = { protect };
