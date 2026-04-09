import React, { useState, useEffect } from 'react';
import { 
  getAdminUsers, createUser, updateUser, toggleUserActive, 
  getUserPermissions, togglePermission, getAuditLogs, 
  getSystemSettings, saveSystemSettings, uploadAvatar, uploadLogo,
  getDepartments, createDepartment, getAdminStats
} from '../../api/client';
import { 
  Plus, ShieldCheck, Edit2, Upload, Image as ImageIcon, 
  Settings, Users, FileText, Briefcase, X, Check,
  LayoutDashboard, ChevronDown, ChevronRight, Calendar,
  Search, Filter, MoreVertical, Lock, Unlock, Eye,
  PieChart, TrendingUp, Activity, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Constants
const ROLES = [
  'ADMIN', 'CEO', 'COO', 'SALES_MANAGER', 'SALES_TEAM_LEAD', 'SALES_AGENT',
  'INVENTORY_MANAGER', 'INVENTORY_OFFICER', 'LOGISTICS_MANAGER', 'LOGISTICS_OFFICER',
  'FINANCE_MANAGER', 'FINANCE_OFFICER', 'ACCOUNTANT', 'HR_MANAGER', 'HR_OFFICER',
  'FACILITY_MANAGER', 'FACILITY_OFFICER'
];

const FEATURE_KEYS = [
  'view_sales', 'manage_sales', 'view_revenue', 'create_leads', 'update_leads',
  'create_deals', 'view_inventory', 'manage_inventory', 'approve_transfers',
  'view_logistics', 'manage_logistics', 'update_orders', 'view_finance',
  'manage_finance', 'create_transactions', 'approve_petty_cash', 'view_payroll',
  'view_hr', 'manage_hr', 'approve_leave', 'view_facility', 'manage_facility', 'update_assets'
];

const TIMEZONES = [
  'Africa/Lagos', 'Africa/Accra', 'Europe/London', 'America/New_York',
  'Europe/Paris', 'Asia/Dubai', 'Asia/Tokyo'
];

// Modal Component (using your CSS)
function Modal({ title, onClose, children, maxWidth = 600, icon: Icon }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {Icon && <Icon size={20} color="var(--primary)" />}
            <span className="modal-title">{title}</span>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Avatar Upload Component
function AvatarUpload({ currentAvatar, onUpload, userName, size = 100 }) {
  const [preview, setPreview] = useState(currentAvatar);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await onUpload(formData);
      toast.success('Avatar updated successfully');
    } catch (err) {
      toast.error('Failed to upload avatar');
      setPreview(currentAvatar);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ 
          width: '100%', height: '100%', borderRadius: '50%', 
          background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--accent) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-md)'
        }}>
          {preview ? (
            <img src={preview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
              {userName?.charAt(0)?.toUpperCase()}
            </span>
          )}
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spin" style={{ width: 24, height: 24, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
            </div>
          )}
        </div>
        <label style={{ 
          position: 'absolute', bottom: 0, right: 0, 
          width: 32, height: 32, borderRadius: '50%', 
          background: 'var(--primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: 'var(--shadow)'
        }}>
          <Upload size={14} />
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>Click to change avatar</span>
    </div>
  );
}

// Logo Upload Component
function LogoUpload({ currentLogo, onUpload }) {
  const [preview, setPreview] = useState(currentLogo);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await onUpload(formData);
      toast.success('Company logo updated');
    } catch (err) {
      toast.error('Upload failed');
      setPreview(currentLogo);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ 
      border: '2px dashed var(--border)', borderRadius: 12, padding: 32, textAlign: 'center',
      background: 'var(--surface2)', transition: 'all 0.15s'
    }}>
      <div style={{ 
        width: 256, height: 96, margin: '0 auto 16px', 
        background: 'var(--surface)', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)', position: 'relative'
      }}>
        {preview ? (
          <img src={preview} alt="Company Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <ImageIcon size={48} color="var(--text3)" />
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spin" style={{ width: 24, height: 24, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
          </div>
        )}
      </div>
      <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
        <Upload size={14} />
        {preview ? 'Change Logo' : 'Upload Company Logo'}
        <input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
      </label>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Recommended: PNG or SVG, max 5MB</p>
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "primary" }) {
  const colorMap = {
    primary: { bg: '#E8EFFE', icon: '#1B3A6B', text: '#1B3A6B' },
    success: { bg: '#D5F5E3', icon: '#1A7A4A', text: '#1A7A4A' },
    warning: { bg: '#FEF3C7', icon: '#B7770D', text: '#B7770D' },
    danger: { bg: '#FADBD8', icon: '#C0392B', text: '#C0392B' },
    purple: { bg: '#E8DAEF', icon: '#6C3483', text: '#6C3483' }
  };
  
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{title}</div>
          <div className="stat-value" style={{ color: c.text }}>{value}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{subtitle}</div>}
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12 }}>
              <TrendingUp size={14} color="var(--success)" />
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>{trend}</span>
            </div>
          )}
        </div>
        <div style={{ 
          width: 44, height: 44, borderRadius: 10, 
          background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={20} color={c.icon} />
        </div>
      </div>
    </div>
  );
}

