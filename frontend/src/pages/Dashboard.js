import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSalesStats, getInventoryStats, getLogisticsStats, getFinanceStats, getHRStats, getExecutiveDashboard } from '../api/client';
import { TrendingUp, Package, Truck, DollarSign, Users, Building2, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (n) => n >= 1000000 ? `₦${(n/1000000).toFixed(1)}M` : n >= 1000 ? `₦${(n/1000).toFixed(0)}K` : `₦${n}`;

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches = [];
    if (hasPermission('view_sales')) fetches.push(getSalesStats().then(r => ({ sales: r.data.data })).catch(() => ({})));
    if (hasPermission('view_inventory')) fetches.push(getInventoryStats().then(r => ({ inventory: r.data.data })).catch(() => ({})));
    if (hasPermission('view_logistics')) fetches.push(getLogisticsStats().then(r => ({ logistics: r.data.data })).catch(() => ({})));
    if (hasPermission('view_finance')) fetches.push(getFinanceStats().then(r => ({ finance: r.data.data })).catch(() => ({})));
    if (hasPermission('view_hr')) fetches.push(getHRStats().then(r => ({ hr: r.data.data })).catch(() => ({})));

    Promise.all(fetches).then(results => {
      setStats(Object.assign({}, ...results));
      setLoading(false);
    });
  }, []);

  const cards = [
    hasPermission('view_sales') && { label: 'Total Leads', value: stats.sales?.totalLeads ?? '—', sub: `${stats.sales?.conversionRate ?? 0}% conversion`, icon: TrendingUp, color: '#2E86C1', bg: '#D6EAF8', link: '/sales' },
    hasPermission('view_sales') && { label: 'Deals Won', value: stats.sales?.closedWon ?? '—', sub: `of ${stats.sales?.totalDeals ?? 0} total deals`, icon: TrendingUp, color: '#1A7A4A', bg: '#D5F5E3', link: '/sales' },
    hasPermission('view_inventory') && { label: 'Products', value: stats.inventory?.totalProducts ?? '—', sub: `${stats.inventory?.totalWarehouses ?? 0} warehouses`, icon: Package, color: '#6C3483', bg: '#E8DAEF', link: '/inventory' },
    hasPermission('view_logistics') && { label: 'Orders', value: stats.logistics?.total ?? '—', sub: `${stats.logistics?.deliveryRate ?? 0}% delivered`, icon: Truck, color: '#D35400', bg: '#FDEBD0', link: '/logistics' },
    hasPermission('view_finance') && { label: 'Revenue', value: fmt(stats.finance?.totalIncome ?? 0), sub: `${fmt(stats.finance?.totalExpenses ?? 0)} expenses`, icon: DollarSign, color: '#1B3A6B', bg: '#E8EFFE', link: '/finance' },
    hasPermission('view_hr') && { label: 'Active Staff', value: stats.hr?.activeStaff ?? '—', sub: `${stats.hr?.pendingLeave ?? 0} leave pending`, icon: Users, color: '#B7770D', bg: '#FEF3C7', link: '/hr' },
  ].filter(Boolean);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {user?.role?.replace(/_/g, ' ')} · {user?.department}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading dashboard...</div>
      ) : (
        <>
          <div className="stat-grid">
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <Link to={card.link} key={i} className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                  <div className="stat-icon" style={{ background: card.bg }}>
                    <Icon size={20} color={card.color} />
                  </div>
                  <div className="stat-label">{card.label}</div>
                  <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
                  <div className="stat-change">{card.sub}</div>
                </Link>
              );
            })}
          </div>

          {/* Quick access */}
          <div className="card mt-4">
            <div className="card-header">
              <span className="card-title">Quick Access</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  hasPermission('create_leads') && { label: '+ New Lead', link: '/sales', color: '#2E86C1' },
                  hasPermission('view_logistics') && { label: 'View Orders', link: '/logistics', color: '#D35400' },
                  hasPermission('view_finance') && { label: 'Finance Reports', link: '/finance', color: '#1B3A6B' },
                  hasPermission('view_hr') && { label: 'HR Dashboard', link: '/hr', color: '#6C3483' },
                  user?.role === 'ADMIN' && { label: 'Admin Panel', link: '/admin', color: '#C0392B' },
                  ['ADMIN','CEO','COO'].includes(user?.role) && { label: 'Executive View', link: '/executive', color: '#1A7A4A' },
                ].filter(Boolean).map((item, i) => (
                  <Link key={i} to={item.link} className="btn btn-outline" style={{ color: item.color, borderColor: item.color + '40' }}>
                    {item.label} <ArrowUpRight size={13} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Info card for role */}
          <div className="card mt-4" style={{ background: 'linear-gradient(135deg, #1B3A6B, #2E5FA3)', border: 'none' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>Your Access Level</div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{user?.role?.replace(/_/g, ' ')}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{user?.department} Department</div>
              </div>
              <div style={{ fontSize: 48 }}>🔐</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
