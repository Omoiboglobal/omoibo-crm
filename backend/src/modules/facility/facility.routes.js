const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
router.use(authenticate);

router.get('/assets', hasPermission('view_facility'), async (req, res) => {
  const assets = await prisma.asset.findMany({ include: { maintenanceLogs: { orderBy: { performedAt: 'desc' }, take: 3 } }, orderBy: { name: 'asc' } });
  res.json({ success: true, data: assets });
});

router.post('/assets', hasPermission('manage_facility'), async (req, res) => {
  try {
    const asset = await prisma.asset.create({ data: req.body });
    res.status(201).json({ success: true, data: asset });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/assets/:id', hasPermission('update_assets'), async (req, res) => {
  try {
    const asset = await prisma.asset.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: asset });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/assets/:id/maintenance', hasPermission('update_assets'), async (req, res) => {
  try {
    const log = await prisma.maintenanceLog.create({ data: { assetId: req.params.id, ...req.body } });
    res.status(201).json({ success: true, data: log });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', hasPermission('view_facility'), async (req, res) => {
  const [total, active, maintenance, decommissioned, totalValue] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: 'ACTIVE' } }),
    prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
    prisma.asset.count({ where: { status: 'DECOMMISSIONED' } }),
    prisma.asset.aggregate({ _sum: { currentValue: true } }),
  ]);
  res.json({ success: true, data: { total, active, maintenance, decommissioned, totalValue: totalValue._sum.currentValue || 0 } });
});

module.exports = router;
