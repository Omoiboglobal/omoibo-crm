import React, { useState, useEffect } from 'react';
import { getAssets, createAsset, updateAsset, addMaintenance, getFacilityStats } from '../../api/client';
import { Plus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n || 0);
const STATUS_BADGE = { ACTIVE: 'badge-success', MAINTENANCE: 'badge-warning', DECOMMISSIONED: 'badge-danger' };

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

export default function Facility() {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showMaint, setShowMaint] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [a, s] = await Promise.all([getAssets(), getFacilityStats()]);
    setAssets(a.data.data); setStats(s.data.data); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined, currentValue: form.currentValue ? Number(form.currentValue) : undefined };
      if (editItem) { await updateAsset(editItem.id, data); toast.success('Updated'); }
      else { await createAsset(data); toast.success('Asset added'); }
      setShowModal(false); setEditItem(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleMaintenance = async (e) => {
    e.preventDefault();
    try {
      await addMaintenance(showMaint.id, { ...form, cost: form.cost ? Number(form.cost) : undefined });
      toast.success('Maintenance logged'); setShowMaint(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div className="page fade-in">
      <div className="flex-between page-header">
        <div><h1 className="page-title">Facility & Operations</h1><p className="page-subtitle">Asset register and maintenance management</p></div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditItem(null); setForm({ status: 'ACTIVE' }); }}><Plus size={14} /> Add Asset</button>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Total Assets', value: stats.total, color: '#1B3A6B', bg: '#E8EFFE' },
          { label: 'Active', value: stats.active, color: '#1A7A4A', bg: '#D5F5E3' },
          { label: 'In Maintenance', value: stats.maintenance, color: '#D35400', bg: '#FDEBD0' },
          { label: 'Total Value', value: fmt(stats.totalValue), color: '#6C3483', bg: '#E8DAEF' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><Building2 size={18} color={s.color} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: s.label === 'Total Value' ? 16 : 22, color: s.color }}>{loading ? '...' : s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Asset Register ({assets.length})</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tag</th><th>Asset</th><th>Category</th><th>Location</th><th>Current Value</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {assets.length === 0 && <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 40 }}>No assets</td></tr>}
              {assets.map(a => (
                <tr key={a.id}>
                  <td className="font-mono" style={{ fontSize: 12 }}>{a.assetTag}</td>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td>{a.category}</td>
                  <td>{a.location || '—'}</td>
                  <td>{fmt(a.currentValue)}</td>
                  <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(a); setForm({ name: a.name, assetTag: a.assetTag, category: a.category, location: a.location, purchasePrice: a.purchasePrice, currentValue: a.currentValue, status: a.status, notes: a.notes }); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-outline btn-sm" onClick={() => { setShowMaint(a); setForm({}); }}>+ Maintenance</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editItem ? 'Edit Asset' : 'Add Asset'} onClose={() => { setShowModal(false); setEditItem(null); setForm({}); }}>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Asset Name *</label><input className="form-control" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Asset Tag *</label><input className="form-control" placeholder="AST-001" value={form.assetTag || ''} onChange={e => setForm({ ...form, assetTag: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Category</label><input className="form-control" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Location</label><input className="form-control" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Purchase Price (₦)</label><input className="form-control" type="number" value={form.purchasePrice || ''} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Current Value (₦)</label><input className="form-control" type="number" value={form.currentValue || ''} onChange={e => setForm({ ...form, currentValue: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Status</label>
                  <select className="form-control" value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditItem(null); setForm({}); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showMaint && (
        <Modal title={`Log Maintenance — ${showMaint.name}`} onClose={() => { setShowMaint(null); setForm({}); }}>
          <form onSubmit={handleMaintenance}>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Description *</label><textarea className="form-control" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Cost (₦)</label><input className="form-control" type="number" value={form.cost || ''} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Performed By</label><input className="form-control" value={form.performedBy || ''} onChange={e => setForm({ ...form, performedBy: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => { setShowMaint(null); setForm({}); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Log Maintenance</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
