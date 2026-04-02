const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Role hierarchy levels (lower = more powerful)
const ROLE_LEVELS = {
  ADMIN: 1,
  CEO: 1, COO: 1,
  SALES_MANAGER: 3, INVENTORY_MANAGER: 3, LOGISTICS_MANAGER: 3,
  FINANCE_MANAGER: 3, HR_MANAGER: 3, FACILITY_MANAGER: 3,
  SALES_TEAM_LEAD: 4, FINANCE_OFFICER: 4,
  SALES_AGENT: 5, INVENTORY_OFFICER: 5, LOGISTICS_OFFICER: 5,
  ACCOUNTANT: 5, HR_OFFICER: 5, FACILITY_OFFICER: 5,
};

// Default permissions per role
const DEFAULT_PERMISSIONS = {
  ADMIN: ['all'],
  CEO: ['view_all', 'view_revenue', 'executive_dashboard', 'view_audit_logs'],
  COO: ['view_all', 'view_revenue', 'executive_dashboard', 'view_audit_logs'],
  SALES_MANAGER: ['view_sales', 'manage_sales', 'view_revenue', 'view_inventory', 'view_logistics'],
  SALES_TEAM_LEAD: ['view_sales', 'manage_sales'],
  SALES_AGENT: ['view_sales', 'create_leads', 'update_leads', 'create_deals'],
  INVENTORY_MANAGER: ['view_inventory', 'manage_inventory', 'view_logistics', 'approve_transfers'],
  INVENTORY_OFFICER: ['view_inventory', 'update_inventory'],
  LOGISTICS_MANAGER: ['view_logistics', 'manage_logistics', 'view_inventory'],
  LOGISTICS_OFFICER: ['view_logistics', 'update_orders'],
  FINANCE_MANAGER: ['view_finance', 'manage_finance', 'view_revenue', 'approve_petty_cash', 'view_payroll'],
  FINANCE_OFFICER: ['view_finance', 'create_transactions', 'process_payments'],
  ACCOUNTANT: ['view_finance', 'create_transactions', 'reconcile'],
  HR_MANAGER: ['view_hr', 'manage_hr', 'approve_leave', 'view_payroll'],
  HR_OFFICER: ['view_hr', 'manage_attendance'],
  FACILITY_MANAGER: ['view_facility', 'manage_facility', 'view_finance'],
  FACILITY_OFFICER: ['view_facility', 'update_assets'],
};

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { permissions: true }
    });

    if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'Unauthorised' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const hasPermission = (featureKey) => async (req, res, next) => {
  const { user } = req;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorised' });

  // Admin and Exec always pass
  if (['ADMIN', 'CEO', 'COO'].includes(user.role)) return next();
  if (featureKey === 'all') return next();

  // Check default role permissions
  const rolePerms = DEFAULT_PERMISSIONS[user.role] || [];
  if (rolePerms.includes(featureKey)) return next();

  // Check dynamic permission overrides
  const override = user.permissions.find(p => p.featureKey === featureKey);
  if (override && override.isEnabled) return next();

  return res.status(403).json({ success: false, error: 'Access denied: insufficient permissions' });
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorised' });
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ success: false, error: 'Access denied: role not permitted' });
};

const requireLevel = (maxLevel) => (req, res, next) => {
  const level = ROLE_LEVELS[req.user?.role] ?? 99;
  if (level <= maxLevel) return next();
  return res.status(403).json({ success: false, error: 'Access denied: insufficient authority level' });
};

module.exports = { authenticate, hasPermission, requireRoles, requireLevel, DEFAULT_PERMISSIONS, ROLE_LEVELS };
