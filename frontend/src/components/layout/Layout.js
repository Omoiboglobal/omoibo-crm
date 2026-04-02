import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getNotifications, markNotificationRead } from '../../api/client';
import {
  LayoutDashboard, TrendingUp, Package, Truck, DollarSign,
  Users, Building2, ShieldCheck, BarChart3, Bot, LogOut, Bell, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const NAV = [
  { path: '/',          label: 'Dashboard',       icon: LayoutDashboard, section: 'MAIN' },
  { path: '/sales',     label: 'Sales',            icon: TrendingUp,      permission: 'view_sales',      section: 'MODULES' },
  { path: '/inventory', label: 'Inventory',        icon: Package,         permission: 'view_inventory',  section: 'MODULES' },
  { path: '/logistics', label: 'Logistics',        icon: Truck,           permission: 'view_logistics',  section: 'MODULES' },
  { path: '/finance',   label: 'Finance',          icon: DollarSign,      permission: 'view_finance',    section: 'MODULES' },
  { path: '/hr',        label: 'Human Resources',  icon: Users,           permission: 'view_hr',         section: 'MODULES' },
  { path: '/facility',  label: 'Facility',         icon: Building2,       permission: 'view_facility',   section: 'MODULES' },
  { path: '/ai',        label: 'AI Assistant',     icon: Bot,             section: 'TOOLS' },
  { path: '/executive', label: 'Executive',        icon: BarChart3,       roles: ['ADMIN','CEO','COO'],  section: 'MANAGEMENT' },
  { path: '/admin',     label: 'Admin Panel',      icon: ShieldCheck,     roles: ['ADMIN'],              section: 'MANAGEMENT' },
];

const SECTION_LABELS = { MAIN: '', MODULES: 'Modules', TOOLS: 'Tools', MANAGEMENT: 'Management' };

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await getNotifications();
      const notifs = res.data.data || [];
      setNotifications(notifs);
      setUnread(notifs.filter(n => !n.isRead).length);
    } catch {}
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const canSee = (item) => {
    if (item.roles) return item.roles.includes(user?.role);
    if (item.permission) return hasPermission(item.permission);
    return true;
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleLabel = user?.role?.replace(/_/g, ' ') || '';

  const notifColors = { INFO: '#3B82F6', SUCCESS: '#059669', WARNING: '#D97706', DANGER: '#DC2626', SYSTEM: '#7C3AED' };
  const notifBg = { INFO: '#EFF6FF', SUCCESS: '#ECFDF5', WARNING: '#FFFBEB', DANGER: '#FEF2F2', SYSTEM: '#F5F3FF' };

  return (
    <div className="layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ fontSize: 26, marginBottom: 8 }}>🌍</div>
          <div className="sidebar-logo-text">Omoibo Global</div>
          <div className="sidebar-logo-sub">Enterprise CRM v2.0</div>
        </div>

        <nav className="sidebar-nav">
          {['MAIN', 'MODULES', 'TOOLS', 'MANAGEMENT'].map(section => {
            const items = NAV.filter(n => n.section === section && canSee(n));
            if (!items.length) return null;
            return (
              <div key={section}>
                {SECTION_LABELS[section] && (
                  <div className="sidebar-section">{SECTION_LABELS[section]}</div>
                )}
                {items.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-item ${active ? 'active' : ''}`}
                      style={item.path === '/ai' ? { borderLeft: active ? '3px solid #7C3AED' : '3px solid transparent', background: active ? 'rgba(124,58,237,0.18)' : '' } : {}}
                    >
                      <Icon size={15} />
                      {item.label}
                      {item.path === '/ai' && (
                        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, background: 'rgba(124,58,237,0.3)', color: '#C4B5FD', padding: '1px 6px', borderRadius: 8 }}>AI</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{initials}</div>
            <div>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{user?.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{roleLabel}</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); toast.success('Logged out'); }}
            className="sidebar-item"
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-left">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {NAV.find(n => location.pathname === n.path || (n.path !== '/' && location.pathname.startsWith(n.path)))?.label || 'Dashboard'}
          </div>
        </div>
        <div className="header-right">
          <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            {user?.department}
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
            >
              <Bell size={15} color="var(--text2)" />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: 'var(--danger)', borderRadius: '50%', fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotif && (
              <div style={{ position: 'absolute', top: 42, right: 0, width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={14} /></button>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text3)', fontSize: 13 }}>No notifications</div>
                  ) : notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.isRead ? 'var(--surface)' : notifBg[n.type] || '#EFF6FF', display: 'flex', gap: 10 }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: notifColors[n.type] || '#3B82F6', flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: n.isRead ? 400 : 700, fontSize: 13 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="avatar">{initials}</div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
