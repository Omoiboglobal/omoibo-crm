const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const USERS = [
  { name: 'System Admin',       email: 'admin@omoibo.com',           role: 'ADMIN',              department: 'ADMINISTRATION' },
  { name: 'Emeka Obi',          email: 'ceo@omoibo.com',             role: 'CEO',                department: 'EXECUTIVE' },
  { name: 'Ngozi Adeyemi',      email: 'coo@omoibo.com',             role: 'COO',                department: 'EXECUTIVE' },
  { name: 'Chidi Nwosu',        email: 'salesmanager@omoibo.com',    role: 'SALES_MANAGER',      department: 'SALES' },
  { name: 'Amaka Okafor',       email: 'salesteamlead@omoibo.com',   role: 'SALES_TEAM_LEAD',    department: 'SALES' },
  { name: 'Tunde Bakare',       email: 'salesagent@omoibo.com',      role: 'SALES_AGENT',        department: 'SALES' },
  { name: 'Kemi Adeola',        email: 'inventorymanager@omoibo.com',role: 'INVENTORY_MANAGER',  department: 'INVENTORY' },
  { name: 'Bola Ogundele',      email: 'inventoryofficer@omoibo.com',role: 'INVENTORY_OFFICER',  department: 'INVENTORY' },
  { name: 'Segun Fashola',      email: 'logisticsmanager@omoibo.com',role: 'LOGISTICS_MANAGER',  department: 'LOGISTICS' },
  { name: 'Yemi Ogunleye',      email: 'logisticsofficer@omoibo.com',role: 'LOGISTICS_OFFICER',  department: 'LOGISTICS' },
  { name: 'Funke Adesanya',     email: 'financemanager@omoibo.com',  role: 'FINANCE_MANAGER',    department: 'FINANCE' },
  { name: 'Biodun Coker',       email: 'financeofficer@omoibo.com',  role: 'FINANCE_OFFICER',    department: 'FINANCE' },
  { name: 'Sola Martins',       email: 'accountant@omoibo.com',      role: 'ACCOUNTANT',         department: 'FINANCE' },
  { name: 'Chioma Eze',         email: 'hrmanager@omoibo.com',       role: 'HR_MANAGER',         department: 'HR' },
  { name: 'Ifeanyi Okonkwo',    email: 'hrofficer@omoibo.com',       role: 'HR_OFFICER',         department: 'HR' },
  { name: 'Rasheed Lawal',      email: 'facilitymanager@omoibo.com', role: 'FACILITY_MANAGER',   department: 'FACILITY' },
  { name: 'Adaeze Nwosu',       email: 'facilityofficer@omoibo.com', role: 'FACILITY_OFFICER',   department: 'FACILITY' },
];

