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

// ================= NEW: REGISTER WITH DUPLICATE DETECTION =================

const register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    // DUPLICATE DETECTION - Email (case-insensitive)
    const existingEmail = await prisma.user.findFirst({
      where: { 
        email: { equals: email.toLowerCase(), mode: 'insensitive' } 
      }
    });

    if (existingEmail) {
      return res.status(409).json({ 
        success: false,
        error: 'Duplicate email',
        message: 'This email address is already registered. Please use a different email or login to your existing account.'
      });
    }

    // DUPLICATE DETECTION - Name (case-insensitive)
    const existingName = await prisma.user.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' } 
      }
    });

    if (existingName) {
      return res.status(409).json({ 
        success: false,
        error: 'Duplicate name',
        message: 'A user with this name already exists. Please use a different name.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'SALES_AGENT',
        department: department || 'SALES'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        entityType: 'USER',
        entityId: user.id,
        newValue: { name, email, role, department },
        ipAddress: req.ip
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful',
      data: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { login, refreshToken, getMe, register };