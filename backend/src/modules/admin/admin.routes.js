const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
router.use(authenticate, requireRoles('ADMIN'));

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { permissions: true, staffProfile: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: users.map(({ password, ...u }) => u) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;
    const hashed = await bcrypt.hash(password || 'Admin@1234', 12);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role, department, phone } });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'CREATE_USER', entityType: 'USER', entityId: user.id, newValue: { name, email, role, department }, ipAddress: req.ip } });
    res.status(201).json({ success: true, data: { ...user, password: undefined } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const old = await prisma.user.findUnique({ where: { id: req.params.id } });
    const data = { ...req.body };
    if (data.password) { data.password = await bcrypt.hash(data.password, 12); } else { delete data.password; }
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'UPDATE_USER', entityType: 'USER', entityId: user.id, oldValue: { role: old.role, isActive: old.isActive }, newValue: req.body, ipAddress: req.ip } });
    const { password, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: !user.isActive } });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'TOGGLE_USER_ACTIVE', entityType: 'USER', entityId: req.params.id, oldValue: { isActive: user.isActive }, newValue: { isActive: updated.isActive }, ipAddress: req.ip } });
    res.json({ success: true, data: { isActive: updated.isActive } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/permissions/:userId', async (req, res) => {
  try {
    const perms = await prisma.permission.findMany({ where: { userId: req.params.userId } });
    res.json({ success: true, data: perms });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/permissions/toggle', async (req, res) => {
  try {
    const { userId, featureKey, isEnabled } = req.body;
    const old = await prisma.permission.findUnique({ where: { userId_featureKey: { userId, featureKey } } });
    const perm = await prisma.permission.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      update: { isEnabled },
      create: { userId, featureKey, isEnabled }
    });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PERMISSION_TOGGLE', entityType: 'PERMISSION', entityId: userId, oldValue: { featureKey, isEnabled: old?.isEnabled ?? null }, newValue: { featureKey, isEnabled }, ipAddress: req.ip } });
    res.json({ success: true, data: perm });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const { entityType, action, userId: filterUser } = req.query;
    const where = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (filterUser) where.userId = filterUser;
    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json({ success: true, data: logs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/system-settings', async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json({ success: true, data: map });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/system-settings', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await prisma.systemSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const [users, active, logs, perms] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 30*86400000) } } }),
      prisma.permission.count({ where: { isEnabled: true } }),
    ]);
    res.json({ success: true, data: { totalUsers: users, activeUsers: active, auditEvents30d: logs, activePermissionOverrides: perms } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
