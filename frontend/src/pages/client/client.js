import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || '/api/v1' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(res => res, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    orig._retry = true;
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken: refresh });
        localStorage.setItem('token', data.data.token);
        orig.headers.Authorization = `Bearer ${data.data.token}`;
        return api(orig);
      } catch { localStorage.clear(); window.location.href = '/login'; }
    }
  }
  return Promise.reject(err);
});

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');

// ── USERS ─────────────────────────────────────────────────────────────────────
export const getAllUsers = () => api.get('/users');
export const getUsers = () => api.get('/users');
export const getNotifications = () => api.get('/users/notifications');
export const markNotificationRead = (id) => api.put(`/users/notifications/${id}/read`);

// ── SALES — CONTACTS ──────────────────────────────────────────────────────────
export const getContacts = (params) => api.get('/sales/contacts', { params });
export const getContact = (id) => api.get(`/sales/contacts/${id}`);
export const createContact = (data) => api.post('/sales/contacts', data);
export const updateContact = (id, data) => api.put(`/sales/contacts/${id}`, data);

// ── SALES — ACCOUNTS ──────────────────────────────────────────────────────────
export const getAccounts = (params) => api.get('/sales/accounts', { params });
export const getAccount = (id) => api.get(`/sales/accounts/${id}`);
export const createAccount = (data) => api.post('/sales/accounts', data);
export const updateAccount = (id, data) => api.put(`/sales/accounts/${id}`, data);

// ── SALES — LEADS ─────────────────────────────────────────────────────────────
export const getLeads = (params) => api.get('/sales/leads', { params });
export const getLead = (id) => api.get(`/sales/leads/${id}`);
export const createLead = (data) => api.post('/sales/leads', data);
export const updateLead = (id, data) => api.put(`/sales/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/sales/leads/${id}`);

// ── SALES — DEALS ─────────────────────────────────────────────────────────────
export const getDeals = (params) => api.get('/sales/deals', { params });
export const createDeal = (data) => api.post('/sales/deals', data);
export const updateDeal = (id, data) => api.put(`/sales/deals/${id}`, data);

// ── SALES — QUOTES ────────────────────────────────────────────────────────────
export const getQuotes = () => api.get('/sales/quotes');
export const getQuote = (id) => api.get(`/sales/quotes/${id}`);
export const createQuote = (data) => api.post('/sales/quotes', data);
export const updateQuote = (id, data) => api.put(`/sales/quotes/${id}`, data);

// ── SALES — ACTIVITIES & TASKS ────────────────────────────────────────────────
export const getActivities = (params) => api.get('/sales/activities', { params });
export const createActivity = (data) => api.post('/sales/activities', data);
export const getTasks = () => api.get('/sales/tasks');
export const createTask = (data) => api.post('/sales/tasks', data);
export const updateTask = (id, data) => api.put(`/sales/tasks/${id}`, data);
export const getSalesStats = () => api.get('/sales/stats');

// ── INVENTORY — WAREHOUSES ────────────────────────────────────────────────────
export const getWarehouses = () => api.get('/inventory/warehouses');
export const getWarehouse = (id) => api.get(`/inventory/warehouses/${id}`);
export const createWarehouse = (data) => api.post('/inventory/warehouses', data);
export const updateWarehouse = (id, data) => api.put(`/inventory/warehouses/${id}`, data);
export const deleteWarehouse = (id) => api.delete(`/inventory/warehouses/${id}`);

// ── INVENTORY — CATEGORIES ────────────────────────────────────────────────────
export const getCategories = () => api.get('/inventory/categories');
export const createCategory = (data) => api.post('/inventory/categories', data);

// ── INVENTORY — PRODUCTS ──────────────────────────────────────────────────────
export const getProducts = (params) => api.get('/inventory/products', { params });
export const getProduct = (id) => api.get(`/inventory/products/${id}`);
export const createProduct = (data) => api.post('/inventory/products', data);
export const updateProduct = (id, data) => api.put(`/inventory/products/${id}`, data);
export const adjustStock = (id, data) => api.post(`/inventory/products/${id}/adjust`, data);

