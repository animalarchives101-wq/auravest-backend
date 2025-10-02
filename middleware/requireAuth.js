const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.sid;

  if (!token) {
    console.log("[AUTH] No sid cookie found");
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Log a safe subset (avoid logging full token)
    console.log("[AUTH] sid cookie present ✓");
    console.log("[AUTH] decoded:", {
      sub: decoded.sub,
      iat: decoded.iat,
      exp: decoded.exp,
      ...(decoded.email ? { email: decoded.email } : {})
    });

    req.user = decoded; // e.g. { sub: "<userId>", ... }
    return next();
  } catch (err) {
    // Distinguish errors to help debugging
    if (err.name === 'TokenExpiredError') {
      console.log("[AUTH] JWT expired:", err.expiredAt);
      return res.status(401).json({ message: 'Session expired' });
    }
    console.log("[AUTH] JWT verify failed:", err.message);
    return res.status(401).json({ message: 'Unauthenticated' });
  }
}

module.exports = requireAuth;
