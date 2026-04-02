import React from 'react';

// ── MODAL ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, size = 'md' }) {
  const widths = { sm: 420, md: 560, lg: 720, xl: 900 };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: widths[size] }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button onClick={onClose} className="btn btn-outline btn-sm">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, bg, icon: Icon, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {Icon && (
        <div className="stat-icon" style={{ background: bg }}>
          <Icon size={20} color={color} />
        </div>
      )}
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color, fontSize: String(value).length > 8 ? 18 : 26 }}>{value}</div>
      {sub && <div className="stat-change">{sub}</div>}
    </div>
  );
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  // invoice
  DRAFT: 'badge-gray', SENT: 'badge-info', PARTIALLY_PAID: 'badge-orange',
  PAID: 'badge-success', OVERDUE: 'badge-danger', VOID: 'badge-gray',
  // approval
  PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger',
  // order
  CONFIRMED: 'badge-info', DISPATCHED: 'badge-primary', IN_TRANSIT: 'badge-purple',
  DELIVERED: 'badge-success', RETURNED: 'badge-danger', CANCELLED: 'badge-gray',
  // lead
  NEW: 'badge-gray', CONTACTED: 'badge-info', QUALIFIED: 'badge-primary',
  PROPOSAL: 'badge-warning', NEGOTIATION: 'badge-orange',
  CLOSED_WON: 'badge-success', CLOSED_LOST: 'badge-danger',
  // asset
  ACTIVE: 'badge-success', MAINTENANCE: 'badge-warning', DECOMMISSIONED: 'badge-danger',
  // priority
  LOW: 'badge-gray', MEDIUM: 'badge-info', HIGH: 'badge-warning', URGENT: 'badge-danger',
  // generic
  OPEN: 'badge-info', IN_PROGRESS: 'badge-warning', DONE: 'badge-success',
};

export function Badge({ status, label }) {
  const cls = BADGE_MAP[status] || 'badge-gray';
  return <span className={`badge ${cls}`}>{label || status?.replace(/_/g, ' ')}</span>;
}

// ── TABS ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 18 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className="btn btn-sm"
          style={{ background: active === t.id ? 'var(--primary)' : 'transparent', color: active === t.id ? '#fff' : 'var(--text3)', textTransform: 'capitalize' }}>
          {t.label}
          {t.count !== undefined && (
            <span style={{ background: active === t.id ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: active === t.id ? '#fff' : 'var(--text3)', borderRadius: 10, padding: '0 6px', fontSize: 11, marginLeft: 4 }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── SEARCH BAR ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...', width = 220 }) {
  return (
    <div className="search-bar" style={{ minWidth: width }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📋', title = 'No records found', sub = '', action }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, marginBottom: 16 }}>{sub}</div>}
      {action && action}
    </div>
  );
}

// ── LOADING ───────────────────────────────────────────────────────────────────
export function Loading({ text = 'Loading...' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

// ── FORMAT HELPERS ────────────────────────────────────────────────────────────
export const fmtCurrency = (n, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── TABLE WRAPPER ─────────────────────────────────────────────────────────────
export function DataTable({ columns, data, loading, emptyIcon, emptyText }) {
  if (loading) return <Loading />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={c.style}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.length === 0
            ? <tr><td colSpan={columns.length}><EmptyState icon={emptyIcon} title={emptyText} /></td></tr>
            : data.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map(c => <td key={c.key} style={c.tdStyle}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

// ── PAGE HEADER ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header" style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {children && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>}
      </div>
    </div>
  );
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ title, children, actions, style }) {
  return (
    <div className="card" style={style}>
      {title && (
        <div className="card-header">
          <span className="card-title">{title}</span>
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

// ── FORM FIELD ────────────────────────────────────────────────────────────────
export function Field({ label, required, children, hint }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</label>}
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Input({ ...props }) {
  return <input className="form-control" {...props} />;
}

export function Select({ children, ...props }) {
  return <select className="form-control" {...props}>{children}</select>;
}

export function Textarea({ ...props }) {
  return <textarea className="form-control" {...props} />;
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'var(--accent)' }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : color;
  return (
    <div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{pct.toFixed(0)}%</div>
    </div>
  );
}
