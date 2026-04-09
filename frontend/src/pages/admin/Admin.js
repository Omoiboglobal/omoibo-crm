import React, { useState, useEffect } from 'react';
import { 
  getAdminUsers, createUser, updateUser, toggleUserActive, 
  getUserPermissions, togglePermission, getAuditLogs, 
  getSystemSettings, saveSystemSettings, uploadAvatar, uploadLogo,
  getDepartments, createDepartment, getAdminStats
} from '../api/client';
import { 
  Plus, ShieldCheck, Edit2, Upload, Image as ImageIcon, 
  Settings, Users, FileText, Palette, Building2, X, Check,
  LayoutDashboard, ChevronDown, ChevronRight, Calendar,
  Search, Filter, MoreVertical, Lock, Unlock, Eye,
  Briefcase, PieChart, TrendingUp, Activity, Bell
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

// Modal Component
function Modal({ title, onClose, children, maxWidth = 600, icon: Icon }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full animate-in fade-in zoom-in duration-200" 
           style={{ maxWidth, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-6 h-6 text-blue-600" />}
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
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
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-100 to-blue-200 
                      flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-blue-600">
              {userName?.charAt(0)?.toUpperCase()}
            </span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full 
                         cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
          <Upload className="w-4 h-4" />
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      </div>
      <span className="text-sm text-gray-500">Click to change avatar</span>
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
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center 
                  hover:border-blue-400 transition-colors bg-gray-50">
      <div className="w-64 h-24 mx-auto mb-4 bg-white rounded-lg flex items-center justify-center shadow-sm relative">
        {preview ? (
          <img src={preview} alt="Company Logo" className="max-w-full max-h-full object-contain" />
        ) : (
          <ImageIcon className="w-12 h-12 text-gray-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                      rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
        <Upload className="w-4 h-4" />
        {preview ? 'Change Logo' : 'Upload Company Logo'}
        <input type="file" accept="image/png,image/svg+xml,image/jpeg" 
               onChange={handleFileChange} className="hidden" />
      </label>
      <p className="text-xs text-gray-500 mt-2">Recommended: PNG or SVG, max 5MB</p>
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600"
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colors[color]} text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
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
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-400" />
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-lg">OMOIBO CRM</h1>
                <p className="text-xs text-slate-400">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => item.action ? item.action() : setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon className="w-5 h-5" />
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-gray-500">Overview of your CRM system</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    className="px-3 py-2 border rounded-lg"
                    value={dateRange.start}
                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  />
                  <span className="self-center text-gray-400">to</span>
                  <input 
                    type="date" 
                    className="px-3 py-2 border rounded-lg"
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                  title="Total Users" 
                  value={stats?.users?.total || 0} 
                  subtitle={`${stats?.users?.active || 0} active`}
                  icon={Users} 
                  color="blue"
                />
                <StatsCard 
                  title="Departments" 
                  value={departments.length} 
                  subtitle={`${departments.filter(d => d.isActive).length} active`}
                  icon={Briefcase} 
                  color="green"
                />
                <StatsCard 
                  title="Audit Events" 
                  value={stats?.activity?.totalAuditLogs || 0} 
                  subtitle="Last 30 days"
                  icon={Activity} 
                  trend="+12%"
                  color="orange"
                />
                <StatsCard 
                  title="Permission Overrides" 
                  value={stats?.users?.total ? Math.round((stats.users.byRole?.length || 0) / stats.users.total * 100) : 0}%
                  subtitle="Custom permissions"
                  icon={ShieldCheck} 
                  color="purple"
                />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {(stats?.activity?.recent || []).map((log, idx) => (
                    <div key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{log.action}</p>
                        <p className="text-sm text-gray-500">by {log.user?.name} • {format(new Date(log.createdAt), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                  <p className="text-gray-500">Manage users and their permissions</p>
                </div>
                <button 
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="px-4 py-2 border rounded-lg"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Role & Dept</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                              {user.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="font-semibold text-blue-600">{user.name?.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              {user.role?.replace(/_/g, ' ')}
                            </span>
                            <p className="text-sm text-gray-500">{user.department?.name || 'No Department'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full
                            ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => { setEditForm(user); setShowEditModal(true); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openPermissions(user)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                              title="Permissions"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleToggleActive(user.id)}
                              className={`p-2 rounded-lg ${user.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
                  <p className="text-gray-500">Manage organization departments</p>
                </div>
                <button 
                  onClick={() => setShowDeptModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map(dept => (
                  <div key={dept.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Briefcase className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full
                        ${dept.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{dept.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">Code: {dept.code}</p>
                    <p className="text-sm text-gray-600 mb-4">{dept.description || 'No description'}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      {dept._count?.users || 0} users
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      
      {/* Create User Modal */}
      {showUserModal && (
        <Modal title="Create New User" icon={Plus} onClose={() => setShowUserModal(false)} maxWidth={700}>
          <form onSubmit={handleCreateUser} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input 
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={userForm.name || ''}
                  onChange={e => setUserForm({...userForm, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input 
                  type="email"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={userForm.email || ''}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value})}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={userForm.departmentId || ''}
                  onChange={e => setUserForm({...userForm, departmentId: e.target.value})}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={userForm.phone || ''}
                  onChange={e => setUserForm({...userForm, phone: e.target.value})}
                  placeholder="+234..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={userForm.timezone}
                  onChange={e => setUserForm({...userForm, timezone: e.target.value})}
                >
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password"
                className="w-full px-3 py-2 border rounded-lg"
                value={userForm.password || ''}
                onChange={e => setUserForm({...userForm, password: e.target.value})}
                placeholder="Leave blank for auto-generated secure password"
              />
              <p className="text-xs text-gray-500 mt-1">If left blank, a secure password will be generated and must be reset on first login</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEditModal && editForm && (
        <Modal title={`Edit User - ${editForm.name}`} icon={Edit2} onClose={() => setShowEditModal(false)} maxWidth={800}>
          <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
            <div className="flex justify-center pb-6 border-b">
              <AvatarUpload 
                currentAvatar={editForm.avatar} 
                userName={editForm.name}
                onUpload={(formData) => handleAvatarUpload(editForm.id, formData)}
                size={120}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input 
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={editForm.name || ''}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input 
                  type="email"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={editForm.email || ''}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={editForm.role}
                  onChange={e => setEditForm({...editForm, role: e.target.value})}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={editForm.departmentId || ''}
                  onChange={e => setEditForm({...editForm, departmentId: e.target.value})}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={editForm.phone || ''}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={editForm.timezone || 'Africa/Lagos'}
                  onChange={e => setEditForm({...editForm, timezone: e.target.value})}
                >
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => { setShowEditModal(false); setEditForm(null); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <Modal title={`Permissions - ${selectedUser.name}`} icon={ShieldCheck} onClose={() => setShowPermissionsModal(false)} maxWidth={700}>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">
              Manage feature access for this user. Preset permissions are based on their role/department.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURE_KEYS.map(key => {
                const isEnabled = getPermValue(key);
                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <button 
                      onClick={() => handleTogglePerm(key, isEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-4 border-t mt-6">
              <button onClick={() => setShowPermissionsModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <Modal title="System Settings" icon={Settings} onClose={() => setShowSettingsModal(false)} maxWidth={900}>
          <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Company Branding</h3>
              <LogoUpload currentLogo={settings?.logoUrl} onUpload={handleLogoUpload} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={settings?.companyName || ''}
                  onChange={e => setSettings({...settings, companyName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                <input 
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={settings?.companyEmail || ''}
                  onChange={e => setSettings({...settings, companyEmail: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  className="w-full px-3 py-2 border rounded-lg"
                  value={settings?.companyPhone || ''}
                  onChange={e => setSettings({...settings, companyPhone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg"
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
              <h3 className="font-semibold text-gray-900 mb-4">Theme Colors</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer"
                      value={settings?.primaryColor || '#1B3A6B'}
                      onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                    />
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{settings?.primaryColor || '#1B3A6B'}</code>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer"
                      value={settings?.secondaryColor || '#1A7A4A'}
                      onChange={e => setSettings({...settings, secondaryColor: e.target.value})}
                    />
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{settings?.secondaryColor || '#1A7A4A'}</code>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer"
                      value={settings?.accentColor || '#D35400'}
                      onChange={e => setSettings({...settings, accentColor: e.target.value})}
                    />
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{settings?.accentColor || '#D35400'}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Settings
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <Modal title="Create Department" icon={Briefcase} onClose={() => setShowDeptModal(false)}>
          <form onSubmit={handleCreateDept} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
              <input 
                required
                className="w-full px-3 py-2 border rounded-lg"
                value={deptForm.name || ''}
                onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                placeholder="e.g., Sales Department"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Code *</label>
              <input 
                required
                className="w-full px-3 py-2 border rounded-lg uppercase"
                value={deptForm.code || ''}
                onChange={e => setDeptForm({...deptForm, code: e.target.value.toUpperCase()})}
                placeholder="e.g., SALES"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
                value={deptForm.description || ''}
                onChange={e => setDeptForm({...deptForm, description: e.target.value})}
                placeholder="Brief description of the department..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Department
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}