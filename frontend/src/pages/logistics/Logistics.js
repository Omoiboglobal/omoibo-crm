import React, { useState, useEffect } from 'react';
import { getOrders, createOrder, updateOrder, getLogisticsStats } from '../../api/client';
import { Plus, Search, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = { PENDING: 'badge-warning', CONFIRMED: 'badge-info', DISPATCHED: 'badge-primary', IN_TRANSIT: 'badge-orange', DELIVERED: 'badge-success', RETURNED: 'badge-danger', CANCELLED: 'badge-gray' };
const STATUSES = ['PENDING', 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED'];
const fmt = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n || 0);

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

export default function Logistics() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showUpdate, setShowUpdate] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [o, s] = await Promise.all([getOrders({ status: filter || undefined, search: search || undefined }), getLogisticsStats()]);
    setOrders(o.data.data); setStats(s.data.data); setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createOrder({ ...form, totalAmount: Number(form.totalAmount) });
      toast.success('Order created'); setShowModal(false); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleUpdateStatus = async (id, status) => {
    try { await updateOrder(id, { status }); toast.success(`Status → ${status}`); setShowUpdate(null); load(); }
    catch { toast.error('Failed'); }
  };

  const filtered = orders.filter(o => !search || o.orderNumber.includes(search) || o.customerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page fade-in">
      <div className="flex-between page-header">
        <div><h1 className="page-title">Logistics</h1><p className="page-subtitle">Order fulfilment and delivery tracking</p></div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setForm({}); }}><Plus size={14} /> New Order</button>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Total Orders', value: stats.total, color: '#1B3A6B', bg: '#E8EFFE' },
          { label: 'Pending', value: stats.pending, color: '#B7770D', bg: '#FEF3C7' },
          { label: 'In Transit', value: stats.inTransit, color: '#D35400', bg: '#FDEBD0' },
          { label: 'Delivered', value: stats.delivered, color: '#1A7A4A', bg: '#D5F5E3' },
          { label: 'Delivery Rate', value: `${stats.deliveryRate || 0}%`, color: '#2E86C1', bg: '#D6EAF8' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><Truck size={18} color={s.color} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 22, color: s.color }}>{loading ? '...' : s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Orders</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-bar"><Search size={14} color="var(--text3)" /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} /></div>
            <select className="form-control" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order #</th><th>Customer</th><th>Address</th><th>Amount</th><th>Status</th><th>Tracking</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>No orders</td></tr>}
              {filtered.map(o => (
                <tr key={o.id}>
                  <td className="font-mono" style={{ fontSize: 12, fontWeight: 600 }}>{o.orderNumber}</td>
                  <td><div style={{ fontWeight: 600 }}>{o.customerName}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{o.customerPhone}</div></td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.deliveryAddress}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(o.totalAmount)}</td>
                  <td><span className={`badge ${STATUS_COLORS[o.status]}`}>{o.status?.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: 11 }}>{o.trackingNumber || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowUpdate(o)}>Update</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="New Order" onClose={() => { setShowModal(false); setForm({}); }}>
          <form onSubmit={handleCreate}>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Customer Name *</label><input className="form-control" value={form.customerName || ''} onChange={e => setForm({ ...form, customerName: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.customerPhone || ''} onChange={e => setForm({ ...form, customerPhone: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.customerEmail || ''} onChange={e => setForm({ ...form, customerEmail: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Total Amount (₦) *</label><input className="form-control" type="number" value={form.totalAmount || ''} onChange={e => setForm({ ...form, totalAmount: e.target.value })} required /></div>
              </div>
              <div className="form-group"><label className="form-label">Delivery Address *</label><input className="form-control" value={form.deliveryAddress || ''} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })} required /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Carrier</label><input className="form-control" placeholder="GIG, DHL, Kwik..." value={form.carrier || ''} onChange={e => setForm({ ...form, carrier: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Tracking Number</label><input className="form-control" value={form.trackingNumber || ''} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setForm({}); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Order</button>
            </div>
          </form>
        </Modal>
      )}

      {showUpdate && (
        <Modal title={`Update Order — ${showUpdate.orderNumber}`} onClose={() => setShowUpdate(null)}>
          <div className="modal-body">
            <p style={{ marginBottom: 16, color: 'var(--text2)' }}>Current status: <span className={`badge ${STATUS_COLORS[showUpdate.status]}`}>{showUpdate.status}</span></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STATUSES.map(s => (
                <button key={s} className={`btn ${s === showUpdate.status ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleUpdateStatus(showUpdate.id, s)}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
