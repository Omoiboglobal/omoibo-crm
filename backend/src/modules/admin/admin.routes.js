const express = require('express');
const router = express.Router();
const { authenticate, requireRoles } = require('../../middleware/auth.middleware');
const adminController = require('./admin.controller');

// All routes require ADMIN role
router.use(authenticate, requireRoles('ADMIN'));

// ================= DEPARTMENTS =================
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);

// ================= USERS =================
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/toggle-active', adminController.toggleUserActive);
router.post('/users/:id/avatar', adminController.uploadAvatar);

// ================= SETTINGS & BRANDING =================
router.get('/system-settings', adminController.getSettings);
router.post('/system-settings', adminController.saveSettings);
router.post('/settings/logo', adminController.uploadLogo);

// ================= PERMISSIONS =================
router.get('/permissions/:userId', adminController.getUserPermissions);
router.post('/permissions/toggle', adminController.togglePermission);

// ================= AUDIT LOGS =================
router.get('/audit-logs', adminController.getAuditLogs);

// ================= STATS =================
router.get('/stats', adminController.getStats);

module.exports = router;