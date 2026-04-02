const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateTokens = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, refreshToken };
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email }, include: { permissions: true } });
    if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const { token, refreshToken } = generateTokens(user.id);
    const { password: _, ...userSafe } = user;

    // Log login
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entityType: 'USER', entityId: user.id, ipAddress: req.ip } });

    res.json({ success: true, data: { user: userSafe, token, refreshToken } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const tokens = generateTokens(decoded.userId);
    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

const getMe = async (req, res) => {
  const { password: _, ...user } = req.user;
  res.json({ success: true, data: user });
};

module.exports = { login, refreshToken, getMe };
