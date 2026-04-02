const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
router.use(authenticate);

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, department: true, isActive: true, createdAt: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, data: users });
});

router.get('/notifications', async (req, res) => {
  const notes = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 20 });
  res.json({ success: true, data: notes });
});

router.put('/notifications/:id/read', async (req, res) => {
  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ success: true });
});

module.exports = router;