// Main Admin Component
export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  
  // Forms
  const [userForm, setUserForm] = useState({ role: 'SALES_AGENT', departmentId: '', timezone: 'Africa/Lagos' });
  const [editForm, setEditForm] = useState(null);
  const [deptForm, setDeptForm] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, settingsRes, statsRes] = await Promise.all([
        getAdminUsers({ limit: 100 }),
        getDepartments(),
        getSystemSettings(),
        getAdminStats()
      ]);
      
      setUsers(usersRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
      setSettings(settingsRes.data.data || {});
      setStats(statsRes.data.data || {});
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await getAuditLogs({ limit: 100 });
      setAuditLogs(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load audit logs');
    }
  };

  // User Management
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUser(userForm);
      toast.success('User created successfully with preset permissions');
      setShowUserModal(false);
      setUserForm({ role: 'SALES_AGENT', departmentId: '', timezone: 'Africa/Lagos' });
      loadAllData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create user';
      toast.error(msg);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await updateUser(editForm.id, editForm);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditForm(null);
      loadAllData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user';
      toast.error(msg);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await toggleUserActive(id);
      toast.success('User status updated');
      loadAllData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAvatarUpload = async (userId, formData) => {
    await uploadAvatar(userId, formData);
    loadAllData();
  };

  // Permissions
  const openPermissions = async (user) => {
    setSelectedUser(user);
    try {
      const res = await getUserPermissions(user.id);
      setUserPermissions(res.data.data || []);
      setShowPermissionsModal(true);
    } catch (err) {
      toast.error('Failed to load permissions');
    }
  };

  const handleTogglePerm = async (featureKey, current) => {
    try {
      await togglePermission({
        userId: selectedUser.id,
        featureKey,
        isEnabled: !current
      });
      const res = await getUserPermissions(selectedUser.id);
      setUserPermissions(res.data.data || []);
      toast.success(`${featureKey.replace(/_/g, ' ')} ${!current ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to toggle permission');
    }
  };

  const getPermValue = (key) => {
    const perm = userPermissions.find(p => p.featureKey === key);
    return perm?.isEnabled || false;
  };

  // Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await saveSystemSettings(settings);
      toast.success('Settings saved successfully');
      setShowSettingsModal(false);
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const handleLogoUpload = async (formData) => {
    await uploadLogo(formData);
    const res = await getSystemSettings();
    setSettings(res.data.data || {});
  };

  // Departments
  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await createDepartment(deptForm);
      toast.success('Department created');
      setShowDeptModal(false);
      setDeptForm({});
      const res = await getDepartments();
      setDepartments(res.data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create department';
      toast.error(msg);
    }
  };

  // Render
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'departments', label: 'Departments', icon: Briefcase },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => setShowSettingsModal(true) }
  ];

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - var(--header-h))' }}>
        <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="page fade-in">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">System administration and user management</p>
        </div>
      </div>

      {/* Inner Sidebar Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
        {sidebarItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : setActiveTab(item.id)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text2)',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all 0.15s'
              }}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="fade-in">
          <div className="flex-between" style={{ marginBottom: 24 }}>
            <div></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input 
                type="date" 
                className="form-control"
                style={{ width: 'auto' }}
                value={dateRange.start}
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
              />
              <span style={{ color: 'var(--text3)' }}>to</span>
              <input 
                type="date" 
                className="form-control"
                style={{ width: 'auto' }}
                value={dateRange.end}
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
              />
              <button 
                onClick={async () => {
                  const res = await getAdminStats({ 
                    startDate: dateRange.start, 
                    endDate: dateRange.end 
                  });
                  setStats(res.data.data);
                }}
                className="btn btn-primary"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="stat-grid">
            <StatsCard 
              title="Total Users" 
              value={stats?.users?.total || 0} 
              subtitle={`${stats?.users?.active || 0} active`}
              icon={Users} 
              color="primary"
            />
            <StatsCard 
              title="Departments" 
              value={departments.length} 
              subtitle={`${departments.filter(d => d.isActive).length} active`}
              icon={Briefcase} 
              color="success"
            />
            <StatsCard 
              title="Audit Events" 
              value={stats?.activity?.totalAuditLogs || 0} 
              subtitle="Last 30 days"
              icon={Activity} 
              trend="+12%"
              color="warning"
            />
            <StatsCard 
              title="Permission Overrides" 
              value={`${stats?.users?.total ? Math.round((stats.users.byRole?.length || 0) / stats.users.total * 100) : 0}%`}
              subtitle="Custom permissions"
              icon={ShieldCheck} 
              color="purple"
            />
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Activity</span>
            </div>
            <div className="table-wrap">
              <table>
                <tbody>
                  {(stats?.activity?.recent || []).length === 0 ? (
                    <tr><td colSpan="2" className="text-center" style={{ padding: 40 }}>No recent activity</td></tr>
                  ) : (stats?.activity?.recent || []).map((log, idx) => (
                    <tr key={idx}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
                        <div style={{ 
                          width: 40, height: 40, borderRadius: '50%', 
                          background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Activity size={18} color="var(--accent)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{log.action}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                            by {log.user?.name} • {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="fade-in">
          <div className="flex-between" style={{ marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>User Management</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>Manage users and their permissions</p>
            </div>
            <button 
              onClick={() => setShowUserModal(true)}
              className="btn btn-primary"
            >
              <Plus size={14} /> Add User
            </button>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: 20, padding: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input 
                  type="text" 
                  placeholder="Search users..."
                  className="form-control"
                  style={{ paddingLeft: 36 }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="form-control"
                style={{ width: 200 }}
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role & Dept</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            width: 40, height: 40, borderRadius: '50%', 
                            background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {user.avatar ? (
                              <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{user.name?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{user.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="badge badge-primary" style={{ width: 'fit-content' }}>
                            {user.role?.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{user.department?.name || 'No Department'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => { setEditForm(user); setShowEditModal(true); }}
                            className="btn btn-outline btn-sm"
                            title="Edit User"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => openPermissions(user)}
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--purple)' }}
                            title="Permissions"
                          >
                            <ShieldCheck size={14} />
                          </button>
                          <button 
                            onClick={() => handleToggleActive(user.id)}
                            className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="fade-in">
          <div className="flex-between" style={{ marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Departments</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>Manage organization departments</p>
            </div>
            <button 
              onClick={() => setShowDeptModal(true)}
              className="btn btn-primary"
            >
              <Plus size={14} /> Add Department
            </button>
          </div>

          <div className="grid-3">
            {departments.map(dept => (
              <div key={dept.id} className="card" style={{ padding: 20 }}>
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 10, 
                    background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Briefcase size={24} color="var(--accent)" />
                  </div>
                  <span className={`badge ${dept.isActive ? 'badge-success' : 'badge-gray'}`}>
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{dept.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Code: {dept.code}</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, minHeight: 40 }}>{dept.description || 'No description'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text3)' }}>
                  <Users size={14} />
                  {dept._count?.users || 0} users
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="fade-in">
          <div className="flex-between" style={{ marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Audit Logs</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>System activity and changes</p>
            </div>
            <button 
              onClick={loadAuditLogs}
              className="btn btn-outline"
            >
              Refresh
            </button>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center" style={{ padding: 60 }}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📋</div>
                          <div>Click refresh to load audit logs</div>
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.user?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{log.user?.role}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>{log.action}</span>
                      </td>
                      <td>{log.entityType}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 300 }}>
                        {log.newValue ? JSON.stringify(log.newValue).slice(0, 80) + '...' : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      
      {/* Create User Modal */}
      {showUserModal && (
        <Modal title="Create New User" icon={Plus} onClose={() => setShowUserModal(false)} maxWidth={700}>
          <form onSubmit={handleCreateUser}>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    required
                    className="form-control"
                    value={userForm.name || ''}
                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input 
                    type="email"
                    required
                    className="form-control"
                    value={userForm.email || ''}
                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                    placeholder="john@company.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select 
                    className="form-control"
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select 
                    className="form-control"
                    value={userForm.departmentId || ''}
                    onChange={e => setUserForm({...userForm, departmentId: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    className="form-control"
                    value={userForm.phone || ''}
                    onChange={e => setUserForm({...userForm, phone: e.target.value})}
                    placeholder="+234..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select 
                    className="form-control"
                    value={userForm.timezone}
                    onChange={e => setUserForm({...userForm, timezone: e.target.value})}
                  >
                    {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Password</label>
                <input 
                  type="password"
                  className="form-control"
                  value={userForm.password || ''}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                  placeholder="Leave blank for auto-generated secure password"
                />
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  If left blank, a secure password will be generated and must be reset on first login
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Create User</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEditModal && editForm && (
        <Modal title={`Edit User - ${editForm.name}`} icon={Edit2} onClose={() => setShowEditModal(false)} maxWidth={800}>
          <form onSubmit={handleUpdateUser}>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                <AvatarUpload 
                  currentAvatar={editForm.avatar} 
                  userName={editForm.name}
                  onUpload={(formData) => handleAvatarUpload(editForm.id, formData)}
                  size={120}
                />
              </div>
              
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    required
                    className="form-control"
                    value={editForm.name || ''}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input 
                    type="email"
                    required
                    className="form-control"
                    value={editForm.email || ''}
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select 
                    className="form-control"
                    value={editForm.role}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select 
                    className="form-control"
                    value={editForm.departmentId || ''}
                    onChange={e => setEditForm({...editForm, departmentId: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    className="form-control"
                    value={editForm.phone || ''}
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select 
                    className="form-control"
                    value={editForm.timezone || 'Africa/Lagos'}
                    onChange={e => setEditForm({...editForm, timezone: e.target.value})}
                  >
                    {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => { setShowEditModal(false); setEditForm(null); }} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <Modal title={`Permissions - ${selectedUser.name}`} icon={ShieldCheck} onClose={() => setShowPermissionsModal(false)} maxWidth={700}>
          <div className="modal-body">
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
              Manage feature access for this user. Preset permissions are based on their role/department.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {FEATURE_KEYS.map(key => {
                const isEnabled = getPermValue(key);
                return (
                  <div key={key} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8,
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </span>
                    <button 
                      onClick={() => handleTogglePerm(key, isEnabled)}
                      style={{ 
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: isEnabled ? 'var(--success)' : 'var(--border)',
                        position: 'relative', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3, left: isEnabled ? 23 : 3,
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                      }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={() => setShowPermissionsModal(false)} className="btn btn-primary">Done</button>
          </div>
        </Modal>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <Modal title="System Settings" icon={Settings} onClose={() => setShowSettingsModal(false)} maxWidth={900}>
          <form onSubmit={handleSaveSettings}>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Company Branding</h3>
                <LogoUpload currentLogo={settings?.logoUrl} onUpload={handleLogoUpload} />
              </div>

              <div className="grid-2" style={{ marginBottom: 32 }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input 
                    className="form-control"
                    value={settings?.companyName || ''}
                    onChange={e => setSettings({...settings, companyName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Support Email</label>
                  <input 
                    type="email"
                    className="form-control"
                    value={settings?.companyEmail || ''}
                    onChange={e => setSettings({...settings, companyEmail: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    className="form-control"
                    value={settings?.companyPhone || ''}
                    onChange={e => setSettings({...settings, companyPhone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Default Currency</label>
                  <select 
                    className="form-control"
                    value={settings?.currency || 'NGN'}
                    onChange={e => setSettings({...settings, currency: e.target.value})}
                  >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Theme Colors</h3>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Primary Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="color"
                        style={{ width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer' }}
                        value={settings?.primaryColor || '#1B3A6B'}
                        onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                      />
                      <code style={{ fontSize: 12, background: 'var(--surface2)', padding: '4px 8px', borderRadius: 4 }}>
                        {settings?.primaryColor || '#1B3A6B'}
                      </code>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Secondary Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="color"
                        style={{ width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer' }}
                        value={settings?.secondaryColor || '#1A7A4A'}
                        onChange={e => setSettings({...settings, secondaryColor: e.target.value})}
                      />
                      <code style={{ fontSize: 12, background: 'var(--surface2)', padding: '4px 8px', borderRadius: 4 }}>
                        {settings?.secondaryColor || '#1A7A4A'}
                      </code>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accent Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="color"
                        style={{ width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer' }}
                        value={settings?.accentColor || '#D35400'}
                        onChange={e => setSettings({...settings, accentColor: e.target.value})}
                      />
                      <code style={{ fontSize: 12, background: 'var(--surface2)', padding: '4px 8px', borderRadius: 4 }}>
                        {settings?.accentColor || '#D35400'}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowSettingsModal(false)} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Settings</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <Modal title="Create Department" icon={Briefcase} onClose={() => setShowDeptModal(false)}>
          <form onSubmit={handleCreateDept}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input 
                  required
                  className="form-control"
                  value={deptForm.name || ''}
                  onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                  placeholder="e.g., Sales Department"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department Code *</label>
                <input 
                  required
                  className="form-control"
                  style={{ textTransform: 'uppercase' }}
                  value={deptForm.code || ''}
                  onChange={e => setDeptForm({...deptForm, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., SALES"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  value={deptForm.description || ''}
                  onChange={e => setDeptForm({...deptForm, description: e.target.value})}
                  placeholder="Brief description of the department..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowDeptModal(false)} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Create Department</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}