const express = require('express');
const router = express.Router();
const { authenticate, hasPermission, requireRoles } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
router.use(authenticate);

// helpers
async function notif(userId, title, message, type='INFO', actionUrl=null) {
  try { await prisma.notification.create({ data: { userId, title, message, type, actionUrl } }); } catch {}
}
async function audit(userId, action, entityType, entityId, oldValue, newValue, req) {
  try { await prisma.auditLog.create({ data: { userId, action, entityType, entityId, oldValue, newValue, ipAddress: req?.ip } }); } catch {}
}
function nextNumber(prefix, count) {
  return `${prefix}-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
}

// ── CHART OF ACCOUNTS ─────────────────────────────────────────────────────────
router.get('/accounts', hasPermission('view_finance'), async (req, res) => {
  try {
    const accounts = await prisma.chartOfAccounts.findMany({ orderBy: { code: 'asc' } });
    res.json({ success: true, data: accounts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/accounts', requireRoles('ADMIN','FINANCE_MANAGER'), async (req, res) => {
  try {
    const account = await prisma.chartOfAccounts.create({ data: req.body });
    res.status(201).json({ success: true, data: account });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/accounts/:id', requireRoles('ADMIN','FINANCE_MANAGER'), async (req, res) => {
  try {
    const account = await prisma.chartOfAccounts.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: account });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── INVOICES ──────────────────────────────────────────────────────────────────
router.get('/invoices', hasPermission('view_finance'), async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { invoiceNumber: { contains: search, mode:'insensitive' } },
      { contact: { firstName: { contains: search, mode:'insensitive' } } },
    ];
    const invoices = await prisma.invoice.findMany({
      where, orderBy: { createdAt:'desc' },
      include: {
        contact: { select: { firstName:true, lastName:true, email:true } },
        account: { select: { name:true } },
        lineItems: true, payments: true,
        createdBy: { select: { name:true } }
      }
    });
    res.json({ success: true, data: invoices });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/invoices/:id', hasPermission('view_finance'), async (req, res) => {
  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        contact: true, account: true,
        lineItems: { include: { product: true } },
        payments: { include: { recordedBy: { select: { name:true } } } },
        createdBy: { select: { name:true } }
      }
    });
    if (!inv) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: inv });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/invoices', hasPermission('create_transactions'), async (req, res) => {
  try {
    const { lineItems = [], ...data } = req.body;
    const count = await prisma.invoice.count();
    const invoiceNumber = nextNumber('INV', count);
    const subtotal = lineItems.reduce((s,i) => s + (Number(i.quantity)*Number(i.unitPrice)*(1-(Number(i.discount||0)/100))), 0);
    const taxRate = Number(data.taxRate||7.5);
    const taxAmount = subtotal*(taxRate/100);
    const discount = Number(data.discount||0);
    const total = subtotal+taxAmount-discount;
    const inv = await prisma.invoice.create({
      data: {
        ...data, invoiceNumber, subtotal, taxRate, taxAmount, discount, total,
        amountDue: total,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now()+30*86400000),
        createdById: req.user.id,
        lineItems: { create: lineItems.map(i => ({
          productId: i.productId||null, description: i.description,
          quantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
          discount: Number(i.discount||0), taxRate: Number(i.taxRate||taxRate),
          total: Number(i.quantity)*Number(i.unitPrice)*(1-(Number(i.discount||0)/100))
        })) }
      },
      include: { lineItems: true, contact: true }
    });
    await audit(req.user.id,'CREATE_INVOICE','INVOICE',inv.id,null,{invoiceNumber,total},req);
    res.status(201).json({ success: true, data: inv });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/invoices/:id', hasPermission('manage_finance'), async (req, res) => {
  try {
    const inv = await prisma.invoice.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: inv });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/invoices/:id/send', hasPermission('manage_finance'), async (req, res) => {
  try {
    const inv = await prisma.invoice.update({ where: { id: req.params.id }, data: { status:'SENT', sentAt: new Date() } });
    await notif(inv.createdById, 'Invoice Sent', `Invoice ${inv.invoiceNumber} sent`, 'SUCCESS');
    res.json({ success: true, data: inv });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/invoices/:id/void', hasPermission('manage_finance'), async (req, res) => {
  try {
    const inv = await prisma.invoice.update({ where: { id: req.params.id }, data: { status:'VOID' } });
    res.json({ success: true, data: inv });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── BILLS (ACCOUNTS PAYABLE) ──────────────────────────────────────────────────
router.get('/bills', hasPermission('view_finance'), async (req, res) => {
  try {
    const { status } = req.query;
    const bills = await prisma.bill.findMany({
      where: status ? { status } : {},
      include: { supplier: { select: { name:true } }, lineItems: true, payments: true, createdBy: { select: { name:true } } },
      orderBy: { createdAt:'desc' }
    });
    res.json({ success: true, data: bills });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/bills/:id', hasPermission('view_finance'), async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, lineItems: { include: { product: true } }, payments: true }
    });
    res.json({ success: true, data: bill });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/bills', hasPermission('create_transactions'), async (req, res) => {
  try {
    const { lineItems=[], ...data } = req.body;
    const count = await prisma.bill.count();
    const billNumber = nextNumber('BILL', count);
    const subtotal = lineItems.reduce((s,i) => s+(Number(i.quantity)*Number(i.unitPrice)), 0);
    const bill = await prisma.bill.create({
      data: {
        ...data, billNumber, subtotal, total: subtotal, amountDue: subtotal,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now()+30*86400000),
        createdById: req.user.id,
        lineItems: { create: lineItems.map(i => ({
          productId: i.productId||null, description: i.description,
          quantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
          total: Number(i.quantity)*Number(i.unitPrice)
        })) }
      },
      include: { lineItems: true, supplier: true }
    });
    res.status(201).json({ success: true, data: bill });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
router.get('/payments', hasPermission('view_finance'), async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        invoice: { select: { invoiceNumber:true } },
        bill: { select: { billNumber:true } },
        recordedBy: { select: { name:true } }
      },
      orderBy: { createdAt:'desc' }
    });
    res.json({ success: true, data: payments });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/payments', hasPermission('process_payments'), async (req, res) => {
  try {
    const { invoiceId, billId, amount, method, reference, bankName, notes, paymentDate } = req.body;
    const payment = await prisma.payment.create({
      data: { invoiceId:invoiceId||null, billId:billId||null, amount:Number(amount), method, reference, bankName, notes,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(), recordedById: req.user.id }
    });
    if (invoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      const paid = (inv.amountPaid||0)+Number(amount);
      const due = inv.total-paid;
      await prisma.invoice.update({ where: { id: invoiceId }, data: {
        amountPaid: paid, amountDue: Math.max(0,due),
        status: due<=0 ? 'PAID' : paid>0 ? 'PARTIALLY_PAID' : inv.status,
        paidAt: due<=0 ? new Date() : null
      }});
      await notif(inv.createdById, 'Payment Received', `₦${Number(amount).toLocaleString()} recorded on ${inv.invoiceNumber}`, 'SUCCESS');
    }
    if (billId) {
      const bill = await prisma.bill.findUnique({ where: { id: billId } });
      const paid = (bill.amountPaid||0)+Number(amount);
      const due = bill.total-paid;
      await prisma.bill.update({ where: { id: billId }, data: {
        amountPaid: paid, amountDue: Math.max(0,due),
        status: due<=0 ? 'PAID' : 'PARTIALLY_PAID', paidAt: due<=0 ? new Date() : null
      }});
    }
    await audit(req.user.id,'RECORD_PAYMENT','PAYMENT',payment.id,null,{ amount, method, invoiceId, billId },req);
    res.status(201).json({ success: true, data: payment });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PETTY CASH ────────────────────────────────────────────────────────────────
router.get('/petty-cash', authenticate, async (req, res) => {
  try {
    const canSeeAll = ['ADMIN','CEO','COO','FINANCE_MANAGER','FINANCE_OFFICER','ACCOUNTANT'].includes(req.user.role);
    const requests = await prisma.pettyCash.findMany({
      where: canSeeAll ? {} : { requesterId: req.user.id },
      include: { requester: { select: { name:true, department:true, role:true } }, approver: { select: { name:true } } },
      orderBy: { createdAt:'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/petty-cash', authenticate, async (req, res) => {
  try {
    const req_ = await prisma.pettyCash.create({ data: { ...req.body, requesterId: req.user.id } });
    const fms = await prisma.user.findMany({ where: { role: 'FINANCE_MANAGER', isActive: true } });
    for (const fm of fms) await notif(fm.id, 'Petty Cash Request', `New request of ₦${req.body.amount} from ${req.user.name}`, 'WARNING', '/finance/petty-cash');
    res.status(201).json({ success: true, data: req_ });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/petty-cash/:id/approve', hasPermission('approve_petty_cash'), async (req, res) => {
  try {
    const { status, rejectedReason } = req.body;
    const r = await prisma.pettyCash.update({
      where: { id: req.params.id },
      data: { status, approverId: req.user.id, approvedAt: status==='APPROVED' ? new Date() : null, rejectedReason }
    });
    await notif(r.requesterId, `Petty Cash ${status}`, `Your petty cash request has been ${status.toLowerCase()}`, status==='APPROVED'?'SUCCESS':'DANGER');
    res.json({ success: true, data: r });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/petty-cash/:id/disburse', hasPermission('process_payments'), async (req, res) => {
  try {
    const r = await prisma.pettyCash.update({ where: { id: req.params.id }, data: { disbursedAt: new Date(), receiptRef: req.body.receiptRef } });
    res.json({ success: true, data: r });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── BUDGETS ───────────────────────────────────────────────────────────────────
router.get('/budgets', hasPermission('view_finance'), async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({ orderBy: [{ department:'asc' },{ period:'desc' }] });
    res.json({ success: true, data: budgets });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/budgets', requireRoles('ADMIN','FINANCE_MANAGER','COO','CEO'), async (req, res) => {
  try {
    const b = await prisma.budget.create({ data: req.body });
    res.status(201).json({ success: true, data: b });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/budgets/:id', requireRoles('ADMIN','FINANCE_MANAGER','COO','CEO'), async (req, res) => {
  try {
    const b = await prisma.budget.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: b });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
router.get('/transactions', hasPermission('view_finance'), async (req, res) => {
  try {
    const { type } = req.query;
    const txs = await prisma.transaction.findMany({
      where: type ? { type } : {},
      include: { createdBy: { select: { name:true, role:true } }, approvedBy: { select: { name:true } } },
      orderBy: { createdAt:'desc' }, take: 200
    });
    res.json({ success: true, data: txs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/transactions', hasPermission('create_transactions'), async (req, res) => {
  try {
    const tx = await prisma.transaction.create({ data: { ...req.body, createdById: req.user.id } });
    res.status(201).json({ success: true, data: tx });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── BANK ACCOUNTS ─────────────────────────────────────────────────────────────
router.get('/bank-accounts', hasPermission('view_finance'), async (req, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
    res.json({ success: true, data: accounts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/bank-accounts', requireRoles('ADMIN','FINANCE_MANAGER'), async (req, res) => {
  try {
    const a = await prisma.bankAccount.create({ data: req.body });
    res.status(201).json({ success: true, data: a });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── TAX RATES ─────────────────────────────────────────────────────────────────
router.get('/tax-rates', hasPermission('view_finance'), async (req, res) => {
  try {
    const rates = await prisma.taxRate.findMany({ where: { isActive: true } });
    res.json({ success: true, data: rates });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/tax-rates', requireRoles('ADMIN','FINANCE_MANAGER'), async (req, res) => {
  try {
    const r = await prisma.taxRate.create({ data: req.body });
    res.status(201).json({ success: true, data: r });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── REPORTS ───────────────────────────────────────────────────────────────────
router.get('/reports/pl', hasPermission('view_revenue'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const df = {};
    if (from) df.gte = new Date(from);
    if (to) df.lte = new Date(to);
    const hasDates = from || to;
    const [inc, exp, invPaid, billPaid, pc] = await Promise.all([
      prisma.transaction.aggregate({ where: { type:'INCOME', ...(hasDates?{createdAt:df}:{}) }, _sum: { amount:true } }),
      prisma.transaction.aggregate({ where: { type:'EXPENSE', ...(hasDates?{createdAt:df}:{}) }, _sum: { amount:true } }),
      prisma.invoice.aggregate({ where: { status:'PAID', ...(hasDates?{paidAt:df}:{}) }, _sum: { total:true }, _count:true }),
      prisma.bill.aggregate({ where: { status:'PAID', ...(hasDates?{paidAt:df}:{}) }, _sum: { total:true }, _count:true }),
      prisma.pettyCash.aggregate({ where: { status:'APPROVED', disbursedAt:{not:null} }, _sum: { amount:true } }),
    ]);
    const totalRev = (inc._sum.amount||0)+(invPaid._sum.total||0);
    const totalExp = (exp._sum.amount||0)+(billPaid._sum.total||0)+(pc._sum.amount||0);
    const net = totalRev-totalExp;
    res.json({ success:true, data: {
      revenue:{ transactions:inc._sum.amount||0, invoices:invPaid._sum.total||0, total:totalRev },
      expenses:{ transactions:exp._sum.amount||0, bills:billPaid._sum.total||0, pettyCash:pc._sum.amount||0, total:totalExp },
      grossProfit:net, netProfit:net,
      profitMargin: totalRev>0 ? ((net/totalRev)*100).toFixed(2) : '0.00',
      invoiceCount: invPaid._count, billCount: billPaid._count,
      period:{ from: from||'All time', to: to||'Now' }
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/reports/ar-aging', hasPermission('view_finance'), async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['SENT','PARTIALLY_PAID','OVERDUE'] } },
      include: { contact: { select:{ firstName:true, lastName:true } }, account: { select:{ name:true } } }
    });
    const now = new Date();
    const buckets = { current:[], '1_30':[], '31_60':[], '61_90':[], over_90:[] };
    for (const i of invoices) {
      const d = i.dueDate ? Math.floor((now-new Date(i.dueDate))/86400000) : 0;
      if (d<=0) buckets.current.push({...i,daysPast:d});
      else if (d<=30) buckets['1_30'].push({...i,daysPast:d});
      else if (d<=60) buckets['31_60'].push({...i,daysPast:d});
      else if (d<=90) buckets['61_90'].push({...i,daysPast:d});
      else buckets.over_90.push({...i,daysPast:d});
    }
    const summary = Object.entries(buckets).map(([k,v])=>({ period:k, count:v.length, total:v.reduce((s,i)=>s+i.amountDue,0), items:v }));
    res.json({ success:true, data: summary });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/reports/cash-flow', hasPermission('view_revenue'), async (req, res) => {
  try {
    const months = [];
    for (let i=5; i>=0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth()+1, 0);
      const [inflow, outflow] = await Promise.all([
        prisma.payment.aggregate({ where:{ invoiceId:{not:null}, paymentDate:{gte:start,lte:end} }, _sum:{amount:true} }),
        prisma.payment.aggregate({ where:{ billId:{not:null}, paymentDate:{gte:start,lte:end} }, _sum:{amount:true} }),
      ]);
      months.push({ month: d.toLocaleString('default',{month:'short',year:'2-digit'}), inflow:inflow._sum.amount||0, outflow:outflow._sum.amount||0, net:(inflow._sum.amount||0)-(outflow._sum.amount||0) });
    }
    res.json({ success:true, data: months });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/reports/balance-sheet', hasPermission('view_revenue'), async (req, res) => {
  try {
    const [ar, ap, invPaid, billPaid, assets] = await Promise.all([
      prisma.invoice.aggregate({ where:{ status:{in:['SENT','PARTIALLY_PAID','OVERDUE']} }, _sum:{amountDue:true} }),
      prisma.bill.aggregate({ where:{ status:{in:['RECEIVED','PARTIALLY_PAID','OVERDUE']} }, _sum:{amountDue:true} }),
      prisma.invoice.aggregate({ where:{ status:'PAID' }, _sum:{total:true} }),
      prisma.bill.aggregate({ where:{ status:'PAID' }, _sum:{total:true} }),
      prisma.asset.aggregate({ _sum:{currentValue:true} }),
    ]);
    res.json({ success:true, data: {
      assets:{ receivables:ar._sum.amountDue||0, fixedAssets:assets._sum.currentValue||0, total:(ar._sum.amountDue||0)+(assets._sum.currentValue||0) },
      liabilities:{ payables:ap._sum.amountDue||0, total:ap._sum.amountDue||0 },
      equity:{ revenue:invPaid._sum.total||0, expenses:billPaid._sum.total||0, retained:(invPaid._sum.total||0)-(billPaid._sum.total||0) }
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
router.get('/stats', hasPermission('view_finance'), async (req, res) => {
  try {
    const [d1,d2,d3,d4,d5,d6,d7,d8,d9] = await Promise.all([
      prisma.invoice.count({where:{status:'DRAFT'}}),
      prisma.invoice.aggregate({where:{status:{in:['SENT','PARTIALLY_PAID']}}, _sum:{amountDue:true}, _count:true}),
      prisma.invoice.aggregate({where:{status:'PAID'}, _sum:{total:true}, _count:true}),
      prisma.invoice.count({where:{status:'OVERDUE'}}),
      prisma.bill.aggregate({where:{status:{in:['RECEIVED','PARTIALLY_PAID']}}, _sum:{amountDue:true}}),
      prisma.pettyCash.count({where:{status:'PENDING'}}),
      prisma.transaction.aggregate({where:{type:'INCOME'}, _sum:{amount:true}}),
      prisma.transaction.aggregate({where:{type:'EXPENSE'}, _sum:{amount:true}}),
      prisma.budget.aggregate({_sum:{amount:true,spent:true}}),
    ]);
    res.json({ success:true, data: {
      invoices:{ draft:d1, outstanding:d2._count, outstandingValue:d2._sum.amountDue||0, paid:d3._count, paidValue:d3._sum.total||0, overdue:d4 },
      bills:{ totalDue:d5._sum.amountDue||0 },
      pettyCashPending:d6,
      totals:{ income:d7._sum.amount||0, expenses:d8._sum.amount||0, netProfit:(d7._sum.amount||0)-(d8._sum.amount||0), totalBudget:d9._sum.amount||0, totalSpent:d9._sum.spent||0 }
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── JOURNAL ───────────────────────────────────────────────────────────────────
router.get('/journal', hasPermission('view_finance'), async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      include: { lines:{ include:{ account:true } }, createdBy:{ select:{name:true} } },
      orderBy: { createdAt:'desc' }, take: 100
    });
    res.json({ success:true, data: entries });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/journal', hasPermission('reconcile'), async (req, res) => {
  try {
    const { lines, description, date, reference } = req.body;
    const count = await prisma.journalEntry.count();
    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber: nextNumber('JE',count), description, reference,
        date: date ? new Date(date) : new Date(),
        createdById: req.user.id, isPosted: true,
        lines: { create: lines }
      },
      include: { lines:{ include:{ account:true } } }
    });
    res.status(201).json({ success:true, data: entry });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
