const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
router.use(authenticate);

// ── CONTACTS ──────────────────────────────────────────────────────────────────
router.get('/contacts', hasPermission('view_sales'), async (req, res) => {
  try {
    const { search } = req.query;
    const where = { isActive: true };
    if (search) where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
    const contacts = await prisma.contact.findMany({
      where,
      include: { account: { select: { name: true } }, _count: { select: { leads: true, activities: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: contacts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/contacts/:id', hasPermission('view_sales'), async (req, res) => {
  try {
    const c = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { account: true, leads: true, activities: { orderBy: { createdAt: 'desc' }, take: 10 }, invoices: { take: 5 } }
    });
    res.json({ success: true, data: c });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/contacts', hasPermission('view_sales'), async (req, res) => {
  try {
    const c = await prisma.contact.create({ data: { ...req.body, createdById: req.user.id } });
    res.status(201).json({ success: true, data: c });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/contacts/:id', hasPermission('view_sales'), async (req, res) => {
  try {
    const c = await prisma.contact.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: c });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
router.get('/accounts', hasPermission('view_sales'), async (req, res) => {
  try {
    const { search } = req.query;
    const where = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const accounts = await prisma.account.findMany({
      where,
      include: { _count: { select: { contacts: true, deals: true, invoices: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: accounts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/accounts/:id', hasPermission('view_sales'), async (req, res) => {
  try {
    const a = await prisma.account.findUnique({
      where: { id: req.params.id },
      include: { contacts: true, deals: true, leads: true, invoices: { take: 5 } }
    });
    res.json({ success: true, data: a });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/accounts', hasPermission('view_sales'), async (req, res) => {
  try {
    const a = await prisma.account.create({ data: { ...req.body, createdById: req.user.id } });
    res.status(201).json({ success: true, data: a });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/accounts/:id', hasPermission('view_sales'), async (req, res) => {
  try {
    const a = await prisma.account.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: a });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── LEADS ─────────────────────────────────────────────────────────────────────
router.get('/leads', hasPermission('view_sales'), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 25 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
    if (req.user.role === 'SALES_AGENT') where.assignedToId = req.user.id;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          contact: { select: { firstName: true, lastName: true } },
          account: { select: { name: true } },
          _count: { select: { activities: true, deals: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.lead.count({ where })
    ]);
    res.json({ success: true, data: leads, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/leads/:id', hasPermission('view_sales'), async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { name: true, email: true } },
        createdBy: { select: { name: true } },
        contact: true, account: true,
        activities: { orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } },
        deals: true,
        documents: true
      }
    });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/leads', hasPermission('create_leads'), async (req, res) => {
  try {
    const aiScore = Math.floor(Math.random() * 40) + 40; // Simulated; replace with real AI in production
    const lead = await prisma.lead.create({
      data: { ...req.body, createdById: req.user.id, assignedToId: req.body.assignedToId || req.user.id, aiScore }
    });
    res.status(201).json({ success: true, data: lead });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/leads/:id', hasPermission('update_leads'), async (req, res) => {
  try {
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: lead });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/leads/:id', hasPermission('manage_sales'), async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── DEALS ─────────────────────────────────────────────────────────────────────
router.get('/deals', hasPermission('view_sales'), async (req, res) => {
  try {
    const { stage } = req.query;
    const where = {};
    if (stage) where.stage = stage;
    if (req.user.role === 'SALES_AGENT') where.assignedToId = req.user.id;
    const deals = await prisma.deal.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        lead: { select: { fullName: true, company: true } },
        account: { select: { name: true } },
        _count: { select: { activities: true, quotes: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: deals });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/deals', hasPermission('create_deals'), async (req, res) => {
  try {
    const deal = await prisma.deal.create({ data: { ...req.body, assignedToId: req.body.assignedToId || req.user.id } });
    res.status(201).json({ success: true, data: deal });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/deals/:id', hasPermission('manage_sales'), async (req, res) => {
  try {
    if (req.body.stage === 'CLOSED_WON') req.body.actualClose = new Date();
    const deal = await prisma.deal.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: deal });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── QUOTES ────────────────────────────────────────────────────────────────────
router.get('/quotes', hasPermission('view_sales'), async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      include: { deal: { select: { title: true } }, contact: { select: { firstName: true, lastName: true } }, lineItems: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: quotes });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/quotes/:id', hasPermission('view_sales'), async (req, res) => {
  try {
    const q = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { deal: true, contact: true, account: true, lineItems: { include: { product: true } }, createdBy: { select: { name: true } } }
    });
    res.json({ success: true, data: q });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/quotes', hasPermission('create_deals'), async (req, res) => {
  try {
    const count = await prisma.quote.count();
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const { lineItems = [], ...data } = req.body;
    const subtotal = lineItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice) * (1 - (Number(i.discount || 0) / 100))), 0);
    const taxRate = Number(data.taxRate || 7.5);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - Number(data.discount || 0);
    const q = await prisma.quote.create({
      data: { ...data, quoteNumber, subtotal, taxAmount, total, createdById: req.user.id, lineItems: { create: lineItems.map(i => ({ productId: i.productId || null, description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discount: Number(i.discount || 0), total: Number(i.quantity) * Number(i.unitPrice) })) } },
      include: { lineItems: true }
    });
    res.status(201).json({ success: true, data: q });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/quotes/:id', hasPermission('manage_sales'), async (req, res) => {
  try {
    const q = await prisma.quote.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: q });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── ACTIVITIES ────────────────────────────────────────────────────────────────
router.get('/activities', hasPermission('view_sales'), async (req, res) => {
  try {
    const { leadId, dealId, contactId } = req.query;
    const where = {};
    if (leadId) where.leadId = leadId;
    if (dealId) where.dealId = dealId;
    if (contactId) where.contactId = contactId;
    const acts = await prisma.activity.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, data: acts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/activities', hasPermission('view_sales'), async (req, res) => {
  try {
    const act = await prisma.activity.create({ data: { ...req.body, userId: req.user.id } });
    res.status(201).json({ success: true, data: act });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── TASKS ─────────────────────────────────────────────────────────────────────
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.id },
      include: { creator: { select: { name: true } } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }]
    });
    res.json({ success: true, data: tasks });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/tasks', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.create({ data: { ...req.body, creatorId: req.user.id } });
    res.status(201).json({ success: true, data: task });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/tasks/:id', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: task });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
router.get('/stats', hasPermission('view_sales'), async (req, res) => {
  try {
    const agentFilter = req.user.role === 'SALES_AGENT' ? { assignedToId: req.user.id } : {};
    const [totalLeads, newLeads, totalDeals, closedWon, totalRevenue, pipelineValue] = await Promise.all([
      prisma.lead.count({ where: agentFilter }),
      prisma.lead.count({ where: { ...agentFilter, status: 'NEW' } }),
      prisma.deal.count({ where: agentFilter }),
      prisma.deal.count({ where: { ...agentFilter, stage: 'CLOSED_WON' } }),
      prisma.deal.aggregate({ where: { ...agentFilter, stage: 'CLOSED_WON' }, _sum: { value: true } }),
      prisma.deal.aggregate({ where: { ...agentFilter, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } }, _sum: { value: true } }),
    ]);
    res.json({ success: true, data: {
      totalLeads, newLeads, totalDeals, closedWon,
      totalRevenue: totalRevenue._sum.value || 0,
      pipelineValue: pipelineValue._sum.value || 0,
      conversionRate: totalDeals > 0 ? ((closedWon / totalDeals) * 100).toFixed(1) : 0
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
