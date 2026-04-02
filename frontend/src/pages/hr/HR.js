import React, { useState, useEffect } from 'react';
import { getStaff, getAttendance, getLeaves, createLeave, approveLeave, clockIn, clockOut, getHRStats } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { Users, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPT_COLORS = { SALES: 'badge-info', FINANCE: 'badge-success', HR: 'badge-purple', LOGISTICS: 'badge-orange', INVENTORY: 'badge-primary', FACILITY: 'badge-warning', EXECUTIVE: 'badge-danger', ADMINISTRATION: 'badge-gray' };

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-header"><span className="modal-title">{title}</span><button onClick={onClose} className="btn btn-outline btn-sm">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export default function HR() {
  const { user, hasPermission } = useAuth();
  const [tab, setTab] = useState('staff');
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({});
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const fetches = [getHRStats()];
    if (hasPermission('view_hr')) { fetches.push(getStaff()); fetches.push(getAttendance()); fetches.push(getLeaves()); }
    const [s, st, att, lv] = await Promise.all(fetches);
    setStats(s.data.data);
    if (st) setStaff(st.data.data);
    if (att) setAttendance(att.data.data);
    if (lv) setLeaves(lv.data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleClockIn = async () => { try { await clockIn(); toast.success('Clocked in!'); load(); } catch (err) { toast.error(err.response?.data?.error || 'Error'); } };
  const handleClockOut = async () => { try { await clockOut(); toast.success('Clocked out!'); load(); } catch (err) { toast.error(err.response?.data?.error || 'Error'); } };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try { await createLeave(form); toast.success('Leave request submitted'); setShowLeaveModal(false); setForm({}); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleApprove = async (id, status) => {
    try { await approveLeave(id, { status }); toast.success(status); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="page fade-in">
      <div className="flex-between page-header">
        <div><h1 className="page-title">Human Resources</h1><p className="page-subtitle">Staff records, attendance, and leave management</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={handleClockIn}>🟢 Clock In</button>
          <button className="btn btn-outline" onClick={handleClockOut}>🔴 Clock Out</button>
          <button className="btn btn-primary" onClick={() => { setShowLeaveModal(true); setForm({ leaveType: 'ANNUAL' }); }}><Plus size={14} /> Request Leave</button>
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Total Staff', value: stats.totalStaff, color: '#1B3A6B', bg: '#E8EFFE' },
          { label: 'Active Today', value: stats.todayAttendance, color: '#1A7A4A', bg: '#D5F5E3' },
          { label: 'Pending Leave', value: stats.pendingLeave, color: '#D35400', bg: '#FDEBD0' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><Users size={18} color={s.color} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 24, color: s.color }}>{loading ? '...' : s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
        {['staff', 'attendance', 'leave'].map(t => (
          <button key={t} onClick={() => setTab(t)} className="btn btn-sm" style={{ background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? '#fff' : 'var(--text3)', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'staff' && (
        <div className="card">
          <div className="card-header"><span className="card-title">All Staff ({staff.length})</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th></tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{s.name?.split(' ').map(n => n[0]).join('').slice(0,2)}</div><div style={{ fontWeight: 600 }}>{s.name}</div></div></td>
                    <td style={{ fontSize: 12 }}>{s.email}</td>
                    <td style={{ fontSize: 12 }}>{s.role?.replace(/_/g, ' ')}</td>
                    <td><span className={`badge ${DEPT_COLORS[s.department] || 'badge-gray'}`}>{s.department}</span></td>
                    <td><span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Attendance Log</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Staff</th><th>Department</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Status</th></tr></thead>
              <tbody>
                {attendance.length === 0 && <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 40 }}>No attendance records</td></tr>}
                {attendance.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.user?.name}</td>
                    <td><span className={`badge ${DEPT_COLORS[a.user?.department] || 'badge-gray'}`}>{a.user?.department}</span></td>
                    <td style={{ fontSize: 12 }}>{new Date(a.date).toLocaleDateString()}</td>
                    <td style={{ fontSize: 12 }}>{a.clockIn ? new Date(a.clockIn).toLocaleTimeString() : '—'}</td>
                    <td style={{ fontSize: 12 }}>{a.clockOut ? new Date(a.clockOut).toLocaleTimeString() : '—'}</td>
                    <td><span className={`badge ${a.status === 'PRESENT' ? 'badge-success' : a.status === 'LATE' ? 'badge-warning' : 'badge-danger'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leave' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Leave Requests</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Staff</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th>{hasPermission('approve_leave') && <th>Actions</th>}</tr></thead>
              <tbody>
                {leaves.length === 0 && <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 40 }}>No leave requests</td></tr>}
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.requester?.name}</td>
                    <td>{l.leaveType}</td>
                    <td style={{ fontSize: 12 }}>{new Date(l.startDate).toLocaleDateString()}</td>
                    <td style={{ fontSize: 12 }}>{new Date(l.endDate).toLocaleDateString()}</td>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>{l.reason}</td>
                    <td><span className={`badge ${l.status === 'APPROVED' ? 'badge-success' : l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>{l.status}</span></td>
                    {hasPermission('approve_leave') && <td>
                      {l.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(l.id, 'APPROVED')}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleApprove(l.id, 'REJECTED')}>Reject</button>
                        </div>
                      )}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <Modal title="Request Leave" onClose={() => { setShowLeaveModal(false); setForm({}); }}>
          <form onSubmit={handleLeaveSubmit}>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Leave Type</label>
                <select className="form-control" value={form.leaveType || 'ANNUAL'} onChange={e => setForm({ ...form, leaveType: e.target.value })}>
                  {['ANNUAL', 'SICK', 'MATERNITY', 'EMERGENCY'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Start Date *</label><input className="form-control" type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">End Date *</label><input className="form-control" type="date" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} required /></div>
              </div>
              <div className="form-group"><label className="form-label">Reason *</label><textarea className="form-control" value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} required /></div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => { setShowLeaveModal(false); setForm({}); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
