import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getFinanceStats, getInvoices, createInvoice, sendInvoice, voidInvoice,
  getBills, createBill, getPayments, createPayment,
  getPettyCash, createPettyCash, approvePettyCash, disbursePettyCash,
  getBudgets, createBudget, getTransactions, createTransaction,
  getChartOfAccounts, getPLReport, getCashFlowReport, getBalanceSheet, getARAgingReport,
  getBankAccounts, createBankAccount, getContacts, getAccounts, getProducts, getSuppliers
} from '../../api/client';
import { Modal, Badge, Tabs, SearchBar, EmptyState, Loading, fmtCurrency, fmtDate, PageHeader, Card, Field, Input, Select, Textarea, ProgressBar } from '../../components/ui';
import { DollarSign, FileText, TrendingUp, TrendingDown, CreditCard, PieChart, AlertCircle, CheckCircle, Plus, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

export default function Finance() {
  const { user, hasPermission } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Data states
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [coa, setCoa] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [plReport, setPLReport] = useState(null);
  const [cashFlow, setCashFlow] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [arAging, setArAging] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // UI states
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [form, setForm] = useState({});
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, inv, bill, pay, pc, bud, tx, coaData, banks] = await Promise.all([
        getFinanceStats(), getInvoices(), getBills(), getPayments(),
        getPettyCash(), getBudgets(), getTransactions(), getChartOfAccounts(), getBankAccounts()
      ]);
      setStats(s.data.data); setInvoices(inv.data.data); setBills(bill.data.data);
      setPayments(pay.data.data); setPettyCash(pc.data.data); setBudgets(bud.data.data);
      setTransactions(tx.data.data); setCoa(coaData.data.data); setBankAccounts(banks.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'reports') loadReports();
    if (tab === 'invoices' || tab === 'bills' || tab === 'quotes') loadSalesData();
  }, [tab]);

  const loadReports = async () => {
    try {
      const [pl, cf, bs, ar] = await Promise.all([getPLReport(), getCashFlowReport(), getBalanceSheet(), getARAgingReport()]);
      setPLReport(pl.data.data); setCashFlow(cf.data.data); setBalanceSheet(bs.data.data); setArAging(ar.data.data);
    } catch {}
  };

  const loadSalesData = async () => {
    try {
      const [c, a, p, s] = await Promise.all([getContacts(), getAccounts(), getProducts(), getSuppliers()]);
      setContacts(c.data.data); setAccounts(a.data.data); setProducts(p.data.data); setSuppliers(s.data.data);
    } catch {}
  };

  // ── LINE ITEMS ───────────────────────────────────────────────────────────────
  const updateLineItem = (i, field, val) => {
    const items = [...lineItems];
    items[i] = { ...items[i], [field]: val };
    const q = Number(items[i].quantity || 0);
    const p = Number(items[i].unitPrice || 0);
    const d = Number(items[i].discount || 0);
    items[i].total = q * p * (1 - d / 100);
    setLineItems(items);
  };
  const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  const removeLineItem = (i) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const lineSubtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const lineTax = lineSubtotal * ((Number(form.taxRate) || 7.5) / 100);
  const lineTotal = lineSubtotal + lineTax - (Number(form.discount) || 0);

  // ── INVOICE ACTIONS ──────────────────────────────────────────────────────────
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await createInvoice({ ...form, lineItems, taxRate: Number(form.taxRate || 7.5), discount: Number(form.discount || 0) });
      toast.success('Invoice created'); setShowModal(null); setForm({}); setLineItems([{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); }
  };

  const handleSendInvoice = async (id) => {
    try { await sendInvoice(id); toast.success('Invoice marked as sent'); load(); } catch { toast.error('Failed'); }
  };

  const handleVoidInvoice = async (id) => {
    if (!window.confirm('Void this invoice? This cannot be undone.')) return;
    try { await voidInvoice(id); toast.success('Invoice voided'); load(); } catch { toast.error('Failed'); }
  };

  // ── BILL ACTIONS ─────────────────────────────────────────────────────────────
  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      await createBill({ ...form, lineItems });
      toast.success('Bill recorded'); setShowModal(null); setForm({}); setLineItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ── PAYMENT ACTIONS ──────────────────────────────────────────────────────────
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await createPayment(form);
      toast.success('Payment recorded'); setShowModal(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ── PETTY CASH ───────────────────────────────────────────────────────────────
  const handlePettyCashSubmit = async (e) => {
    e.preventDefault();
    try { await createPettyCash(form); toast.success('Request submitted'); setShowModal(null); setForm({}); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleApprove = async (id, status) => {
    try { await approvePettyCash(id, { status }); toast.success(status === 'APPROVED' ? 'Approved!' : 'Rejected'); load(); }
    catch { toast.error('Failed'); }
  };
  const handleDisburse = async (id) => {
    try { await disbursePettyCash(id, { receiptRef: `RCP-${Date.now()}` }); toast.success('Disbursed'); load(); }
    catch { toast.error('Failed'); }
  };

  // ── TRANSACTION ──────────────────────────────────────────────────────────────
  const handleTransaction = async (e) => {
    e.preventDefault();
    try { await createTransaction({ ...form, amount: Number(form.amount) }); toast.success('Recorded'); setShowModal(null); setForm({}); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ── BUDGET ───────────────────────────────────────────────────────────────────
  const handleBudget = async (e) => {
    e.preventDefault();
    try { await createBudget({ ...form, amount: Number(form.amount) }); toast.success('Budget created'); setShowModal(null); setForm({}); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'invoices', label: 'Invoices', count: stats.invoices?.outstanding },
    { id: 'bills', label: 'Bills / AP', count: stats.invoices?.overdue },
    { id: 'payments', label: 'Payments' },
    { id: 'petty-cash', label: 'Petty Cash', count: stats.pettyCashPending },
    { id: 'transactions', label: 'Transactions' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'reports', label: 'Reports' },
    ...(hasPermission('manage_finance') ? [{ id: 'coa', label: 'Chart of Accounts' }] : []),
  ];

  const filteredInvoices = invoices.filter(i => {
    const matchSearch = !search || i.invoiceNumber?.includes(search) || i.contact?.firstName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !invoiceFilter || i.status === invoiceFilter;
    return matchSearch && matchFilter;
  });

  if (loading && tab === 'dashboard') return <div className="page"><Loading text="Loading Finance..." /></div>;

  return (
    <div className="page fade-in">
      <PageHeader title="Finance & Accounts" subtitle="Invoices, bills, payments, and financial reporting">
        <button className="btn btn-outline btn-sm" onClick={() => { setShowModal('transaction'); setForm({ type: 'EXPENSE' }); }}><Plus size={13} /> Record Transaction</button>
        <button className="btn btn-outline btn-sm" onClick={() => { setShowModal('petty-cash'); setForm({}); }}><Plus size={13} /> Petty Cash</button>
        {hasPermission('create_transactions') && (
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('invoice'); setForm({ taxRate: 7.5 }); setLineItems([{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]); loadSalesData(); }}>
            <Plus size={13} /> New Invoice
          </button>
        )}
      </PageHeader>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── DASHBOARD ─────────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <>
          <div className="stat-grid">
            <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="stat-icon" style={{ background: 'var(--success-light)' }}><TrendingUp size={20} color="var(--success)" /></div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--success)' }}>{fmtCurrency(stats.totals?.income)}</div>
              <div className="stat-change">Recorded income</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div className="stat-icon" style={{ background: 'var(--danger-light)' }}><TrendingDown size={20} color="var(--danger)" /></div>
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--danger)' }}>{fmtCurrency(stats.totals?.expenses)}</div>
              <div className="stat-change">Recorded expenses</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div className="stat-icon" style={{ background: '#E8EFFE' }}><DollarSign size={20} color="var(--primary)" /></div>
              <div className="stat-label">Net Profit</div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--primary)' }}>{fmtCurrency(stats.totals?.netProfit)}</div>
              <div className="stat-change">{stats.totals?.income > 0 ? ((stats.totals.netProfit / stats.totals.income) * 100).toFixed(1) : 0}% margin</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div className="stat-icon" style={{ background: 'var(--warning-light)' }}><AlertCircle size={20} color="var(--warning)" /></div>
              <div className="stat-label">Outstanding Invoices</div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--warning)' }}>{fmtCurrency(stats.invoices?.outstandingValue)}</div>
              <div className="stat-change">{stats.invoices?.outstanding} invoices · {stats.invoices?.overdue} overdue</div>
            </div>
          </div>

          <div className="grid-2 mt-4">
            <Card title="Invoice Summary">
              <div style={{ padding: '0 20px' }}>
                {[
                  { label: 'Draft', count: stats.invoices?.draft, color: 'var(--text3)' },
                  { label: 'Sent / Outstanding', count: stats.invoices?.outstanding, value: stats.invoices?.outstandingValue, color: 'var(--accent)' },
                  { label: 'Overdue', count: stats.invoices?.overdue, color: 'var(--danger)' },
                  { label: 'Paid', count: stats.invoices?.paid, value: stats.invoices?.paidValue, color: 'var(--success)' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: 13 }}>{r.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {r.value !== undefined && <span style={{ color: r.color, fontWeight: 700 }}>{fmtCurrency(r.value)}</span>}
                      <span style={{ background: 'var(--surface2)', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: r.color }}>{r.count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Budget vs Actual">
              <div style={{ padding: '0 20px' }}>
                {budgets.slice(0, 5).map((b, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{b.department}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtCurrency(b.spent)} / {fmtCurrency(b.amount)}</span>
                    </div>
                    <ProgressBar value={b.spent} max={b.amount} />
                  </div>
                ))}
                {budgets.length === 0 && <EmptyState icon="📊" title="No budgets yet" />}
              </div>
            </Card>
          </div>

          <Card title="Bills Payable" style={{ marginTop: 16 }}>
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Total outstanding payables</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)' }}>{fmtCurrency(stats.bills?.totalDue)}</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setTab('bills')}>View All Bills →</button>
            </div>
          </Card>

          {stats.pettyCashPending > 0 && (
            <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 10, padding: '14px 20px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={18} color="var(--warning)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{stats.pettyCashPending} petty cash request{stats.pettyCashPending > 1 ? 's' : ''} awaiting approval</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setTab('petty-cash')}>Review →</button>
            </div>
          )}
        </>
      )}

      {/* ── INVOICES ──────────────────────────────────────────────────────────── */}
      {tab === 'invoices' && (
        <Card title={`Invoices (${filteredInvoices.length})`} actions={
          <>
            <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..." />
            <select className="form-control" style={{ width: 160 }} value={invoiceFilter} onChange={e => setInvoiceFilter(e.target.value)}>
              <option value="">All Status</option>
              {['DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE','VOID'].map(s => <option key={s}>{s.replace('_',' ')}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('invoice'); setForm({ taxRate: 7.5 }); setLineItems([{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]); loadSalesData(); }}>
              <Plus size={13} /> New Invoice
            </button>
          </>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice #</th><th>Customer</th><th>Issue Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredInvoices.length === 0 && <tr><td colSpan={9}><EmptyState icon="📄" title="No invoices found" /></td></tr>}
                {filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td><span className="font-mono" style={{ fontWeight: 600 }}>{inv.invoiceNumber}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName}` : inv.account?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{inv.contact?.email}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{fmtDate(inv.issueDate)}</td>
                    <td style={{ fontSize: 12, color: new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? 'var(--danger)' : 'var(--text2)' }}>{fmtDate(inv.dueDate)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(inv.total)}</td>
                    <td style={{ color: 'var(--success)' }}>{fmtCurrency(inv.amountPaid)}</td>
                    <td style={{ fontWeight: 700, color: inv.amountDue > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmtCurrency(inv.amountDue)}</td>
                    <td><Badge status={inv.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setSelectedRecord(inv); setShowModal('view-invoice'); }}>View</button>
                        {inv.status === 'DRAFT' && <button className="btn btn-outline btn-sm" onClick={() => handleSendInvoice(inv.id)}>Send</button>}
                        {['SENT','PARTIALLY_PAID','OVERDUE'].includes(inv.status) && (
                          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('payment'); setForm({ invoiceId: inv.id, amount: inv.amountDue }); }}>Pay</button>
                        )}
                        {inv.status !== 'VOID' && inv.status !== 'PAID' && (
                          <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleVoidInvoice(inv.id)}>Void</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── BILLS ─────────────────────────────────────────────────────────────── */}
      {tab === 'bills' && (
        <Card title={`Bills — Accounts Payable (${bills.length})`} actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('bill'); setForm({}); setLineItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]); loadSalesData(); }}>
            <Plus size={13} /> Record Bill
          </button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Bill #</th><th>Supplier</th><th>Bill Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bills.length === 0 && <tr><td colSpan={9}><EmptyState icon="📃" title="No bills recorded" /></td></tr>}
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{bill.billNumber}</td>
                    <td style={{ fontWeight: 600 }}>{bill.supplier?.name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(bill.billDate)}</td>
                    <td style={{ fontSize: 12, color: new Date(bill.dueDate) < new Date() && bill.status !== 'PAID' ? 'var(--danger)' : 'var(--text2)' }}>{fmtDate(bill.dueDate)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(bill.total)}</td>
                    <td style={{ color: 'var(--success)' }}>{fmtCurrency(bill.amountPaid)}</td>
                    <td style={{ fontWeight: 700, color: bill.amountDue > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmtCurrency(bill.amountDue)}</td>
                    <td><Badge status={bill.status} /></td>
                    <td>
                      {['RECEIVED','PARTIALLY_PAID'].includes(bill.status) && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('payment'); setForm({ billId: bill.id, amount: bill.amountDue }); }}>Pay</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── PAYMENTS ──────────────────────────────────────────────────────────── */}
      {tab === 'payments' && (
        <Card title={`Payments (${payments.length})`} actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('payment'); setForm({}); }}><Plus size={13} /> Record Payment</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Invoice / Bill</th><th>Amount</th><th>Method</th><th>Reference</th><th>Recorded By</th></tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={6}><EmptyState icon="💳" title="No payments recorded" /></td></tr>}
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: 12 }}>{fmtDate(p.paymentDate)}</td>
                    <td><span className="font-mono" style={{ fontSize: 12 }}>{p.invoice?.invoiceNumber || p.bill?.billNumber || '—'}</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtCurrency(p.amount)}</td>
                    <td>{p.method?.replace('_', ' ')}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{p.reference || '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.recordedBy?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── PETTY CASH ────────────────────────────────────────────────────────── */}
      {tab === 'petty-cash' && (
        <Card title="Petty Cash Requests" actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('petty-cash'); setForm({}); }}><Plus size={13} /> New Request</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Requester</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Requested</th><th>Approved By</th><th>Disbursed</th><th>Actions</th></tr></thead>
              <tbody>
                {pettyCash.length === 0 && <tr><td colSpan={8}><EmptyState icon="💰" title="No petty cash requests" /></td></tr>}
                {pettyCash.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.requester?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.requester?.department}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}><div style={{ fontSize: 13 }}>{r.purpose}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.description}</div></td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(r.amount)}</td>
                    <td><Badge status={r.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(r.createdAt)}</td>
                    <td style={{ fontSize: 12 }}>{r.approver?.name || '—'}</td>
                    <td>{r.disbursedAt ? <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ {fmtDate(r.disbursedAt)}</span> : <span style={{ color: 'var(--text3)', fontSize: 12 }}>Pending</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {r.status === 'PENDING' && hasPermission('approve_petty_cash') && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff' }} onClick={() => handleApprove(r.id, 'APPROVED')}>Approve</button>
                            <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleApprove(r.id, 'REJECTED')}>Reject</button>
                          </>
                        )}
                        {r.status === 'APPROVED' && !r.disbursedAt && hasPermission('process_payments') && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleDisburse(r.id)}>Disburse</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TRANSACTIONS ──────────────────────────────────────────────────────── */}
      {tab === 'transactions' && (
        <Card title={`Transactions (${transactions.length})`} actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('transaction'); setForm({ type: 'INCOME' }); }}><Plus size={13} /> Record</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Amount</th><th>Category</th><th>Description</th><th>Recorded By</th><th>Approved By</th><th>Date</th></tr></thead>
              <tbody>
                {transactions.length === 0 && <tr><td colSpan={7}><EmptyState icon="📊" title="No transactions" /></td></tr>}
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td><Badge status={t.type} label={t.type} /></td>
                    <td style={{ fontWeight: 700, color: t.type === 'INCOME' ? 'var(--success)' : 'var(--danger)' }}>{fmtCurrency(t.amount)}</td>
                    <td style={{ fontSize: 12 }}>{t.category}</td>
                    <td style={{ fontSize: 12, maxWidth: 200 }}>{t.description || '—'}</td>
                    <td style={{ fontSize: 12 }}>{t.createdBy?.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{t.approvedBy?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── BUDGETS ───────────────────────────────────────────────────────────── */}
      {tab === 'budgets' && (
        <Card title="Department Budgets" actions={
          hasPermission('manage_finance') && <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('budget'); setForm({}); }}><Plus size={13} /> New Budget</button>
        }>
          <div style={{ padding: 20 }}>
            {budgets.length === 0 && <EmptyState icon="📊" title="No budgets created" />}
            {budgets.map((b, i) => (
              <div key={i} style={{ marginBottom: 24, padding: '16px 20px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{b.department} · {b.period}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtCurrency(b.spent)} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>/ {fmtCurrency(b.amount)}</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtCurrency(b.amount - b.spent)} remaining</div>
                  </div>
                </div>
                <ProgressBar value={b.spent} max={b.amount} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── REPORTS ───────────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div>
          {/* P&L */}
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <Card title="Profit & Loss Statement">
              {plReport ? (
                <div style={{ padding: '0 20px' }}>
                  {[
                    { label: 'Sales Revenue (Transactions)', value: plReport.revenue?.transactions, color: 'var(--success)' },
                    { label: 'Invoice Revenue (Paid)', value: plReport.revenue?.invoices, color: 'var(--success)' },
                    { label: 'Total Revenue', value: plReport.revenue?.total, color: 'var(--success)', bold: true },
                    { label: 'Transaction Expenses', value: plReport.expenses?.transactions, color: 'var(--danger)' },
                    { label: 'Bills Paid', value: plReport.expenses?.bills, color: 'var(--danger)' },
                    { label: 'Petty Cash', value: plReport.expenses?.pettyCash, color: 'var(--danger)' },
                    { label: 'Total Expenses', value: plReport.expenses?.total, color: 'var(--danger)', bold: true },
                    { label: 'NET PROFIT', value: plReport.netProfit, color: plReport.netProfit >= 0 ? 'var(--success)' : 'var(--danger)', bold: true, large: true },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', borderTop: r.large ? '2px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: r.bold ? 13 : 12, fontWeight: r.bold ? 700 : 400, color: 'var(--text2)' }}>{r.label}</span>
                      <span style={{ fontWeight: r.bold ? 800 : 600, color: r.color, fontSize: r.large ? 16 : 13 }}>{fmtCurrency(r.value)}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>Profit Margin: {plReport.profitMargin}%</div>
                </div>
              ) : <Loading />}
            </Card>

            <Card title="Balance Sheet">
              {balanceSheet ? (
                <div style={{ padding: '0 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 0 4px' }}>Assets</div>
                  {[
                    { label: 'Accounts Receivable', value: balanceSheet.assets?.receivables },
                    { label: 'Fixed Assets', value: balanceSheet.assets?.fixedAssets },
                    { label: 'Total Assets', value: balanceSheet.assets?.total, bold: true },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                      <span style={{ fontWeight: r.bold ? 700 : 600, color: 'var(--success)' }}>{fmtCurrency(r.value)}</span>
                    </div>
                  ))}
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 0 4px' }}>Liabilities</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12 }}>Accounts Payable</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmtCurrency(balanceSheet.liabilities?.payables)}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 0 4px' }}>Equity</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: 12 }}>Retained Earnings</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmtCurrency(balanceSheet.equity?.retained)}</span>
                  </div>
                </div>
              ) : <Loading />}
            </Card>
          </div>

          {/* Cash Flow */}
          <Card title="Cash Flow — Last 6 Months" style={{ marginBottom: 16 }}>
            <div style={{ padding: 20 }}>
              {cashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => fmtCurrency(v)} />
                    <Legend />
                    <Bar dataKey="inflow" name="Cash In" fill="#059669" radius={[3,3,0,0]} />
                    <Bar dataKey="outflow" name="Cash Out" fill="#DC2626" radius={[3,3,0,0]} />
                    <Bar dataKey="net" name="Net" fill="#1B3A6B" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon="📈" title="No cash flow data yet" sub="Record payments to see cash flow analysis" />}
            </div>
          </Card>

          {/* AR Aging */}
          <Card title="Accounts Receivable Aging">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Aging Period</th><th>Count</th><th>Total Outstanding</th><th>% of AR</th></tr></thead>
                <tbody>
                  {arAging.length === 0 && <tr><td colSpan={4}><EmptyState icon="📊" title="No outstanding invoices" /></td></tr>}
                  {arAging.map((b, i) => {
                    const totalAR = arAging.reduce((s, x) => s + x.total, 0);
                    const labels = { current: 'Current (not yet due)', '1_30': '1-30 days overdue', '31_60': '31-60 days overdue', '61_90': '61-90 days overdue', over_90: '90+ days overdue' };
                    const colors = { current: 'var(--success)', '1_30': 'var(--warning)', '31_60': 'var(--orange)', '61_90': 'var(--danger)', over_90: '#8B0000' };
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: colors[b.period] }}>{labels[b.period] || b.period}</td>
                        <td>{b.count}</td>
                        <td style={{ fontWeight: 700, color: colors[b.period] }}>{fmtCurrency(b.total)}</td>
                        <td>{totalAR > 0 ? ((b.total / totalAR) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── CHART OF ACCOUNTS ─────────────────────────────────────────────────── */}
      {tab === 'coa' && (
        <Card title={`Chart of Accounts (${coa.length})`} actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal('coa'); setForm({ type: 'INCOME', openingBalance: 0 }); }}><Plus size={13} /> Add Account</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Sub Type</th><th>Opening Balance</th><th>Status</th></tr></thead>
              <tbody>
                {coa.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono" style={{ fontWeight: 700 }}>{a.code}</td>
                    <td style={{ fontWeight: a.subType ? 400 : 600, paddingLeft: a.subType ? 24 : 14 }}>{a.name}</td>
                    <td><span style={{ fontSize: 11, background: { ASSET: '#EFF6FF', LIABILITY: '#FEF2F2', EQUITY: '#F5F3FF', INCOME: '#ECFDF5', EXPENSE: '#FFFBEB' }[a.type] || '#F1F5F9', color: { ASSET: '#2563EB', LIABILITY: '#DC2626', EQUITY: '#7C3AED', INCOME: '#059669', EXPENSE: '#D97706' }[a.type] || '#64748B', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{a.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{a.subType?.replace('_', ' ') || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtCurrency(a.openingBalance)}</td>
                    <td><Badge status={a.isActive ? 'ACTIVE' : 'VOID'} label={a.isActive ? 'Active' : 'Inactive'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ MODALS ════════════════════════════════════════════════════════════════ */}

      {/* Create Invoice */}
      {showModal === 'invoice' && (
        <Modal title="Create Invoice" onClose={() => setShowModal(null)} size="xl">
          <form onSubmit={handleCreateInvoice}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Contact"><Select value={form.contactId || ''} onChange={e => setForm({ ...form, contactId: e.target.value })}><option value="">Select contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</Select></Field>
                <Field label="Account"><Select value={form.accountId || ''} onChange={e => setForm({ ...form, accountId: e.target.value })}><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
                <Field label="Issue Date"><Input type="date" value={form.issueDate || new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, issueDate: e.target.value })} /></Field>
                <Field label="Due Date"><Input type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></Field>
                <Field label="Tax Rate (%)"><Input type="number" value={form.taxRate || 7.5} onChange={e => setForm({ ...form, taxRate: e.target.value })} /></Field>
                <Field label="Discount (₦)"><Input type="number" value={form.discount || ''} onChange={e => setForm({ ...form, discount: e.target.value })} placeholder="0" /></Field>
              </div>

              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Line Items</div>
                <div style={{ background: 'var(--surface2)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'var(--border)' }}><th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>Description</th><th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', width: 100 }}>Qty</th><th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', width: 130 }}>Unit Price</th><th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', width: 80 }}>Disc%</th><th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', width: 130 }}>Total</th><th style={{ width: 40 }}></th></tr></thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px' }}>
                            <input className="form-control" style={{ fontSize: 12, padding: '4px 8px' }} placeholder="Description" value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} required />
                          </td>
                          <td style={{ padding: '6px 10px' }}><input className="form-control" style={{ fontSize: 12, padding: '4px 8px', textAlign: 'right' }} type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} min="0" /></td>
                          <td style={{ padding: '6px 10px' }}><input className="form-control" style={{ fontSize: 12, padding: '4px 8px', textAlign: 'right' }} type="number" value={item.unitPrice} onChange={e => updateLineItem(i, 'unitPrice', e.target.value)} min="0" /></td>
                          <td style={{ padding: '6px 10px' }}><input className="form-control" style={{ fontSize: 12, padding: '4px 8px', textAlign: 'right' }} type="number" value={item.discount} onChange={e => updateLineItem(i, 'discount', e.target.value)} min="0" max="100" /></td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>{fmtCurrency(item.total)}</td>
                          <td style={{ padding: '6px 4px' }}><button type="button" onClick={() => removeLineItem(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" onClick={addLineItem} style={{ width: '100%', padding: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'inherit', fontWeight: 600 }}>+ Add Line Item</button>
                </div>
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Subtotal: <strong>{fmtCurrency(lineSubtotal)}</strong></div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>VAT ({form.taxRate || 7.5}%): <strong>{fmtCurrency(lineTax)}</strong></div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>Total: {fmtCurrency(lineTotal)}</div>
                </div>
              </div>
              <Field label="Notes"><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, notes..." /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Invoice</button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Invoice */}
      {showModal === 'view-invoice' && selectedRecord && (
        <Modal title={`Invoice ${selectedRecord.invoiceNumber}`} onClose={() => { setShowModal(null); setSelectedRecord(null); }} size="lg">
          <div className="modal-body">
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Customer</div><div style={{ fontWeight: 700 }}>{selectedRecord.contact ? `${selectedRecord.contact.firstName} ${selectedRecord.contact.lastName}` : selectedRecord.account?.name || '—'}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Status</div><Badge status={selectedRecord.status} /></div>
              <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Issue Date</div><div>{fmtDate(selectedRecord.issueDate)}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Due Date</div><div>{fmtDate(selectedRecord.dueDate)}</div></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead><tr style={{ borderBottom: '2px solid var(--border)' }}><th style={{ textAlign: 'left', padding: '8px', fontSize: 11, color: 'var(--text3)' }}>Description</th><th style={{ textAlign: 'right', padding: '8px', fontSize: 11, color: 'var(--text3)' }}>Qty</th><th style={{ textAlign: 'right', padding: '8px', fontSize: 11, color: 'var(--text3)' }}>Unit Price</th><th style={{ textAlign: 'right', padding: '8px', fontSize: 11, color: 'var(--text3)' }}>Total</th></tr></thead>
              <tbody>{selectedRecord.lineItems?.map((li, i) => <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px', fontSize: 12 }}>{li.description}</td><td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{li.quantity}</td><td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{fmtCurrency(li.unitPrice)}</td><td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(li.total)}</td></tr>)}</tbody>
            </table>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Subtotal: {fmtCurrency(selectedRecord.subtotal)}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>VAT ({selectedRecord.taxRate}%): {fmtCurrency(selectedRecord.taxAmount)}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Total: {fmtCurrency(selectedRecord.total)}</div>
              <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>Paid: {fmtCurrency(selectedRecord.amountPaid)}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: selectedRecord.amountDue > 0 ? 'var(--danger)' : 'var(--success)' }}>Balance Due: {fmtCurrency(selectedRecord.amountDue)}</div>
            </div>
            {selectedRecord.payments?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Payment History</div>
                {selectedRecord.payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--success-light)', borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12 }}>{fmtDate(p.paymentDate)} · {p.method?.replace('_',' ')} · {p.reference || ''}</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => { setShowModal(null); setSelectedRecord(null); }}>Close</button>
            {['SENT','PARTIALLY_PAID','OVERDUE'].includes(selectedRecord.status) && (
              <button className="btn btn-primary" onClick={() => { setShowModal('payment'); setForm({ invoiceId: selectedRecord.id, amount: selectedRecord.amountDue }); }}>Record Payment</button>
            )}
          </div>
        </Modal>
      )}

      {/* Create Bill */}
      {showModal === 'bill' && (
        <Modal title="Record Bill" onClose={() => setShowModal(null)} size="lg">
          <form onSubmit={handleCreateBill}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Supplier"><Select value={form.supplierId || ''} onChange={e => setForm({ ...form, supplierId: e.target.value })}><option value="">Select supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                <Field label="Bill Date"><Input type="date" value={form.billDate || new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, billDate: e.target.value })} /></Field>
                <Field label="Due Date" required><Input type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} required /></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Line Items</div>
                {lineItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                    <Field label={i === 0 ? 'Description' : ''} style={{ flex: 2 }}><Input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Item description" required /></Field>
                    <Field label={i === 0 ? 'Qty' : ''} style={{ width: 80 }}><Input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} min="0" /></Field>
                    <Field label={i === 0 ? 'Unit Cost' : ''} style={{ width: 140 }}><Input type="number" value={item.unitPrice} onChange={e => updateLineItem(i, 'unitPrice', e.target.value)} min="0" /></Field>
                    <div style={{ width: 100, textAlign: 'right', fontWeight: 600, paddingBottom: 4 }}>{fmtCurrency(item.total)}</div>
                    <button type="button" onClick={() => removeLineItem(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', paddingBottom: 4 }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={addLineItem} className="btn btn-outline btn-sm">+ Add Item</button>
                <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 700, fontSize: 14 }}>Total: {fmtCurrency(lineSubtotal)}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Record Bill</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Payment */}
      {showModal === 'payment' && (
        <Modal title="Record Payment" onClose={() => setShowModal(null)}>
          <form onSubmit={handleRecordPayment}>
            <div className="modal-body">
              {!form.invoiceId && !form.billId && (
                <div className="grid-2">
                  <Field label="Invoice"><Select value={form.invoiceId || ''} onChange={e => setForm({ ...form, invoiceId: e.target.value, billId: '' })}><option value="">Select invoice</option>{invoices.filter(i => ['SENT','PARTIALLY_PAID','OVERDUE'].includes(i.status)).map(i => <option key={i.id} value={i.id}>{i.invoiceNumber} — {fmtCurrency(i.amountDue)}</option>)}</Select></Field>
                  <Field label="Bill"><Select value={form.billId || ''} onChange={e => setForm({ ...form, billId: e.target.value, invoiceId: '' })}><option value="">Select bill</option>{bills.filter(b => ['RECEIVED','PARTIALLY_PAID'].includes(b.status)).map(b => <option key={b.id} value={b.id}>{b.billNumber} — {fmtCurrency(b.amountDue)}</option>)}</Select></Field>
                </div>
              )}
              {(form.invoiceId || form.billId) && <div style={{ padding: '10px 14px', background: 'var(--success-light)', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{form.invoiceId ? `Invoice: ${invoices.find(i => i.id === form.invoiceId)?.invoiceNumber}` : `Bill: ${bills.find(b => b.id === form.billId)?.billNumber}`}</div>}
              <div className="grid-2">
                <Field label="Amount (₦)" required><Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0" /></Field>
                <Field label="Payment Date"><Input type="date" value={form.paymentDate || new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, paymentDate: e.target.value })} /></Field>
                <Field label="Method"><Select value={form.method || 'BANK_TRANSFER'} onChange={e => setForm({ ...form, method: e.target.value })}>{['BANK_TRANSFER','CASH','CHEQUE','CARD','PAYSTACK','FLUTTERWAVE','OTHER'].map(m => <option key={m}>{m.replace('_',' ')}</option>)}</Select></Field>
                <Field label="Bank Name"><Input value={form.bankName || ''} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. Zenith Bank" /></Field>
                <Field label="Reference / Receipt No"><Input value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. ZB/2026/001" /></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Record Payment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Petty Cash */}
      {showModal === 'petty-cash' && (
        <Modal title="Petty Cash Request" onClose={() => setShowModal(null)}>
          <form onSubmit={handlePettyCashSubmit}>
            <div className="modal-body">
              <Field label="Purpose" required><Input value={form.purpose || ''} onChange={e => setForm({ ...form, purpose: e.target.value })} required /></Field>
              <Field label="Amount (₦)" required><Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" /></Field>
              <Field label="Description"><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional details..." /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transaction */}
      {showModal === 'transaction' && (
        <Modal title="Record Transaction" onClose={() => setShowModal(null)}>
          <form onSubmit={handleTransaction}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Type"><Select value={form.type || 'INCOME'} onChange={e => setForm({ ...form, type: e.target.value })}>{['INCOME','EXPENSE','TRANSFER'].map(t => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="Amount (₦)" required><Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0" /></Field>
                <Field label="Category" required><Input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Sales Revenue, Logistics" required /></Field>
                <Field label="Reference"><Input value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} /></Field>
              </div>
              <Field label="Description"><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Record</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Budget */}
      {showModal === 'budget' && (
        <Modal title="Create Budget" onClose={() => setShowModal(null)}>
          <form onSubmit={handleBudget}>
            <div className="modal-body">
              <Field label="Title" required><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} required /></Field>
              <div className="grid-2">
                <Field label="Department"><Select value={form.department || 'SALES'} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {['ADMINISTRATION','SALES','INVENTORY','LOGISTICS','FINANCE','HR','FACILITY','EXECUTIVE'].map(d => <option key={d}>{d}</option>)}
                </Select></Field>
                <Field label="Period" required><Input value={form.period || ''} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2026-Q1" required /></Field>
                <Field label="Budget Amount (₦)" required><Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0" /></Field>
                <Field label="Spent So Far (₦)"><Input type="number" value={form.spent || 0} onChange={e => setForm({ ...form, spent: e.target.value })} min="0" /></Field>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Budget</button>
            </div>
          </form>
        </Modal>
      )}

      {/* COA */}
      {showModal === 'coa' && (
        <Modal title="Add Account to Chart of Accounts" onClose={() => setShowModal(null)}>
          <form onSubmit={async e => { e.preventDefault(); try { await createChartAccount({ ...form, openingBalance: Number(form.openingBalance || 0) }); toast.success('Account created'); setShowModal(null); load(); } catch { toast.error('Failed'); }}}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Account Code" required><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 4100" required /></Field>
                <Field label="Account Name" required><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Type"><Select value={form.type || 'INCOME'} onChange={e => setForm({ ...form, type: e.target.value })}>{['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'].map(t => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="Opening Balance (₦)"><Input type="number" value={form.openingBalance || 0} onChange={e => setForm({ ...form, openingBalance: e.target.value })} /></Field>
              </div>
              <Field label="Description"><Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Account</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
