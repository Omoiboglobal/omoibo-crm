const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
router.use(authenticate);

// ── DEFAULT AGENTS SEEDED ON FIRST USE ────────────────────────────────────────
const DEFAULT_AGENTS = [
  {
    name: 'Sales Assistant',
    description: 'Helps with lead scoring, deal insights, and sales forecasting',
    department: 'SALES',
    capabilities: ['lead_scoring','deal_insights','sales_forecast','follow_up_suggestions'],
    systemPrompt: `You are an expert CRM sales assistant for Omoibo Global Limited. You help the sales team with:
- Analysing leads and scoring them based on engagement and potential
- Providing deal strategy recommendations
- Summarising sales pipeline status
- Suggesting follow-up actions for inactive leads
- Forecasting revenue based on pipeline data
Always be concise, data-driven, and actionable. Format responses clearly.`
  },
  {
    name: 'Finance Analyst',
    description: 'Financial insights, invoice analysis, and cash flow guidance',
    department: 'FINANCE',
    capabilities: ['invoice_analysis','cash_flow_insights','expense_review','budget_alerts'],
    systemPrompt: `You are a financial analyst assistant for Omoibo Global Limited. You help with:
- Analysing accounts receivable and payable
- Identifying overdue invoices and recommending collection actions
- Reviewing budget vs actual spending
- Cash flow projections and anomaly detection
- Summarising P&L trends
Be precise with numbers and always cite the data you're working from.`
  },
  {
    name: 'Inventory Manager',
    description: 'Stock level monitoring, reorder recommendations, and demand forecasting',
    department: 'INVENTORY',
    capabilities: ['stock_alerts','reorder_recommendations','demand_forecast','supplier_insights'],
    systemPrompt: `You are an inventory management assistant for Omoibo Global Limited. You help with:
- Monitoring stock levels across warehouses
- Recommending reorder quantities and timing
- Identifying slow-moving and fast-moving products
- Forecasting demand based on sales history
- Suggesting supplier consolidation opportunities`
  },
  {
    name: 'HR Assistant',
    description: 'Staff queries, leave management, and HR analytics',
    department: 'HR',
    capabilities: ['leave_queries','attendance_insights','headcount_analysis','performance_summary'],
    systemPrompt: `You are an HR assistant for Omoibo Global Limited. You help with:
- Answering staff queries about leave balances and policies
- Summarising attendance patterns
- Flagging performance concerns
- Onboarding guidance for new staff
- HR analytics and headcount reporting
Always maintain confidentiality and be empathetic in tone.`
  },
  {
    name: 'Executive Assistant',
    description: 'Company-wide insights, KPI summaries, and strategic recommendations',
    department: 'EXECUTIVE',
    capabilities: ['kpi_summary','department_insights','strategic_recommendations','board_report'],
    systemPrompt: `You are a strategic AI assistant for Omoibo Global Limited executive team. You:
- Summarise company-wide KPIs across all departments
- Identify risks and opportunities from operational data
- Prepare concise board-level summaries
- Benchmark performance against targets
- Provide data-driven strategic recommendations
Always present information in a clear, executive-friendly format.`
  },
];

