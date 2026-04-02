const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/orders', hasPermission('view_logistics'), async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.OR = [{ orderNumber: { contains: search, mode: 'insensitive' } }, { customerName: { contains: search, mode: 'insensitive' } }];
    const orders = await prisma.order.findMany({ where, include: { items: { include: { product: { select: { name: true, sku: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: orders });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/orders', hasPermission('view_logistics'), async (req, res) => {
  try {
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const order = await prisma.order.create({ data: { ...req.body, orderNumber } });
    res.status(201).json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/orders/:id', hasPermission('update_orders'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.status === 'DISPATCHED') data.dispatchedAt = new Date();
    if (data.status === 'DELIVERED') data.deliveredAt = new Date();
    const order = await prisma.order.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', hasPermission('view_logistics'), async (req, res) => {
  try {
    const [total, pending, inTransit, delivered, returned] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'RETURNED' } }),
    ]);
    res.json({ success: true, data: { total, pending, inTransit, delivered, returned, deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0 } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
