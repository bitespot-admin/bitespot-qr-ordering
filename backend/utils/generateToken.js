const jwt = require('jsonwebtoken');

// Signs a JWT for a restaurant owner and drops it into an HttpOnly cookie.
// The token is never sent to the client as JSON and never touches
// localStorage — this is the one place it's issued.
function generateToken(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
}

module.exports = generateToken;
