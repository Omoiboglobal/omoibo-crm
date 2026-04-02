import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe().then(res => setUser(res.data.data)).catch(() => localStorage.clear()).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    const { user, token, refreshToken } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const hasPermission = (key) => {
    if (!user) return false;
    if (['ADMIN', 'CEO', 'COO'].includes(user.role)) return true;
    const override = user.permissions?.find(p => p.featureKey === key);
    if (override) return override.isEnabled;
    const defaults = {
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
    return (defaults[user.role] || []).includes(key);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