// ── AGENTS CRUD ───────────────────────────────────────────────────────────────
router.get('/agents', async (req, res) => {
  try {
    // Seed defaults if none exist
    const count = await prisma.aIAgent.count();
    if (count === 0) {
      for (const agent of DEFAULT_AGENTS) {
        await prisma.aIAgent.create({ data: agent });
      }
    }
    const agents = await prisma.aIAgent.findMany({
      where: { status: { not: 'DRAFT' } },
      include: { _count: { select: { conversations: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: agents });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/agents', requireRoles('ADMIN','CEO','COO'), async (req, res) => {
  try {
    const agent = await prisma.aIAgent.create({ data: req.body });
    res.status(201).json({ success: true, data: agent });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/agents/:id', requireRoles('ADMIN','CEO','COO'), async (req, res) => {
  try {
    const agent = await prisma.aIAgent.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: agent });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── CONVERSATIONS ─────────────────────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const convs = await prisma.aIConversation.findMany({
      where: { userId: req.user.id },
      include: { agent: { select: { name:true, department:true } }, _count: { select: { messages:true } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: convs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await prisma.aIConversation.findUnique({
      where: { id: req.params.id },
      include: { agent: true, messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!conv) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: conv });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/conversations', async (req, res) => {
  try {
    const { agentId, title } = req.body;
    const conv = await prisma.aIConversation.create({
      data: { agentId, userId: req.user.id, title: title || 'New Conversation' },
      include: { agent: true }
    });
    res.status(201).json({ success: true, data: conv });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/conversations/:id', async (req, res) => {
  try {
    await prisma.aIConversation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── CHAT (MAIN AI ENDPOINT) ───────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { conversationId, message, agentId } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message required' });

    let conv;
    if (conversationId) {
      conv = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
        include: { agent: true, messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
      });
    } else if (agentId) {
      const agent = await prisma.aIAgent.findUnique({ where: { id: agentId } });
      conv = await prisma.aIConversation.create({
        data: { agentId, userId: req.user.id, title: message.slice(0,50) },
        include: { agent: true, messages: true }
      });
    } else {
      return res.status(400).json({ success: false, error: 'conversationId or agentId required' });
    }

    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });

    // Save user message
    await prisma.aIMessage.create({ data: { conversationId: conv.id, role: 'USER', content: message } });

    // Build context from CRM data relevant to the agent's department
    const crmContext = await buildCRMContext(conv.agent.department, req.user);

    // Build messages for Anthropic API
    const historyMessages = (conv.messages || []).map(m => ({ role: m.role.toLowerCase(), content: m.content }));
    const apiMessages = [
      ...historyMessages,
      { role: 'user', content: `${message}\n\n---\nCurrent CRM Data Context:\n${crmContext}` }
    ];

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: conv.agent.model || 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: conv.agent.systemPrompt,
        messages: apiMessages,
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${err}`);
    }

    const aiData = await response.json();
    const aiReply = aiData.content?.[0]?.text || 'I was unable to generate a response. Please try again.';
    const tokens = aiData.usage?.output_tokens;

    // Save assistant message
    const assistantMsg = await prisma.aIMessage.create({
      data: { conversationId: conv.id, role: 'ASSISTANT', content: aiReply, tokens }
    });

    // Update conversation timestamp and title
    await prisma.aIConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date(), title: conv.messages?.length === 0 ? message.slice(0,60) : undefined }
    });

    res.json({ success: true, data: { message: assistantMsg, conversationId: conv.id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── QUICK INSIGHTS (no conversation needed) ───────────────────────────────────
router.post('/insights', async (req, res) => {
  try {
    const { type } = req.body; // sales_summary, finance_summary, inventory_alerts, etc.
    const crmContext = await buildCRMContext(null, req.user);

    const prompts = {
      sales_summary: 'Give me a brief 3-bullet summary of the current sales pipeline performance and top priorities.',
      finance_summary: 'Summarise the current financial health: outstanding invoices, cash position, and any alerts.',
      inventory_alerts: 'List any inventory items that need immediate attention (low stock, reorder needed).',
      daily_brief: 'Give me a concise daily brief covering the most important items across all departments that need my attention today.',
      overdue_invoices: 'List overdue invoices and recommend specific collection actions.',
    };

    const prompt = prompts[type] || req.body.prompt;
    if (!prompt) return res.status(400).json({ success: false, error: 'Invalid insight type' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: `You are a CRM analyst for Omoibo Global Limited. Be concise and actionable. Use bullet points. Today is ${new Date().toDateString()}.`,
        messages: [{ role: 'user', content: `${prompt}\n\nCRM Data:\n${crmContext}` }]
      })
    });

    const data = await response.json();
    const insight = data.content?.[0]?.text || 'Unable to generate insight.';
    res.json({ success: true, data: { insight, type } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── CRM CONTEXT BUILDER ───────────────────────────────────────────────────────
async function buildCRMContext(department, user) {
  try {
    const lines = [];

    if (!department || department === 'SALES') {
      const [leads, deals] = await Promise.all([
        prisma.lead.groupBy({ by: ['status'], _count: true }),
        prisma.deal.groupBy({ by: ['stage'], _sum: { value: true }, _count: true }),
      ]);
      lines.push(`SALES: Leads by status: ${leads.map(l=>`${l.status}=${l._count}`).join(', ')}`);
      lines.push(`SALES: Deals by stage: ${deals.map(d=>`${d.stage}=${d._count}(₦${(d._sum.value||0).toLocaleString()})`).join(', ')}`);
    }

    if (!department || department === 'FINANCE') {
      const [inv, bills, pc] = await Promise.all([
        prisma.invoice.groupBy({ by: ['status'], _sum: { total: true }, _count: true }),
        prisma.bill.aggregate({ where: { status: { in: ['RECEIVED','PARTIALLY_PAID'] } }, _sum: { amountDue: true } }),
        prisma.pettyCash.count({ where: { status: 'PENDING' } }),
      ]);
      lines.push(`FINANCE: Invoices: ${inv.map(i=>`${i.status}=${i._count}(₦${(i._sum.total||0).toLocaleString()})`).join(', ')}`);
      lines.push(`FINANCE: Outstanding bills: ₦${(bills._sum.amountDue||0).toLocaleString()}`);
      lines.push(`FINANCE: Petty cash pending approval: ${pc}`);
    }

    if (!department || department === 'INVENTORY') {
      const [lowStock, totalProducts] = await Promise.all([
        prisma.product.count({ where: { isActive: true } }),
        prisma.product.count({ where: { quantity: { lte: 10 }, isActive: true } }),
      ]);
      lines.push(`INVENTORY: Total active products: ${lowStock}, Low stock items: ${totalProducts}`);
    }

    if (!department || department === 'HR') {
      const [staff, pendingLeave, todayAttendance] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
        prisma.attendance.count({ where: { date: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      ]);
      lines.push(`HR: Active staff: ${staff}, Pending leave requests: ${pendingLeave}, Present today: ${todayAttendance}`);
    }

    if (!department || department === 'LOGISTICS') {
      const orders = await prisma.order.groupBy({ by: ['status'], _count: true });
      lines.push(`LOGISTICS: Orders by status: ${orders.map(o=>`${o.status}=${o._count}`).join(', ')}`);
    }

    lines.push(`CURRENT USER: ${user.name} (${user.role}) - ${user.department}`);
    lines.push(`DATE: ${new Date().toDateString()}`);

    return lines.join('\n');
  } catch (e) {
    return 'CRM context unavailable.';
  }
}

module.exports = router;
