const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Token ausente ou mal formatado' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(400).json({ error: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segredo_dev');
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = authMiddleware;