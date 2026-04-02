import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getLeads, createLead, updateLead,
  getDeals, createDeal, updateDeal,
  getContacts, createContact, updateContact,
  getAccounts, createAccount, updateAccount,
  getActivities, createActivity,
  getTasks, createTask, updateTask,
  getSalesStats, getAllUsers
} from '../../api/client';
import { Modal, Badge, Tabs, SearchBar, EmptyState, Loading, fmtCurrency, fmtDate, PageHeader, Card, Field, Input, Select, Textarea } from '../../components/ui';
import { TrendingUp, Users, Target, DollarSign, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const DEAL_STAGES = ['QUALIFICATION','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'];
const STAGE_COLORS = { QUALIFICATION:'#3B82F6', PROPOSAL:'#D97706', NEGOTIATION:'#7C3AED', CLOSED_WON:'#059669', CLOSED_LOST:'#DC2626' };

export default function Sales() {
  const { user, hasPermission } = useAuth();
  const [tab, setTab] = useState('leads');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [actTarget, setActTarget] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l, d, c, a, act, t, u] = await Promise.all([
        getSalesStats(), getLeads(), getDeals(), getContacts(), getAccounts(),
        getActivities(), getTasks(), getAllUsers()
      ]);
      setStats(s.data.data); setLeads(l.data.data); setDeals(d.data.data);
      setContacts(c.data.data); setAccounts(a.data.data);
      setActivities(act.data.data); setTasks(t.data.data); setUsers(u.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (type, item = null) => { setShowModal(type); setEditItem(item); setForm(item ? { ...item } : {}); };
  const close = () => { setShowModal(null); setEditItem(null); setForm({}); setActTarget({}); };

  const handleLead = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await updateLead(editItem.id, form); else await createLead(form);
      toast.success(editItem ? 'Lead updated' : 'Lead created'); close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDeal = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await updateDeal(editItem.id, form);
      else await createDeal({ ...form, value: Number(form.value), probability: Number(form.probability || 20) });
      toast.success(editItem ? 'Deal updated' : 'Deal created'); close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const moveDeal = async (deal, stage) => {
    try { await updateDeal(deal.id, { stage }); load(); toast.success(`→ ${stage.replace('_',' ')}`); }
    catch { toast.error('Failed'); }
  };

  const handleContact = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await updateContact(editItem.id, form); else await createContact(form);
      toast.success(editItem ? 'Updated' : 'Contact created'); close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleAccount = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await updateAccount(editItem.id, form); else await createAccount(form);
      toast.success(editItem ? 'Updated' : 'Account created'); close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleActivity = async (e) => {
    e.preventDefault();
    try { await createActivity({ ...form, ...actTarget }); toast.success('Activity logged'); close(); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleTask = async (e) => {
    e.preventDefault();
    try { await createTask({ ...form, assigneeId: form.assigneeId || user.id }); toast.success('Task created'); close(); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleTask = async (task) => {
    try { await updateTask(task.id, { status: task.status === 'DONE' ? 'OPEN' : 'DONE' }); load(); }
    catch { toast.error('Failed'); }
  };

  const filteredLeads = leads.filter(l => {
    const ms = !search || l.fullName?.toLowerCase().includes(search.toLowerCase()) || l.email?.includes(search) || l.company?.includes(search);
    const mf = !statusFilter || l.status === statusFilter;
    return ms && mf;
  });

  const TABS = [
    { id: 'leads', label: 'Leads', count: stats.totalLeads },
    { id: 'pipeline', label: 'Pipeline', count: stats.totalDeals },
    { id: 'contacts', label: 'Contacts', count: contacts.length },
    { id: 'accounts', label: 'Accounts', count: accounts.length },
    { id: 'activities', label: 'Activities', count: activities.length },
    { id: 'tasks', label: 'Tasks', count: tasks.filter(t => t.status !== 'DONE').length },
  ];

  return (
    <div className="page fade-in">
      <PageHeader title="Sales" subtitle="Leads, pipeline, contacts, accounts, and activities">
        <button className="btn btn-outline btn-sm" onClick={() => open('activity')}><Plus size={13} /> Log Activity</button>
        <button className="btn btn-outline btn-sm" onClick={() => open('deal')}><Plus size={13} /> New Deal</button>
        <button className="btn btn-primary btn-sm" onClick={() => open('lead')}><Plus size={13} /> New Lead</button>
      </PageHeader>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background:'#EFF6FF' }}><Users size={20} color="#3B82F6" /></div><div className="stat-label">Total Leads</div><div className="stat-value" style={{ color:'#3B82F6' }}>{stats.totalLeads||0}</div><div className="stat-change">{stats.newLeads||0} new</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'#F5F3FF' }}><Target size={20} color="#7C3AED" /></div><div className="stat-label">Active Deals</div><div className="stat-value" style={{ color:'#7C3AED' }}>{stats.totalDeals||0}</div><div className="stat-change">{fmtCurrency(stats.pipelineValue)} pipeline</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'#ECFDF5' }}><TrendingUp size={20} color="#059669" /></div><div className="stat-label">Deals Won</div><div className="stat-value" style={{ color:'#059669' }}>{stats.closedWon||0}</div><div className="stat-change">{stats.conversionRate}% conversion</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:'#FFFBEB' }}><DollarSign size={20} color="#D97706" /></div><div className="stat-label">Revenue Won</div><div className="stat-value" style={{ fontSize:18, color:'#D97706' }}>{fmtCurrency(stats.totalRevenue)}</div></div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* LEADS */}
      {tab === 'leads' && (
        <Card title={`Leads (${filteredLeads.length})`} actions={
          <>
            <SearchBar value={search} onChange={setSearch} placeholder="Search leads..." />
            <select className="form-control" style={{ width:160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {['NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'].map(s => <option key={s}>{s.replace('_',' ')}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => open('lead')}><Plus size={13} /> New Lead</button>
          </>
        }>
          {loading ? <Loading /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Company</th><th>Contact</th><th>Source</th><th>Status</th><th>AI Score</th><th>Assigned</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredLeads.length === 0 && <tr><td colSpan={9}><EmptyState icon="👥" title="No leads found" action={<button className="btn btn-primary" onClick={() => open('lead')}><Plus size={13} /> Create First Lead</button>} /></td></tr>}
                  {filteredLeads.map(l => (
                    <tr key={l.id}>
                      <td><div style={{ fontWeight:700 }}>{l.fullName}</div>{l.expectedValue && <div style={{ fontSize:11, color:'var(--text3)' }}>{fmtCurrency(l.expectedValue)}</div>}</td>
                      <td style={{ fontSize:13 }}>{l.company||'—'}</td>
                      <td><div style={{ fontSize:12 }}>{l.email||''}</div><div style={{ fontSize:12 }}>{l.phone||''}</div></td>
                      <td style={{ fontSize:12 }}>{l.source||'—'}</td>
                      <td><Badge status={l.status} /></td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div className="progress-bar" style={{ width:50 }}><div className="progress-fill" style={{ width:`${l.aiScore||0}%`, background: l.aiScore>75?'var(--success)':l.aiScore>50?'var(--warning)':'var(--danger)' }} /></div>
                          <span style={{ fontSize:12, fontWeight:600 }}>{Math.round(l.aiScore||0)}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:12 }}>{l.assignedTo?.name||'—'}</td>
                      <td style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(l.createdAt)}</td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => open('lead', l)}>Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setActTarget({ leadId:l.id }); open('activity'); }}>Activity</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* PIPELINE */}
      {tab === 'pipeline' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button className="btn btn-primary btn-sm" onClick={() => open('deal')}><Plus size={13} /> New Deal</button>
          </div>
          <div className="pipeline">
            {DEAL_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage);
              const stageTotal = stageDeals.reduce((s,d) => s+d.value, 0);
              return (
                <div key={stage} className="pipeline-col">
                  <div className="pipeline-header" style={{ background: STAGE_COLORS[stage]+'18', color: STAGE_COLORS[stage] }}>
                    <span>{stage.replace('_',' ')}</span>
                    <div style={{ fontSize:11 }}>{stageDeals.length} · {fmtCurrency(stageTotal)}</div>
                  </div>
                  <div className="pipeline-cards" style={{ marginTop:8 }}>
                    {stageDeals.length === 0 && <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text3)', fontSize:12 }}>No deals</div>}
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="pipeline-card" onClick={() => open('deal', deal)}>
                        <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{deal.title}</div>
                        <div style={{ fontSize:16, fontWeight:800, color:STAGE_COLORS[stage] }}>{fmtCurrency(deal.value)}</div>
                        <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{deal.account?.name||deal.lead?.fullName||'—'}</div>
                        {deal.expectedClose && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Close: {fmtDate(deal.expectedClose)}</div>}
                        <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
                          {stage !== 'CLOSED_WON' && <button className="btn btn-sm" style={{ fontSize:10, padding:'2px 6px', background:'var(--success)', color:'#fff' }} onClick={() => moveDeal(deal,'CLOSED_WON')}>Won ✓</button>}
                          {stage !== 'CLOSED_LOST' && stage !== 'CLOSED_WON' && <button className="btn btn-sm" style={{ fontSize:10, padding:'2px 6px', background:'var(--danger)', color:'#fff' }} onClick={() => moveDeal(deal,'CLOSED_LOST')}>Lost ✗</button>}
                          {DEAL_STAGES.filter(s => s !== stage && s !== 'CLOSED_WON' && s !== 'CLOSED_LOST').map(s => (
                            <button key={s} className="btn btn-outline btn-sm" style={{ fontSize:10, padding:'2px 6px' }} onClick={() => moveDeal(deal,s)}>{s.split('_')[0]}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTACTS */}
      {tab === 'contacts' && (
        <Card title={`Contacts (${contacts.length})`} actions={
          <>
            <SearchBar value={search} onChange={setSearch} placeholder="Search contacts..." />
            <button className="btn btn-primary btn-sm" onClick={() => open('contact')}><Plus size={13} /> New Contact</button>
          </>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Job Title</th><th>Account</th><th>Email</th><th>Phone</th><th>City</th><th>Actions</th></tr></thead>
              <tbody>
                {contacts.filter(c => !search || `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <tr key={c.id}>
                    <td><div style={{ display:'flex', alignItems:'center', gap:8 }}><div style={{ width:28, height:28, borderRadius:'50%', background:'var(--primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{c.firstName?.[0]}{c.lastName?.[0]}</div><span style={{ fontWeight:600 }}>{c.firstName} {c.lastName}</span></div></td>
                    <td style={{ fontSize:12 }}>{c.jobTitle||'—'}</td>
                    <td style={{ fontSize:12 }}>{c.account?.name||'—'}</td>
                    <td style={{ fontSize:12 }}>{c.email||'—'}</td>
                    <td style={{ fontSize:12 }}>{c.phone||'—'}</td>
                    <td style={{ fontSize:12 }}>{c.city||'—'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => open('contact', c)}>Edit</button></td>
                  </tr>
                ))}
                {contacts.length === 0 && <tr><td colSpan={7}><EmptyState icon="👤" title="No contacts yet" action={<button className="btn btn-primary" onClick={() => open('contact')}><Plus size={13} /> Add Contact</button>} /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ACCOUNTS */}
      {tab === 'accounts' && (
        <Card title={`Accounts (${accounts.length})`} actions={
          <>
            <SearchBar value={search} onChange={setSearch} placeholder="Search accounts..." />
            <button className="btn btn-primary btn-sm" onClick={() => open('account')}><Plus size={13} /> New Account</button>
          </>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Account</th><th>Industry</th><th>City</th><th>Annual Revenue</th><th>Employees</th><th>Contacts</th><th>Deals</th><th>Actions</th></tr></thead>
              <tbody>
                {accounts.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase())).map(a => (
                  <tr key={a.id}>
                    <td><div style={{ fontWeight:700 }}>{a.name}</div>{a.website && <a href={a.website} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--accent)' }}>{a.website}</a>}</td>
                    <td style={{ fontSize:12 }}>{a.industry||'—'}</td>
                    <td style={{ fontSize:12 }}>{a.city||'—'}</td>
                    <td style={{ fontSize:12 }}>{a.annualRevenue ? fmtCurrency(a.annualRevenue) : '—'}</td>
                    <td style={{ fontSize:12 }}>{a.employees||'—'}</td>
                    <td>{a._count?.contacts||0}</td>
                    <td>{a._count?.deals||0}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => open('account', a)}>Edit</button></td>
                  </tr>
                ))}
                {accounts.length === 0 && <tr><td colSpan={8}><EmptyState icon="🏢" title="No accounts yet" action={<button className="btn btn-primary" onClick={() => open('account')}><Plus size={13} /> Add Account</button>} /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ACTIVITIES */}
      {tab === 'activities' && (
        <Card title={`Activities (${activities.length})`} actions={
          <button className="btn btn-primary btn-sm" onClick={() => open('activity')}><Plus size={13} /> Log Activity</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Subject</th><th>Outcome</th><th>Duration</th><th>By</th><th>Date</th></tr></thead>
              <tbody>
                {activities.length === 0 && <tr><td colSpan={6}><EmptyState icon="📞" title="No activities logged" /></td></tr>}
                {activities.map(a => (
                  <tr key={a.id}>
                    <td><span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:{ CALL:'#EFF6FF', EMAIL:'#ECFDF5', MEETING:'#F5F3FF', NOTE:'#FFFBEB', TASK:'#FEF2F2' }[a.type]||'#F1F5F9', color:{ CALL:'#2563EB', EMAIL:'#059669', MEETING:'#7C3AED', NOTE:'#D97706', TASK:'#DC2626' }[a.type]||'#64748B' }}>{a.type}</span></td>
                    <td style={{ fontWeight:600 }}>{a.subject}</td>
                    <td style={{ fontSize:12, color:'var(--text3)' }}>{a.outcome||'—'}</td>
                    <td style={{ fontSize:12 }}>{a.duration ? `${a.duration} min` : '—'}</td>
                    <td style={{ fontSize:12 }}>{a.user?.name}</td>
                    <td style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TASKS */}
      {tab === 'tasks' && (
        <Card title="My Tasks" actions={<button className="btn btn-primary btn-sm" onClick={() => open('task')}><Plus size={13} /> New Task</button>}>
          <div style={{ padding:'8px 0' }}>
            {tasks.length === 0 && <EmptyState icon="✅" title="No tasks" sub="Create a task to get started" />}
            {tasks.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--border)', opacity: t.status==='DONE' ? 0.5 : 1 }}>
                <input type="checkbox" checked={t.status==='DONE'} onChange={() => toggleTask(t)} style={{ width:16, height:16, cursor:'pointer' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, textDecoration: t.status==='DONE'?'line-through':'none', fontSize:13 }}>{t.title}</div>
                  {t.description && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{t.description}</div>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Badge status={t.priority} label={t.priority} />
                  {t.dueDate && <span style={{ fontSize:12, color: new Date(t.dueDate)<new Date()&&t.status!=='DONE'?'var(--danger)':'var(--text3)' }}>Due {fmtDate(t.dueDate)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {showModal === 'lead' && (
        <Modal title={editItem ? 'Edit Lead' : 'New Lead'} onClose={close} size="lg">
          <form onSubmit={handleLead}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Full Name" required><Input value={form.fullName||''} onChange={e => setForm({...form,fullName:e.target.value})} required /></Field>
                <Field label="Company"><Input value={form.company||''} onChange={e => setForm({...form,company:e.target.value})} /></Field>
                <Field label="Email"><Input type="email" value={form.email||''} onChange={e => setForm({...form,email:e.target.value})} /></Field>
                <Field label="Phone"><Input value={form.phone||''} onChange={e => setForm({...form,phone:e.target.value})} /></Field>
                <Field label="Source"><Select value={form.source||''} onChange={e => setForm({...form,source:e.target.value})}><option value="">Select</option>{['Website','Referral','Cold Call','LinkedIn','Trade Show','Email Campaign','Walk-in','WhatsApp'].map(s => <option key={s}>{s}</option>)}</Select></Field>
                <Field label="Status"><Select value={form.status||'NEW'} onChange={e => setForm({...form,status:e.target.value})}>{['NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'].map(s => <option key={s}>{s.replace('_',' ')}</option>)}</Select></Field>
                <Field label="Expected Value (₦)"><Input type="number" value={form.expectedValue||''} onChange={e => setForm({...form,expectedValue:e.target.value})} /></Field>
                <Field label="Assign To"><Select value={form.assignedToId||''} onChange={e => setForm({...form,assignedToId:e.target.value})}><option value="">Self</option>{users.filter(u => u.department==='SALES').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem?'Update':'Create'} Lead</button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'deal' && (
        <Modal title={editItem?'Edit Deal':'New Deal'} onClose={close}>
          <form onSubmit={handleDeal}>
            <div className="modal-body">
              <Field label="Deal Title" required><Input value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} required /></Field>
              <div className="grid-2">
                <Field label="Value (₦)" required><Input type="number" value={form.value||''} onChange={e => setForm({...form,value:e.target.value})} required /></Field>
                <Field label="Stage"><Select value={form.stage||'QUALIFICATION'} onChange={e => setForm({...form,stage:e.target.value})}>{DEAL_STAGES.map(s => <option key={s}>{s.replace('_',' ')}</option>)}</Select></Field>
                <Field label="Win Probability (%)"><Input type="number" value={form.probability||20} onChange={e => setForm({...form,probability:e.target.value})} min="0" max="100" /></Field>
                <Field label="Expected Close"><Input type="date" value={form.expectedClose?.split('T')[0]||''} onChange={e => setForm({...form,expectedClose:e.target.value})} /></Field>
                <Field label="Account"><Select value={form.accountId||''} onChange={e => setForm({...form,accountId:e.target.value})}><option value="">None</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
                <Field label="Assign To"><Select value={form.assignedToId||''} onChange={e => setForm({...form,assignedToId:e.target.value})}><option value="">Self</option>{users.filter(u => u.department==='SALES').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem?'Update':'Create'} Deal</button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'contact' && (
        <Modal title={editItem?'Edit Contact':'New Contact'} onClose={close} size="lg">
          <form onSubmit={handleContact}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="First Name" required><Input value={form.firstName||''} onChange={e => setForm({...form,firstName:e.target.value})} required /></Field>
                <Field label="Last Name" required><Input value={form.lastName||''} onChange={e => setForm({...form,lastName:e.target.value})} required /></Field>
                <Field label="Job Title"><Input value={form.jobTitle||''} onChange={e => setForm({...form,jobTitle:e.target.value})} /></Field>
                <Field label="Account"><Select value={form.accountId||''} onChange={e => setForm({...form,accountId:e.target.value})}><option value="">None</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
                <Field label="Email"><Input type="email" value={form.email||''} onChange={e => setForm({...form,email:e.target.value})} /></Field>
                <Field label="Phone"><Input value={form.phone||''} onChange={e => setForm({...form,phone:e.target.value})} /></Field>
                <Field label="City"><Input value={form.city||''} onChange={e => setForm({...form,city:e.target.value})} /></Field>
                <Field label="Source"><Select value={form.source||''} onChange={e => setForm({...form,source:e.target.value})}><option value="">Select</option>{['Website','Referral','LinkedIn','Trade Show','Cold Call','Other'].map(s => <option key={s}>{s}</option>)}</Select></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem?'Update':'Create'} Contact</button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'account' && (
        <Modal title={editItem?'Edit Account':'New Account'} onClose={close} size="lg">
          <form onSubmit={handleAccount}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Account Name" required><Input value={form.name||''} onChange={e => setForm({...form,name:e.target.value})} required /></Field>
                <Field label="Industry"><Input value={form.industry||''} onChange={e => setForm({...form,industry:e.target.value})} /></Field>
                <Field label="Website"><Input type="url" value={form.website||''} onChange={e => setForm({...form,website:e.target.value})} placeholder="https://" /></Field>
                <Field label="Phone"><Input value={form.phone||''} onChange={e => setForm({...form,phone:e.target.value})} /></Field>
                <Field label="Email"><Input type="email" value={form.email||''} onChange={e => setForm({...form,email:e.target.value})} /></Field>
                <Field label="City"><Input value={form.city||''} onChange={e => setForm({...form,city:e.target.value})} /></Field>
                <Field label="Annual Revenue (₦)"><Input type="number" value={form.annualRevenue||''} onChange={e => setForm({...form,annualRevenue:e.target.value})} /></Field>
                <Field label="Employees"><Input type="number" value={form.employees||''} onChange={e => setForm({...form,employees:e.target.value})} /></Field>
                <Field label="Rating"><Select value={form.rating||''} onChange={e => setForm({...form,rating:e.target.value})}><option value="">—</option><option>HOT</option><option>WARM</option><option>COLD</option></Select></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem?'Update':'Create'} Account</button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'activity' && (
        <Modal title="Log Activity" onClose={close}>
          <form onSubmit={handleActivity}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Type"><Select value={form.type||'CALL'} onChange={e => setForm({...form,type:e.target.value})}>{['CALL','EMAIL','MEETING','NOTE','TASK','WHATSAPP'].map(t => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="Subject" required><Input value={form.subject||''} onChange={e => setForm({...form,subject:e.target.value})} required /></Field>
                <Field label="Link to Lead"><Select value={actTarget.leadId||''} onChange={e => setActTarget({...actTarget,leadId:e.target.value})}><option value="">None</option>{leads.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}</Select></Field>
                <Field label="Link to Contact"><Select value={actTarget.contactId||''} onChange={e => setActTarget({...actTarget,contactId:e.target.value})}><option value="">None</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</Select></Field>
                <Field label="Duration (min)"><Input type="number" value={form.duration||''} onChange={e => setForm({...form,duration:e.target.value})} /></Field>
                <Field label="Outcome"><Input value={form.outcome||''} onChange={e => setForm({...form,outcome:e.target.value})} placeholder="e.g. Follow-up scheduled" /></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
              <button type="submit" className="btn btn-primary">Log Activity</button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'task' && (
        <Modal title="New Task" onClose={close}>
          <form onSubmit={handleTask}>
            <div className="modal-body">
              <Field label="Title" required><Input value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} required /></Field>
              <div className="grid-2">
                <Field label="Priority"><Select value={form.priority||'MEDIUM'} onChange={e => setForm({...form,priority:e.target.value})}>{['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p}>{p}</option>)}</Select></Field>
                <Field label="Due Date"><Input type="date" value={form.dueDate||''} onChange={e => setForm({...form,dueDate:e.target.value})} /></Field>
                <Field label="Assign To"><Select value={form.assigneeId||''} onChange={e => setForm({...form,assigneeId:e.target.value})}><option value="">Self</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
              </div>
              <Field label="Description"><Textarea value={form.description||''} onChange={e => setForm({...form,description:e.target.value})} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Task</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
