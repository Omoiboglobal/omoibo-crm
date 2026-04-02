import React, { useState, useEffect } from 'react';
import { getAdminUsers, createUser, updateUser, toggleUserActive, getUserPermissions, togglePermission, getAuditLogs } from '../../api/client';
import { Plus, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = ['ADMIN','CEO','COO','SALES_MANAGER','SALES_TEAM_LEAD','SALES_AGENT','INVENTORY_MANAGER','INVENTORY_OFFICER','LOGISTICS_MANAGER','LOGISTICS_OFFICER','FINANCE_MANAGER','FINANCE_OFFICER','ACCOUNTANT','HR_MANAGER','HR_OFFICER','FACILITY_MANAGER','FACILITY_OFFICER'];
const DEPARTMENTS = ['ADMINISTRATION','EXECUTIVE','SALES','INVENTORY','LOGISTICS','FINANCE','HR','FACILITY'];
const FEATURE_KEYS = ['view_sales','manage_sales','view_revenue','create_leads','update_leads','create_deals','view_inventory','manage_inventory','approve_transfers','view_logistics','manage_logistics','update_orders','view_finance','manage_finance','create_transactions','approve_petty_cash','view_payroll','view_hr','manage_hr','approve_leave','view_facility','manage_facility','update_assets'];

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 600 }}>
        <div className="modal-header"><span className="modal-title">{title}</span><button onClick={onClose} className="btn btn-outline btn-sm">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPerms, setShowPerms] = useState(null);
  const [perms, setPerms] = useState([]);
  const [form, setForm] = useState({ role: 'SALES_AGENT', department: 'SALES' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [u, a] = await Promise.all([getAdminUsers(), getAuditLogs()]);
    setUsers(u.data.data); setAuditLogs(a.data.data); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await createUser(form); toast.success('User created'); setShowModal(false); setForm({ role: 'SALES_AGENT', department: 'SALES' }); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleToggleActive = async (id) => {
    try { await toggleUserActive(id); toast.success('Status updated'); load(); }
    catch { toast.error('Failed'); }
  };

  const openPerms = async (user) => {
    const res = await getUserPermissions(user.id);
    setPerms(res.data.data); setShowPerms(user);
  };

  const handleTogglePerm = async (userId, featureKey, current) => {
    try {
      await togglePermission({ userId, featureKey, isEnabled: !current });
      const res = await getUserPermissions(userId);
      setPerms(res.data.data);
      toast.success(`${featureKey} → ${!current ? 'ON' : 'OFF'}`);
    } catch { toast.error('Failed'); }
  };

  const getPerm = (key) => perms.find(p => p.featureKey === key);

  return (
    <div className="page fade-in">
      <div className="flex-between page-header">
        <div><h1 className="page-title">Admin Panel</h1><p className="page-subtitle">User management, permissions, and audit logs</p></div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setForm({ role: 'SALES_AGENT', department: 'SALES' }); }}><Plus size={14} /> Add User</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E8EFFE' }}><ShieldCheck size={18} color="#1B3A6B" /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value" style={{ color: '#1B3A6B' }}>{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#D5F5E3' }}><ShieldCheck size={18} color="#1A7A4A" /></div>
          <div className="stat-label">Active Users</div>
          <div className="stat-value" style={{ color: '#1A7A4A' }}>{users.filter(u => u.isActive).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FDEBD0' }}><ShieldCheck size={18} color="#D35400" /></div>
          <div className="stat-label">Audit Events</div>
          <div className="stat-value" style={{ color: '#D35400' }}>{auditLogs.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
        {['users', 'audit-logs'].map(t => (
          <button key={t} onClick={() => setTab(t)} className="btn btn-sm" style={{ background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? '#fff' : 'var(--text3)', textTransform: 'capitalize' }}>{t.replace('-', ' ')}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card">
          <div className="card-header"><span className="card-title">All Users ({users.length})</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: 12 }}>{u.email}</td>
                    <td style={{ fontSize: 12 }}>{u.role?.replace(/_/g, ' ')}</td>
                    <td>{u.department}</td>
                    <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openPerms(u)}>Permissions</button>
                        <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggleActive(u.id)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit-logs' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Audit Trail</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>Time</th></tr></thead>
              <tbody>
                {auditLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.user?.name}<div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.user?.role}</div></td>
                    <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{l.action}</span></td>
                    <td>{l.entityType}</td>
                    <td style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 200 }}>
                      {l.newValue ? JSON.stringify(l.newValue).slice(0, 80) + '...' : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title="Add New User" onClose={() => { setShowModal(false); }}>
          <form onSubmit={handleCreate}>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-control" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Role *</label>
                  <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Department *</label>
                  <select className="form-control" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Password (default: Admin@1234)</label><input className="form-control" type="password" placeholder="Leave blank for default" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create User</button>
            </div>
          </form>
        </Modal>
      )}

      {showPerms && (
        <Modal title={`Permissions — ${showPerms.name}`} onClose={() => setShowPerms(null)}>
          <div className="modal-body">
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Toggle feature access for this user. Overrides role defaults.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FEATURE_KEYS.map(key => {
                const p = getPerm(key);
                const isOn = p?.isEnabled;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{key.replace(/_/g, ' ')}</span>
                    <button onClick={() => handleTogglePerm(showPerms.id, key, isOn)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isOn ? '#1A7A4A' : '#CBD5E0', position: 'relative', transition: 'background 0.2s' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: isOn ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={() => setShowPerms(null)}>Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