// ── INVENTORY — SUPPLIERS ─────────────────────────────────────────────────────
export const getSuppliers = () => api.get('/inventory/suppliers');
export const createSupplier = (data) => api.post('/inventory/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/inventory/suppliers/${id}`, data);

// ── INVENTORY — PURCHASE ORDERS ───────────────────────────────────────────────
export const getPurchaseOrders = () => api.get('/inventory/purchase-orders');
export const createPurchaseOrder = (data) => api.post('/inventory/purchase-orders', data);
export const updatePurchaseOrder = (id, data) => api.put(`/inventory/purchase-orders/${id}`, data);

// ── INVENTORY — TRANSFERS & MOVEMENTS ────────────────────────────────────────
export const getTransfers = () => api.get('/inventory/transfers');
export const createTransfer = (data) => api.post('/inventory/transfers', data);
export const approveTransfer = (id, data) => api.put(`/inventory/transfers/${id}/approve`, data);
export const getStockMovements = (params) => api.get('/inventory/movements', { params });
export const getInventoryStats = () => api.get('/inventory/stats');

// ── LOGISTICS ─────────────────────────────────────────────────────────────────
export const getOrders = (params) => api.get('/logistics/orders', { params });
export const createOrder = (data) => api.post('/logistics/orders', data);
export const updateOrder = (id, data) => api.put(`/logistics/orders/${id}`, data);
export const getLogisticsStats = () => api.get('/logistics/stats');

// ── FINANCE — CHART OF ACCOUNTS ───────────────────────────────────────────────
export const getChartOfAccounts = () => api.get('/finance/accounts');
export const createChartAccount = (data) => api.post('/finance/accounts', data);
export const updateChartAccount = (id, data) => api.put(`/finance/accounts/${id}`, data);

// ── FINANCE — INVOICES ────────────────────────────────────────────────────────
export const getInvoices = (params) => api.get('/finance/invoices', { params });
export const getInvoice = (id) => api.get(`/finance/invoices/${id}`);
export const createInvoice = (data) => api.post('/finance/invoices', data);
export const updateInvoice = (id, data) => api.put(`/finance/invoices/${id}`, data);
export const sendInvoice = (id) => api.put(`/finance/invoices/${id}/send`);
export const voidInvoice = (id) => api.put(`/finance/invoices/${id}/void`);

// ── FINANCE — BILLS ───────────────────────────────────────────────────────────
export const getBills = (params) => api.get('/finance/bills', { params });
export const getBill = (id) => api.get(`/finance/bills/${id}`);
export const createBill = (data) => api.post('/finance/bills', data);

// ── FINANCE — PAYMENTS ────────────────────────────────────────────────────────
export const getPayments = () => api.get('/finance/payments');
export const createPayment = (data) => api.post('/finance/payments', data);

// ── FINANCE — PETTY CASH ──────────────────────────────────────────────────────
export const getPettyCash = () => api.get('/finance/petty-cash');
export const createPettyCash = (data) => api.post('/finance/petty-cash', data);
export const approvePettyCash = (id, data) => api.put(`/finance/petty-cash/${id}/approve`, data);
export const disbursePettyCash = (id, data) => api.put(`/finance/petty-cash/${id}/disburse`, data);

// ── FINANCE — BUDGETS ─────────────────────────────────────────────────────────
export const getBudgets = () => api.get('/finance/budgets');
export const createBudget = (data) => api.post('/finance/budgets', data);
export const updateBudget = (id, data) => api.put(`/finance/budgets/${id}`, data);

// ── FINANCE — TRANSACTIONS ────────────────────────────────────────────────────
export const getTransactions = (params) => api.get('/finance/transactions', { params });
export const createTransaction = (data) => api.post('/finance/transactions', data);

// ── FINANCE — BANK & TAX ──────────────────────────────────────────────────────
export const getBankAccounts = () => api.get('/finance/bank-accounts');
export const createBankAccount = (data) => api.post('/finance/bank-accounts', data);
export const getTaxRates = () => api.get('/finance/tax-rates');

// ── FINANCE — REPORTS ─────────────────────────────────────────────────────────
export const getPLReport = (params) => api.get('/finance/reports/pl', { params });
export const getARAgingReport = () => api.get('/finance/reports/ar-aging');
export const getAPAgingReport = () => api.get('/finance/reports/ap-aging'); // note: add this route if needed
export const getCashFlowReport = () => api.get('/finance/reports/cash-flow');
export const getBalanceSheet = () => api.get('/finance/reports/balance-sheet');
export const getFinanceStats = () => api.get('/finance/stats');

// ── FINANCE — JOURNAL ─────────────────────────────────────────────────────────
export const getJournalEntries = () => api.get('/finance/journal');
export const createJournalEntry = (data) => api.post('/finance/journal', data);

// ── HR ────────────────────────────────────────────────────────────────────────
export const getStaff = (params) => api.get('/hr/staff', { params });
export const getStaffMember = (id) => api.get(`/hr/staff/${id}`);
export const updateStaffProfile = (id, data) => api.put(`/hr/staff/${id}/profile`, data);
export const getAttendance = (params) => api.get('/hr/attendance', { params });
export const clockIn = () => api.post('/hr/attendance/clock-in');
export const clockOut = () => api.post('/hr/attendance/clock-out');
export const recordAttendance = (data) => api.post('/hr/attendance/record', data);
export const updateAttendance = (id, data) => api.put(`/hr/attendance/${id}`, data);
export const getLeaves = (params) => api.get('/hr/leave', { params });
export const createLeave = (data) => api.post('/hr/leave', data);
export const approveLeave = (id, data) => api.put(`/hr/leave/${id}/approve`, data);
export const getPayslips = () => api.get('/hr/payslips');
export const generatePayslip = (data) => api.post('/hr/payslips/generate', data);
export const getPerformanceReviews = () => api.get('/hr/performance');
export const createPerformanceReview = (data) => api.post('/hr/performance', data);
export const getHRStats = () => api.get('/hr/stats');

// ── FACILITY ──────────────────────────────────────────────────────────────────
export const getAssets = () => api.get('/facility/assets');
export const createAsset = (data) => api.post('/facility/assets', data);
export const updateAsset = (id, data) => api.put(`/facility/assets/${id}`, data);
export const addMaintenance = (id, data) => api.post(`/facility/assets/${id}/maintenance`, data);
export const getFacilityStats = () => api.get('/facility/stats');

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export const getAdminUsers = () => api.get('/admin/users');
export const createUser = (data) => api.post('/admin/users', data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const toggleUserActive = (id) => api.put(`/admin/users/${id}/toggle-active`);
export const getUserPermissions = (id) => api.get(`/admin/permissions/${id}`);
export const togglePermission = (data) => api.post('/admin/permissions/toggle', data);
export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
export const getSystemSettings = () => api.get('/admin/system-settings');
export const saveSystemSettings = (data) => api.post('/admin/system-settings', data);
export const getAdminStats = () => api.get('/admin/stats');

// ── EXECUTIVE ─────────────────────────────────────────────────────────────────
export const getExecutiveDashboard = () => api.get('/executive/dashboard');

// ── AI ────────────────────────────────────────────────────────────────────────
export const getAIAgents = () => api.get('/ai/agents');
export const createAIAgent = (data) => api.post('/ai/agents', data);
export const updateAIAgent = (id, data) => api.put(`/ai/agents/${id}`, data);
export const getAIConversations = () => api.get('/ai/conversations');
export const getAIConversation = (id) => api.get(`/ai/conversations/${id}`);
export const createAIConversation = (data) => api.post('/ai/conversations', data);
export const deleteAIConversation = (id) => api.delete(`/ai/conversations/${id}`);
export const sendAIMessage = (data) => api.post('/ai/chat', data);
export const getAIInsight = (data) => api.post('/ai/insights', data);

export default api;
