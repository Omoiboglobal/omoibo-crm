const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Preset permissions by department/role
const PRESET_PERMISSIONS = {
  SALES: ['view_sales', 'manage_sales', 'create_leads', 'update_leads', 'create_deals', 'view_revenue'],
  INVENTORY: ['view_inventory', 'manage_inventory', 'approve_transfers', 'view_products'],
  LOGISTICS: ['view_logistics', 'manage_logistics', 'update_orders', 'view_deliveries'],
  FINANCE: ['view_finance', 'manage_finance', 'create_transactions', 'approve_petty_cash', 'view_reports'],
  HR: ['view_hr', 'manage_hr', 'approve_leave', 'view_payroll', 'manage_staff'],
  FACILITY: ['view_facility', 'manage_facility', 'update_assets'],
  ADMINISTRATION: ['view_sales', 'manage_sales', 'view_inventory', 'manage_inventory', 'view_finance', 'manage_finance', 'view_hr', 'manage_hr', 'view_logistics', 'manage_logistics', 'view_facility', 'manage_facility'],
  EXECUTIVE: ['view_sales', 'view_revenue', 'view_inventory', 'view_finance', 'view_hr', 'view_logistics', 'view_facility', 'view_reports', 'approve_budgets']
};

// ================= DEPARTMENTS =================

exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: departments });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    const existing = await prisma.department.findFirst({
      where: { 
        OR: [
          { name: { equals: name, mode: 'insensitive' } }, 
          { code: { equals: code, mode: 'insensitive' } }
        ] 
      }
    });
    
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'Duplicate department',
        message: 'A department with this name or code already exists' 
      });
    }

    const dept = await prisma.department.create({
      data: { name, code: code.toUpperCase(), description }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_DEPARTMENT',
        entityType: 'DEPARTMENT',
        entityId: dept.id,
        newValue: { name, code },
        ipAddress: req.ip
      }
    });

    res.status(201).json({ success: true, data: dept });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;
    
    const dept = await prisma.department.update({
      where: { id },
      data: { name, code: code?.toUpperCase(), description, isActive }
    });

    res.json({ success: true, data: dept });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ================= USERS =================

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, departmentId, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { 
          department: true,
          permissions: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users.map(({ password, ...u }) => u),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentId, phone, timezone } = req.body;

    // Duplicate detection - Email
    const existingEmail = await prisma.user.findFirst({
      where: { 
        email: { equals: email.toLowerCase(), mode: 'insensitive' } 
      }
    });

    if (existingEmail) {
      return res.status(409).json({ 
        success: false,
        error: 'Duplicate email',
        message: 'This email address is already registered.'
      });
    }

    // Duplicate detection - Name
    const existingName = await prisma.user.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' } 
      }
    });

    if (existingName) {
      return res.status(409).json({ 
        success: false,
        error: 'Duplicate name',
        message: 'A user with this name already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password || generateSecurePassword(), 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
          departmentId,
          phone,
          timezone: timezone || 'Africa/Lagos'
        }
      });

      // Auto-assign preset permissions
      const presetPerms = PRESET_PERMISSIONS[role] || [];
      if (presetPerms.length > 0) {
        await tx.permission.createMany({
          data: presetPerms.map(featureKey => ({
            userId: user.id,
            featureKey,
            isEnabled: true
          }))
        });
      }

      return user;
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: result.id,
        newValue: { name, email, role, departmentId },
        ipAddress: req.ip
      }
    });

    res.status(201).json({ 
      success: true, 
      data: { ...result, password: undefined },
      message: 'User created successfully with preset permissions'
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, departmentId, phone, timezone, isActive } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check duplicate email if changed
    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const duplicateEmail = await prisma.user.findFirst({
        where: { 
          email: { equals: email.toLowerCase(), mode: 'insensitive' },
          NOT: { id }
        }
      });

      if (duplicateEmail) {
        return res.status(409).json({ 
          success: false,
          error: 'Duplicate email',
          message: 'This email is already registered by another user.'
        });
      }
    }

    // Check duplicate name if changed
    if (name && name.toLowerCase() !== existingUser.name.toLowerCase()) {
      const duplicateName = await prisma.user.findFirst({
        where: { 
          name: { equals: name, mode: 'insensitive' },
          NOT: { id }
        }
      });

      if (duplicateName) {
        return res.status(409).json({ 
          success: false,
          error: 'Duplicate name',
          message: 'Another user with this name already exists.'
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        email: email?.toLowerCase(),
        role,
        departmentId,
        phone,
        timezone,
        isActive
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: id,
        newValue: { name, email, role, departmentId, phone, timezone, isActive },
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: { ...updated, password: undefined } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: updated.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entityType: 'USER',
        entityId: id,
        newValue: { isActive: updated.isActive },
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: { isActive: updated.isActive } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ================= AVATAR & LOGO UPLOAD =================

exports.uploadAvatar = async (req, res) => {
  const uploadSingle = upload.single('avatar');
  
  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { id } = req.params;
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const avatarUrl = `/uploads/${req.file.filename}`;

      await prisma.user.update({
        where: { id },
        data: { avatar: avatarUrl }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPLOAD_AVATAR',
          entityType: 'USER',
          entityId: id,
          newValue: { avatarUrl },
          ipAddress: req.ip
        }
      });

      res.json({ success: true, data: { avatarUrl }, message: 'Avatar uploaded successfully' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
};

exports.uploadLogo = async (req, res) => {
  const uploadSingle = upload.single('logo');
  
  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const logoUrl = `/uploads/${req.file.filename}`;

      await prisma.systemSettings.upsert({
        where: { id: 'default' },
        update: { logoUrl, updatedAt: new Date() },
        create: { id: 'default', logoUrl }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPLOAD_LOGO',
          entityType: 'SETTINGS',
          newValue: { logoUrl },
          ipAddress: req.ip
        }
      });

      res.json({ success: true, data: { logoUrl }, message: 'Company logo uploaded successfully' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
};

// ================= SETTINGS =================

exports.getSettings = async (req, res) => {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'default' }
      });
    }

    res.json({ success: true, data: settings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      primaryColor,
      secondaryColor,
      accentColor,
      defaultTimezone,
      dateFormat,
      currency,
      invoiceSettings
    } = req.body;

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: {
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        primaryColor,
        secondaryColor,
        accentColor,
        defaultTimezone,
        dateFormat,
        currency,
        invoiceSettings: invoiceSettings || undefined,
        updatedAt: new Date()
      },
      create: {
        id: 'default',
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        primaryColor,
        secondaryColor,
        accentColor,
        defaultTimezone,
        dateFormat,
        currency,
        invoiceSettings
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SETTINGS',
        entityType: 'SETTINGS',
        newValue: { companyName, companyEmail, primaryColor },
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: settings, message: 'Settings saved successfully' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ================= STATS =================

exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, period = '30d' } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } };
    } else {
      const days = parseInt(period) || 30;
      dateFilter = { createdAt: { gte: new Date(Date.now() - days * 86400000) } };
    }

    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersByDepartment,
      usersByRole,
      auditLogs,
      recentLogs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: dateFilter }),
      prisma.user.groupBy({
        by: ['departmentId'],
        _count: { departmentId: true }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.auditLog.count({ where: dateFilter }),
      prisma.auditLog.findMany({
        where: dateFilter,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } }
      })
    ]);

    const departments = await prisma.department.findMany({
      where: { id: { in: usersByDepartment.map(u => u.departmentId).filter(Boolean) } }
    });
    
    const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));
    const usersByDeptWithNames = usersByDepartment.map(u => ({
      name: deptMap[u.departmentId] || 'No Department',
      count: u._count.departmentId
    }));

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          new: newUsers,
          byDepartment: usersByDeptWithNames,
          byRole: usersByRole
        },
        activity: {
          totalAuditLogs: auditLogs,
          recent: recentLogs
        }
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ================= PERMISSIONS =================

exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const perms = await prisma.permission.findMany({ where: { userId } });
    res.json({ success: true, data: perms });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.togglePermission = async (req, res) => {
  try {
    const { userId, featureKey, isEnabled } = req.body;
    
    const perm = await prisma.permission.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      update: { isEnabled },
      create: { userId, featureKey, isEnabled }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PERMISSION_TOGGLE',
        entityType: 'PERMISSION',
        entityId: userId,
        newValue: { featureKey, isEnabled },
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: perm });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ================= AUDIT LOGS =================

exports.getAuditLogs = async (req, res) => {
  try {
    const { entityType, action, userId, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, role: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({ 
      success: true, 
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}