function requireAuth(req, res, next) {
  if (!req.session || !req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

module.exports = { requireAuth };
