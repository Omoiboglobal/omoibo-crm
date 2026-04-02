// executive.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
router.use(authenticate, requireRoles('ADMIN', 'CEO', 'COO'));

router.get('/dashboard', async (req, res) => {
  try {
    const [leads, deals, closedWon, revenue, expenses, orders, delivered, products, staff, assets] = await Promise.all([
      prisma.lead.count(),
      prisma.deal.count(),
      prisma.deal.count({ where: { stage: 'CLOSED_WON' } }),
      prisma.transaction.aggregate({ where: { type: 'INCOME' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.product.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.asset.aggregate({ _sum: { currentValue: true } }),
    ]);
    const totalRevenue = revenue._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    res.json({ success: true, data: {
      sales: { totalLeads: leads, totalDeals: deals, closedWon, conversionRate: deals > 0 ? ((closedWon / deals) * 100).toFixed(1) : 0 },
      finance: { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, profitMargin: totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : 0 },
      logistics: { totalOrders: orders, delivered, deliveryRate: orders > 0 ? ((delivered / orders) * 100).toFixed(1) : 0 },
      inventory: { totalProducts: products },
      hr: { activeStaff: staff },
      facility: { totalAssetValue: assets._sum.currentValue || 0 },
    }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