const COA = [
  // ASSETS
  { code: '1000', name: 'Assets',                    type: 'ASSET',     subType: null },
  { code: '1100', name: 'Current Assets',            type: 'ASSET',     subType: 'CURRENT_ASSET' },
  { code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET',     subType: 'CASH', openingBalance: 5000000 },
  { code: '1120', name: 'Accounts Receivable',       type: 'ASSET',     subType: 'ACCOUNTS_RECEIVABLE' },
  { code: '1130', name: 'Inventory Assets',          type: 'ASSET',     subType: 'INVENTORY' },
  { code: '1200', name: 'Fixed Assets',              type: 'ASSET',     subType: 'FIXED_ASSET' },
  { code: '1210', name: 'Equipment',                 type: 'ASSET',     subType: 'EQUIPMENT', openingBalance: 8500000 },
  { code: '1220', name: 'Vehicles',                  type: 'ASSET',     subType: 'VEHICLE', openingBalance: 12000000 },
  // LIABILITIES
  { code: '2000', name: 'Liabilities',               type: 'LIABILITY', subType: null },
  { code: '2100', name: 'Current Liabilities',       type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
  { code: '2110', name: 'Accounts Payable',          type: 'LIABILITY', subType: 'ACCOUNTS_PAYABLE' },
  { code: '2120', name: 'Accrued Expenses',          type: 'LIABILITY', subType: 'ACCRUED' },
  // EQUITY
  { code: '3000', name: 'Equity',                    type: 'EQUITY',    subType: null },
  { code: '3100', name: 'Owner\'s Equity',           type: 'EQUITY',    subType: 'OWNERS_EQUITY', openingBalance: 20000000 },
  { code: '3200', name: 'Retained Earnings',         type: 'EQUITY',    subType: 'RETAINED_EARNINGS' },
  // INCOME
  { code: '4000', name: 'Revenue',                   type: 'INCOME',    subType: null },
  { code: '4100', name: 'Sales Revenue',             type: 'INCOME',    subType: 'SALES' },
  { code: '4200', name: 'Service Revenue',           type: 'INCOME',    subType: 'SERVICE' },
  { code: '4300', name: 'Other Income',              type: 'INCOME',    subType: 'OTHER_INCOME' },
  // EXPENSES
  { code: '5000', name: 'Expenses',                  type: 'EXPENSE',   subType: null },
  { code: '5100', name: 'Cost of Goods Sold',        type: 'EXPENSE',   subType: 'COGS' },
  { code: '5200', name: 'Salaries & Wages',          type: 'EXPENSE',   subType: 'PAYROLL' },
  { code: '5300', name: 'Rent & Utilities',          type: 'EXPENSE',   subType: 'OVERHEAD' },
  { code: '5400', name: 'Logistics & Delivery',      type: 'EXPENSE',   subType: 'LOGISTICS' },
  { code: '5500', name: 'Marketing & Advertising',   type: 'EXPENSE',   subType: 'MARKETING' },
  { code: '5600', name: 'Office Supplies',           type: 'EXPENSE',   subType: 'OFFICE' },
  { code: '5700', name: 'Depreciation',              type: 'EXPENSE',   subType: 'DEPRECIATION' },
  { code: '5800', name: 'Petty Cash Expenses',       type: 'EXPENSE',   subType: 'PETTY_CASH' },
];

const AI_AGENTS = [
  { name: 'Sales Assistant', description: 'Lead scoring, deal insights, and sales forecasting', department: 'SALES', capabilities: ['lead_scoring','deal_insights','sales_forecast'], systemPrompt: 'You are an expert CRM sales assistant for Omoibo Global Limited. Help the sales team analyse leads, recommend deal strategies, and forecast revenue. Be concise, data-driven, and actionable.' },
  { name: 'Finance Analyst', description: 'Invoice analysis, cash flow, and financial insights', department: 'FINANCE', capabilities: ['invoice_analysis','cash_flow','budget_alerts'], systemPrompt: 'You are a financial analyst for Omoibo Global Limited. Help with AR/AP analysis, overdue invoice collection, budget monitoring, and P&L trends. Be precise with numbers.' },
  { name: 'Inventory Manager', description: 'Stock monitoring, reorder recommendations, demand forecast', department: 'INVENTORY', capabilities: ['stock_alerts','reorder','demand_forecast'], systemPrompt: 'You are an inventory assistant for Omoibo Global Limited. Monitor stock levels across warehouses, recommend reorders, and forecast demand based on sales patterns.' },
  { name: 'HR Assistant', description: 'Staff queries, leave management, and HR analytics', department: 'HR', capabilities: ['leave_queries','attendance','performance'], systemPrompt: 'You are an HR assistant for Omoibo Global Limited. Help with leave queries, attendance analysis, and HR reporting. Always maintain confidentiality.' },
  { name: 'Executive Assistant', description: 'Company-wide KPIs and strategic recommendations', department: 'EXECUTIVE', capabilities: ['kpi_summary','strategic_insights','board_report'], systemPrompt: 'You are a strategic AI assistant for the Omoibo Global Limited executive team. Summarise KPIs, identify risks and opportunities, and prepare board-level insights.' },
];

async function main() {
  console.log('🌱 Seeding Omoibo CRM v2.0...\n');
  const pw = await bcrypt.hash('Admin@1234', 12);

  // ── USERS ──────────────────────────────────────────────────────────────────
  const createdUsers = {};
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: pw }
    });
    createdUsers[u.role] = user;
  }
  console.log(`✅ ${USERS.length} users created`);

  // ── STAFF PROFILES ─────────────────────────────────────────────────────────
  const hrUser = createdUsers['HR_OFFICER'];
  const salesAgent = createdUsers['SALES_AGENT'];
  await Promise.all([
    prisma.staffProfile.upsert({ where: { userId: hrUser.id }, update: {}, create: { userId: hrUser.id, employeeId: 'EMP-001', hireDate: new Date('2022-03-01'), salary: 180000, jobTitle: 'HR Officer', bankName: 'GTBank', accountNumber: '0123456789' } }),
    prisma.staffProfile.upsert({ where: { userId: salesAgent.id }, update: {}, create: { userId: salesAgent.id, employeeId: 'EMP-002', hireDate: new Date('2023-06-15'), salary: 150000, jobTitle: 'Sales Agent', bankName: 'Access Bank', accountNumber: '9876543210' } }),
  ]);
  console.log('✅ Staff profiles created');

  // ── CHART OF ACCOUNTS ──────────────────────────────────────────────────────
  for (const acc of COA) {
    await prisma.chartOfAccounts.upsert({ where: { code: acc.code }, update: {}, create: { code: acc.code, name: acc.name, type: acc.type, subType: acc.subType || null, openingBalance: acc.openingBalance || 0 } });
  }
  console.log('✅ Chart of accounts created (28 accounts)');

  // ── TAX RATES ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.taxRate.upsert({ where: { name: 'VAT 7.5%' }, update: {}, create: { name: 'VAT 7.5%', rate: 7.5, isDefault: true } }),
    prisma.taxRate.upsert({ where: { name: 'Zero Rated' }, update: {}, create: { name: 'Zero Rated', rate: 0 } }),
    prisma.taxRate.upsert({ where: { name: 'WHT 5%' }, update: {}, create: { name: 'WHT 5%', rate: 5 } }),
  ]);
  console.log('✅ Tax rates created');

  // ── BANK ACCOUNTS ──────────────────────────────────────────────────────────
  await Promise.all([
    prisma.bankAccount.upsert({ where: { id: 'ba-001' }, update: {}, create: { id: 'ba-001', name: 'Main Operating Account', bankName: 'Zenith Bank', accountNumber: '1012345678', currency: 'NGN', openingBalance: 5000000, currentBalance: 5000000 } }),
    prisma.bankAccount.upsert({ where: { id: 'ba-002' }, update: {}, create: { id: 'ba-002', name: 'Petty Cash Account', bankName: 'GTBank', accountNumber: '0123456789', currency: 'NGN', openingBalance: 200000, currentBalance: 200000 } }),
  ]);
  console.log('✅ Bank accounts created');

  // ── WAREHOUSES ─────────────────────────────────────────────────────────────
  const [wh1, wh2, wh3] = await Promise.all([
    prisma.warehouse.upsert({ where: { code: 'WH-001' }, update: {}, create: { id: 'wh-001', code: 'WH-001', name: 'Lagos Main Warehouse', location: 'Ikeja, Lagos', address: '15 Oba Akran Avenue', city: 'Lagos', state: 'Lagos', isPrimary: true, phone: '08012345678', email: 'lagos@omoibo.com' } }),
    prisma.warehouse.upsert({ where: { code: 'WH-002' }, update: {}, create: { id: 'wh-002', code: 'WH-002', name: 'Abuja Distribution Centre', location: 'Wuse Zone 5, Abuja', address: 'Plot 12 Central Business District', city: 'Abuja', state: 'FCT', phone: '08098765432', email: 'abuja@omoibo.com' } }),
    prisma.warehouse.upsert({ where: { code: 'WH-003' }, update: {}, create: { id: 'wh-003', code: 'WH-003', name: 'Port Harcourt Depot', location: 'Rumuola, Port Harcourt', address: '7 Aba Road', city: 'Port Harcourt', state: 'Rivers', phone: '08056789012', email: 'ph@omoibo.com' } }),
  ]);
  console.log('✅ 3 warehouses created (Lagos, Abuja, Port Harcourt)');

  // ── PRODUCT CATEGORIES ─────────────────────────────────────────────────────
  const cats = {};
  for (const name of ['Electronics', 'Appliances', 'Power & Energy', 'IT Equipment', 'Office Supplies']) {
    cats[name] = await prisma.productCategory.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('✅ Product categories created');

  // ── SUPPLIERS ──────────────────────────────────────────────────────────────
  const [sup1, sup2] = await Promise.all([
    prisma.supplier.upsert({ where: { id: 'sup-001' }, update: {}, create: { id: 'sup-001', name: 'TechDistrib Nigeria Ltd', email: 'supply@techdistrib.ng', phone: '08011223344', city: 'Lagos', paymentTerms: 'Net 30' } }),
    prisma.supplier.upsert({ where: { id: 'sup-002' }, update: {}, create: { id: 'sup-002', name: 'Powerhouse Imports', email: 'info@powerhouse.ng', phone: '08055667788', city: 'Lagos', paymentTerms: 'Net 14' } }),
  ]);
  console.log('✅ Suppliers created');

  // ── PRODUCTS ───────────────────────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({ where: { sku: 'PRD-001' }, update: {}, create: { sku: 'PRD-001', name: 'Samsung 55" Smart TV (4K)', categoryId: cats['Electronics'].id, warehouseId: wh1.id, quantity: 45, reorderLevel: 10, reorderQuantity: 30, unitPrice: 350000, costPrice: 280000, supplierId: sup1.id, unit: 'piece' } }),
    prisma.product.upsert({ where: { sku: 'PRD-002' }, update: {}, create: { sku: 'PRD-002', name: 'Haier Thermocool Fridge 350L', categoryId: cats['Appliances'].id, warehouseId: wh1.id, quantity: 28, reorderLevel: 5, reorderQuantity: 20, unitPrice: 185000, costPrice: 148000, supplierId: sup1.id, unit: 'piece' } }),
    prisma.product.upsert({ where: { sku: 'PRD-003' }, update: {}, create: { sku: 'PRD-003', name: 'Standing Fan Binatone 18"', categoryId: cats['Appliances'].id, warehouseId: wh2.id, quantity: 8, reorderLevel: 20, reorderQuantity: 50, unitPrice: 22000, costPrice: 16000, supplierId: sup1.id, unit: 'piece' } }),
    prisma.product.upsert({ where: { sku: 'PRD-004' }, update: {}, create: { sku: 'PRD-004', name: 'HP EliteBook 840 Laptop', categoryId: cats['IT Equipment'].id, warehouseId: wh1.id, quantity: 15, reorderLevel: 5, reorderQuantity: 10, unitPrice: 420000, costPrice: 350000, supplierId: sup1.id, unit: 'piece' } }),
    prisma.product.upsert({ where: { sku: 'PRD-005' }, update: {}, create: { sku: 'PRD-005', name: 'Thermocool Generator 3.5KVA', categoryId: cats['Power & Energy'].id, warehouseId: wh2.id, quantity: 3, reorderLevel: 8, reorderQuantity: 15, unitPrice: 175000, costPrice: 140000, supplierId: sup2.id, unit: 'piece' } }),
    prisma.product.upsert({ where: { sku: 'PRD-006' }, update: {}, create: { sku: 'PRD-006', name: 'LG Washing Machine 7kg', categoryId: cats['Appliances'].id, warehouseId: wh1.id, quantity: 20, reorderLevel: 5, reorderQuantity: 15, unitPrice: 145000, costPrice: 115000, supplierId: sup1.id, unit: 'piece' } }),
    prisma.product.upsert({ where: { sku: 'PRD-007' }, update: {}, create: { sku: 'PRD-007', name: 'Solar Panel 200W Monocrystalline', categoryId: cats['Power & Energy'].id, warehouseId: wh3.id, quantity: 60, reorderLevel: 15, reorderQuantity: 40, unitPrice: 75000, costPrice: 58000, supplierId: sup2.id, unit: 'piece' } }),
  ]);
  console.log(`✅ ${products.length} products created`);

  // ── ACCOUNTS (CRM) ─────────────────────────────────────────────────────────
  const adminUser = createdUsers['ADMIN'];
  const [acc1, acc2, acc3] = await Promise.all([
    prisma.account.upsert({ where: { id: 'acct-001' }, update: {}, create: { id: 'acct-001', name: 'TechNG Solutions Ltd', industry: 'Technology', phone: '08012345678', email: 'info@techng.com', city: 'Lagos', country: 'Nigeria', annualRevenue: 50000000, employees: 120, rating: 'HOT', createdById: adminUser.id } }),
    prisma.account.upsert({ where: { id: 'acct-002' }, update: {}, create: { id: 'acct-002', name: 'Retail Hub Nigeria', industry: 'Retail', phone: '07098765432', email: 'procurement@retailhub.ng', city: 'Abuja', country: 'Nigeria', annualRevenue: 30000000, employees: 45, rating: 'WARM', createdById: adminUser.id } }),
    prisma.account.upsert({ where: { id: 'acct-003' }, update: {}, create: { id: 'acct-003', name: 'North Link Enterprises', industry: 'Distribution', phone: '07012345678', email: 'ibrahim@northlink.ng', city: 'Kano', country: 'Nigeria', annualRevenue: 80000000, employees: 200, createdById: adminUser.id } }),
  ]);
  console.log('✅ CRM accounts created');

  // ── CONTACTS ───────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.contact.upsert({ where: { id: 'cnt-001' }, update: {}, create: { id: 'cnt-001', firstName: 'Chukwuemeka', lastName: 'Obi', email: 'chukwuemeka@techng.com', phone: '08012345678', jobTitle: 'Procurement Manager', accountId: acc1.id, city: 'Lagos', createdById: adminUser.id } }),
    prisma.contact.upsert({ where: { id: 'cnt-002' }, update: {}, create: { id: 'cnt-002', firstName: 'Amina', lastName: 'Yusuf', email: 'amina@retailhub.ng', phone: '07098765432', jobTitle: 'Director of Operations', accountId: acc2.id, city: 'Abuja', createdById: adminUser.id } }),
    prisma.contact.upsert({ where: { id: 'cnt-003' }, update: {}, create: { id: 'cnt-003', firstName: 'Ibrahim', lastName: 'Musa', email: 'ibrahim@northlink.ng', phone: '07012345678', jobTitle: 'CEO', accountId: acc3.id, city: 'Kano', createdById: adminUser.id } }),
  ]);
  console.log('✅ Contacts created');

  // ── LEADS ──────────────────────────────────────────────────────────────────
  const lead1 = await prisma.lead.upsert({ where: { id: 'lead-001' }, update: {}, create: { id: 'lead-001', fullName: 'Chukwuemeka Obi', email: 'chukwuemeka@techng.com', phone: '08012345678', company: 'TechNG Solutions Ltd', source: 'Website', status: 'QUALIFIED', accountId: acc1.id, contactId: 'cnt-001', aiScore: 87, expectedValue: 2500000, assignedToId: salesAgent.id, createdById: salesAgent.id } });
  const lead2 = await prisma.lead.upsert({ where: { id: 'lead-002' }, update: {}, create: { id: 'lead-002', fullName: 'Amina Yusuf', email: 'amina@retailhub.ng', phone: '07098765432', company: 'Retail Hub Nigeria', source: 'Referral', status: 'NEGOTIATION', accountId: acc2.id, contactId: 'cnt-002', aiScore: 74, expectedValue: 850000, assignedToId: salesAgent.id, createdById: salesAgent.id } });
  const lead3 = await prisma.lead.upsert({ where: { id: 'lead-003' }, update: {}, create: { id: 'lead-003', fullName: 'Ibrahim Musa', email: 'ibrahim@northlink.ng', phone: '07012345678', company: 'North Link Enterprises', source: 'Trade Show', status: 'CLOSED_WON', accountId: acc3.id, contactId: 'cnt-003', aiScore: 95, expectedValue: 3500000, assignedToId: salesAgent.id, createdById: salesAgent.id } });
  console.log('✅ Leads created');

  // ── DEALS ──────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.deal.upsert({ where: { id: 'deal-001' }, update: {}, create: { id: 'deal-001', title: 'TechNG Electronics Supply Q2 2026', value: 2500000, stage: 'NEGOTIATION', probability: 65, expectedClose: new Date('2026-04-30'), leadId: lead1.id, accountId: acc1.id, assignedToId: salesAgent.id } }),
    prisma.deal.upsert({ where: { id: 'deal-002' }, update: {}, create: { id: 'deal-002', title: 'Retail Hub Appliance Bundle', value: 850000, stage: 'PROPOSAL', probability: 40, expectedClose: new Date('2026-05-15'), leadId: lead2.id, accountId: acc2.id, assignedToId: salesAgent.id } }),
    prisma.deal.upsert({ where: { id: 'deal-003' }, update: {}, create: { id: 'deal-003', title: 'North Link Generator Fleet', value: 3500000, stage: 'CLOSED_WON', probability: 100, expectedClose: new Date('2026-03-15'), actualClose: new Date('2026-03-15'), leadId: lead3.id, accountId: acc3.id, assignedToId: salesAgent.id } }),
  ]);
  console.log('✅ Deals created');

  // ── INVOICES ───────────────────────────────────────────────────────────────
  const finMgr = createdUsers['FINANCE_MANAGER'];
  const inv1 = await prisma.invoice.upsert({ where: { invoiceNumber: 'INV-2026-0001' }, update: {}, create: {
    invoiceNumber: 'INV-2026-0001', contactId: 'cnt-003', accountId: acc3.id,
    status: 'PAID', issueDate: new Date('2026-03-15'), dueDate: new Date('2026-04-14'),
    subtotal: 3500000, taxRate: 7.5, taxAmount: 262500, total: 3762500,
    amountPaid: 3762500, amountDue: 0, paidAt: new Date('2026-03-20'),
    notes: 'Payment for 20x Generator 3.5KVA supply', createdById: finMgr.id,
    lineItems: { create: [{ productId: products[4].id, description: 'Thermocool Generator 3.5KVA x20', quantity: 20, unitPrice: 175000, total: 3500000 }] }
  }});
  const inv2 = await prisma.invoice.upsert({ where: { invoiceNumber: 'INV-2026-0002' }, update: {}, create: {
    invoiceNumber: 'INV-2026-0002', contactId: 'cnt-001', accountId: acc1.id,
    status: 'SENT', issueDate: new Date('2026-03-20'), dueDate: new Date('2026-04-19'),
    subtotal: 2100000, taxRate: 7.5, taxAmount: 157500, total: 2257500,
    amountPaid: 0, amountDue: 2257500, createdById: finMgr.id,
    lineItems: { create: [
      { productId: products[0].id, description: 'Samsung 55" Smart TV x6', quantity: 6, unitPrice: 350000, total: 2100000 },
    ]}
  }});
  const inv3 = await prisma.invoice.upsert({ where: { invoiceNumber: 'INV-2026-0003' }, update: {}, create: {
    invoiceNumber: 'INV-2026-0003', contactId: 'cnt-002', accountId: acc2.id,
    status: 'OVERDUE', issueDate: new Date('2026-02-15'), dueDate: new Date('2026-03-01'),
    subtotal: 740000, taxRate: 7.5, taxAmount: 55500, total: 795500,
    amountPaid: 0, amountDue: 795500, createdById: finMgr.id,
    lineItems: { create: [
      { productId: products[1].id, description: 'Haier Fridge 350L x4', quantity: 4, unitPrice: 185000, total: 740000 },
    ]}
  }});
  console.log('✅ Invoices created (1 paid, 1 sent, 1 overdue)');

  // ── PAYMENTS ───────────────────────────────────────────────────────────────
  await prisma.payment.upsert({ where: { id: 'pay-001' }, update: {}, create: { id: 'pay-001', invoiceId: inv1.id, amount: 3762500, paymentDate: new Date('2026-03-20'), method: 'BANK_TRANSFER', reference: 'ZB/2026/0078931', bankName: 'Zenith Bank', recordedById: createdUsers['ACCOUNTANT'].id } });
  console.log('✅ Payment recorded');

  // ── BILLS ──────────────────────────────────────────────────────────────────
  await prisma.bill.upsert({ where: { billNumber: 'BILL-2026-0001' }, update: {}, create: {
    billNumber: 'BILL-2026-0001', supplierId: sup1.id, status: 'RECEIVED',
    billDate: new Date('2026-03-10'), dueDate: new Date('2026-04-09'),
    subtotal: 2800000, total: 2800000, amountDue: 2800000,
    notes: 'Samsung TV & HP Laptop stock purchase', createdById: finMgr.id,
    lineItems: { create: [
      { productId: products[0].id, description: 'Samsung TV purchase price x10', quantity: 10, unitPrice: 280000, total: 2800000 }
    ]}
  }});
  console.log('✅ Bill created');

  // ── PETTY CASH ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.pettyCash.upsert({ where: { id: 'pc-001' }, update: {}, create: { id: 'pc-001', amount: 15000, purpose: 'Office cleaning supplies', requesterId: hrUser.id, approverId: finMgr.id, status: 'APPROVED', approvedAt: new Date(), disbursedAt: new Date() } }),
    prisma.pettyCash.upsert({ where: { id: 'pc-002' }, update: {}, create: { id: 'pc-002', amount: 8500, purpose: 'Board meeting refreshments', requesterId: hrUser.id, status: 'PENDING' } }),
    prisma.pettyCash.upsert({ where: { id: 'pc-003' }, update: {}, create: { id: 'pc-003', amount: 5000, purpose: 'Client visit transport', requesterId: salesAgent.id, status: 'PENDING' } }),
  ]);
  console.log('✅ Petty cash requests created');

  // ── BUDGETS ────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.budget.upsert({ where: { id: 'bud-001' }, update: {}, create: { id: 'bud-001', department: 'SALES', title: 'Q1 2026 Sales Budget', amount: 5000000, spent: 2800000, period: '2026-Q1' } }),
    prisma.budget.upsert({ where: { id: 'bud-002' }, update: {}, create: { id: 'bud-002', department: 'LOGISTICS', title: 'Q1 2026 Logistics Budget', amount: 800000, spent: 380000, period: '2026-Q1' } }),
    prisma.budget.upsert({ where: { id: 'bud-003' }, update: {}, create: { id: 'bud-003', department: 'HR', title: 'Q1 2026 HR Budget', amount: 1200000, spent: 650000, period: '2026-Q1' } }),
    prisma.budget.upsert({ where: { id: 'bud-004' }, update: {}, create: { id: 'bud-004', department: 'FACILITY', title: 'Q1 2026 Facility Budget', amount: 600000, spent: 210000, period: '2026-Q1' } }),
    prisma.budget.upsert({ where: { id: 'bud-005' }, update: {}, create: { id: 'bud-005', department: 'FINANCE', title: 'Q1 2026 Finance Budget', amount: 300000, spent: 120000, period: '2026-Q1' } }),
  ]);
  console.log('✅ Budgets created');

  // ── TRANSACTIONS ───────────────────────────────────────────────────────────
  const acct = createdUsers['ACCOUNTANT'];
  await Promise.all([
    prisma.transaction.upsert({ where: { id: 'tx-001' }, update: {}, create: { id: 'tx-001', type: 'INCOME', amount: 2500000, category: 'Sales Revenue', description: 'TechNG Q1 Advance Payment', createdById: acct.id, approvedById: finMgr.id } }),
    prisma.transaction.upsert({ where: { id: 'tx-002' }, update: {}, create: { id: 'tx-002', type: 'EXPENSE', amount: 180000, category: 'Logistics', description: 'GIG Logistics March delivery fees', createdById: acct.id, approvedById: finMgr.id } }),
    prisma.transaction.upsert({ where: { id: 'tx-003' }, update: {}, create: { id: 'tx-003', type: 'EXPENSE', amount: 95000, category: 'Utilities', description: 'Electricity & water bills March', createdById: acct.id, approvedById: finMgr.id } }),
    prisma.transaction.upsert({ where: { id: 'tx-004' }, update: {}, create: { id: 'tx-004', type: 'EXPENSE', amount: 45000, category: 'Office Supplies', description: 'Stationery & office materials', createdById: acct.id } }),
  ]);
  console.log('✅ Transactions created');

  // ── ORDERS ─────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.order.upsert({ where: { orderNumber: 'ORD-2026-001' }, update: {}, create: { orderNumber: 'ORD-2026-001', customerName: 'Chukwuemeka Obi', customerPhone: '08012345678', customerEmail: 'chukwuemeka@techng.com', deliveryAddress: '45 Obafemi Awolowo Way, Ikeja', city: 'Lagos', status: 'DELIVERED', totalAmount: 350000, carrier: 'GIG Logistics', trackingNumber: 'GIG12345678', deliveredAt: new Date('2026-03-25') } }),
    prisma.order.upsert({ where: { orderNumber: 'ORD-2026-002' }, update: {}, create: { orderNumber: 'ORD-2026-002', customerName: 'Bola Adeyemi', customerPhone: '09087654321', deliveryAddress: '12 Victoria Island, Lagos', city: 'Lagos', status: 'IN_TRANSIT', totalAmount: 185000, carrier: 'DHL', trackingNumber: 'DHL98765432' } }),
    prisma.order.upsert({ where: { orderNumber: 'ORD-2026-003' }, update: {}, create: { orderNumber: 'ORD-2026-003', customerName: 'Ngozi Eze', customerPhone: '08123456789', deliveryAddress: '7 Wuse Zone 5, Abuja', city: 'Abuja', status: 'PENDING', totalAmount: 420000, priority: 'HIGH' } }),
  ]);
  console.log('✅ Orders created');

  // ── ASSETS ─────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.asset.upsert({ where: { assetTag: 'AST-001' }, update: {}, create: { assetTag: 'AST-001', name: 'Dell PowerEdge Server R640', category: 'IT Equipment', location: 'Server Room', purchaseDate: new Date('2023-01-10'), purchasePrice: 850000, currentValue: 680000, depreciationRate: 20, status: 'ACTIVE' } }),
    prisma.asset.upsert({ where: { assetTag: 'AST-002' }, update: {}, create: { assetTag: 'AST-002', name: 'Honda Generator 10KVA', category: 'Power Equipment', location: 'Main Facility', purchaseDate: new Date('2022-06-15'), purchasePrice: 450000, currentValue: 380000, status: 'ACTIVE' } }),
    prisma.asset.upsert({ where: { assetTag: 'AST-003' }, update: {}, create: { assetTag: 'AST-003', name: 'Toyota Hilux Van (Delivery)', category: 'Vehicles', location: 'Fleet', purchaseDate: new Date('2021-03-20'), purchasePrice: 12000000, currentValue: 9500000, depreciationRate: 15, status: 'ACTIVE' } }),
    prisma.asset.upsert({ where: { assetTag: 'AST-004' }, update: {}, create: { assetTag: 'AST-004', name: 'Air Conditioner 2HP Daikin', category: 'HVAC', location: 'Board Room', purchaseDate: new Date('2023-08-01'), purchasePrice: 185000, currentValue: 150000, status: 'MAINTENANCE' } }),
    prisma.asset.upsert({ where: { assetTag: 'AST-005' }, update: {}, create: { assetTag: 'AST-005', name: 'HP LaserJet Pro Printer', category: 'IT Equipment', location: 'Admin Office', purchaseDate: new Date('2023-11-05'), purchasePrice: 85000, currentValue: 70000, status: 'ACTIVE' } }),
  ]);
  console.log('✅ Assets created');

  // ── ATTENDANCE ─────────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(8, 30, 0, 0);
  await prisma.attendance.upsert({ where: { id: 'att-001' }, update: {}, create: { id: 'att-001', userId: salesAgent.id, date: new Date(), clockIn: today, status: 'PRESENT' } });
  console.log('✅ Attendance record created');

  // ── LEAVE REQUESTS ─────────────────────────────────────────────────────────
  await prisma.leaveRequest.upsert({ where: { id: 'lv-001' }, update: {}, create: { id: 'lv-001', requesterId: salesAgent.id, leaveType: 'ANNUAL', startDate: new Date('2026-04-10'), endDate: new Date('2026-04-14'), days: 5, reason: 'Family vacation planned in advance', status: 'PENDING' } });
  console.log('✅ Leave request created');

  // ── AI AGENTS ──────────────────────────────────────────────────────────────
  for (const agent of AI_AGENTS) {
    const existing = await prisma.aIAgent.findFirst({ where: { name: agent.name } });
    if (!existing) await prisma.aIAgent.create({ data: agent });
  }
  console.log(`✅ ${AI_AGENTS.length} AI agents created`);

  // ── SYSTEM SETTINGS ────────────────────────────────────────────────────────
  const settings = { company_name: 'Omoibo Global Limited', company_email: 'info@omoibo.com', company_phone: '08012345678', currency: 'NGN', tax_number: 'RC123456789', invoice_prefix: 'INV', financial_year_start: '01-01', default_payment_terms: '30' };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log('✅ System settings configured');

  console.log('\n🎉 Omoibo CRM v2.0 seeded successfully!');
  console.log('\n📋 LOGIN CREDENTIALS (password: Admin@1234)');
  console.log('─'.repeat(55));
  USERS.forEach(u => console.log(`  ${u.role.padEnd(22)} ${u.email}`));
  console.log('\n🏭 WAREHOUSES: Lagos Main | Abuja DC | Port Harcourt Depot');
  console.log('📊 CHART OF ACCOUNTS: 28 accounts across Assets/Liabilities/Equity/Income/Expenses');
  console.log('🤖 AI AGENTS: 5 agents ready (Sales, Finance, Inventory, HR, Executive)');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
