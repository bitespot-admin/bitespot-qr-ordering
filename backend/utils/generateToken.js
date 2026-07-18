const jwt = require('jsonwebtoken');

// Signs a JWT and drops it into an HttpOnly cookie. The token is never
// sent to the client as JSON and never touches localStorage — this is
// the one place it's issued. `cookieName` defaults to the restaurant
// owner's cookie; super admin sessions pass 'super_token' instead so
// the two kinds of session can never collide in the same browser.
function generateToken(res, payload, cookieName = 'token') {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
}

module.exports = generateToken;
