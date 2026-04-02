const express = require('express');
const router = express.Router();
const { authenticate, hasPermission, requireRoles } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
router.use(authenticate);

// ── STAFF DIRECTORY ───────────────────────────────────────────────────────────
router.get('/staff', hasPermission('view_hr'), async (req, res) => {
  try {
    const { search, department } = req.query;
    const where = {};
    if (department) where.department = department;
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    const staff = await prisma.user.findMany({
      where,
      include: { staffProfile: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: staff.map(({ password, ...s }) => s) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/staff/:id', hasPermission('view_hr'), async (req, res) => {
  try {
    const staff = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        staffProfile: { include: { documents: true, payslips: { orderBy: { generatedAt: 'desc' }, take: 12 }, performanceReviews: { orderBy: { reviewDate: 'desc' } } } },
        attendances: { orderBy: { date: 'desc' }, take: 30 },
        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });
    const { password, ...safe } = staff;
    res.json({ success: true, data: safe });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/staff/:id/profile', hasPermission('manage_hr'), async (req, res) => {
  try {
    const profile = await prisma.staffProfile.upsert({
      where: { userId: req.params.id },
      update: req.body,
      create: { userId: req.params.id, employeeId: `EMP-${Date.now()}`, ...req.body }
    });
    res.json({ success: true, data: profile });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── ATTENDANCE ────────────────────────────────────────────────────────────────
router.get('/attendance', hasPermission('view_hr'), async (req, res) => {
  try {
    const { date, userId } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (date) {
      const d = new Date(date);
      where.date = { gte: new Date(d.setHours(0,0,0,0)), lte: new Date(d.setHours(23,59,59,999)) };
    }
    // HR_OFFICER can see all; regular staff only see own
    if (!['ADMIN','HR_MANAGER','HR_OFFICER','CEO','COO'].includes(req.user.role)) where.userId = req.user.id;
    const att = await prisma.attendance.findMany({
      where,
      include: { user: { select: { name: true, department: true, role: true } } },
      orderBy: { date: 'desc' },
      take: 200
    });
    res.json({ success: true, data: att });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/attendance/clock-in', authenticate, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const existing = await prisma.attendance.findFirst({ where: { userId: req.user.id, date: { gte: today } } });
    if (existing) return res.status(400).json({ success: false, error: 'Already clocked in today' });
    const now = new Date();
    const lateThreshold = new Date(); lateThreshold.setHours(9, 0, 0, 0);
    const status = now > lateThreshold ? 'LATE' : 'PRESENT';
    const record = await prisma.attendance.create({ data: { userId: req.user.id, date: now, clockIn: now, status } });
    res.json({ success: true, data: record });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/attendance/clock-out', authenticate, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const record = await prisma.attendance.findFirst({ where: { userId: req.user.id, date: { gte: today }, clockOut: null } });
    if (!record) return res.status(404).json({ success: false, error: 'No active clock-in found' });
    const now = new Date();
    const hoursWorked = record.clockIn ? (now - new Date(record.clockIn)) / 3600000 : 0;
    const updated = await prisma.attendance.update({ where: { id: record.id }, data: { clockOut: now, hoursWorked: Math.round(hoursWorked * 10) / 10 } });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// HR Officer: manually record attendance
router.post('/attendance/record', hasPermission('manage_attendance'), async (req, res) => {
  try {
    const record = await prisma.attendance.create({ data: req.body });
    res.status(201).json({ success: true, data: record });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/attendance/:id', hasPermission('manage_attendance'), async (req, res) => {
  try {
    const record = await prisma.attendance.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: record });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── LEAVE REQUESTS ────────────────────────────────────────────────────────────
router.get('/leave', authenticate, async (req, res) => {
  try {
    const canSeeAll = ['ADMIN','HR_MANAGER','HR_OFFICER','CEO','COO'].includes(req.user.role);
    const { status } = req.query;
    const where = canSeeAll ? {} : { requesterId: req.user.id };
    if (status) where.status = status;
    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { requester: { select: { name: true, department: true, role: true } }, approver: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: leaves });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/leave', authenticate, async (req, res) => {
  try {
    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    const days = Math.ceil((end - start) / 86400000) + 1;
    const leave = await prisma.leaveRequest.create({ data: { ...req.body, days, requesterId: req.user.id, startDate: start, endDate: end } });
    // Notify HR Manager
    const hrs = await prisma.user.findMany({ where: { role: { in: ['HR_MANAGER','HR_OFFICER'] }, isActive: true } });
    for (const hr of hrs) {
      try { await prisma.notification.create({ data: { userId: hr.id, title: 'Leave Request', message: `${req.user.name} submitted a ${req.body.leaveType} leave request`, type: 'INFO' } }); } catch {}
    }
    res.status(201).json({ success: true, data: leave });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// HR_OFFICER: can process/forward; HR_MANAGER: can approve
router.put('/leave/:id/approve', hasPermission('approve_leave'), async (req, res) => {
  try {
    const { status, approverNote } = req.body;
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status, approverId: req.user.id, approverNote }
    });
    try { await prisma.notification.create({ data: { userId: leave.requesterId, title: `Leave ${status}`, message: `Your leave request has been ${status.toLowerCase()}`, type: status === 'APPROVED' ? 'SUCCESS' : 'DANGER' } }); } catch {}
    res.json({ success: true, data: leave });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PAYSLIPS ──────────────────────────────────────────────────────────────────
router.get('/payslips', hasPermission('view_payroll'), async (req, res) => {
  try {
    // Staff can only see their own payslips
    const canSeeAll = ['ADMIN','HR_MANAGER','FINANCE_MANAGER','CEO','COO'].includes(req.user.role);
    let payslips;
    if (canSeeAll) {
      payslips = await prisma.payslip.findMany({
        include: { staffProfile: { include: { user: { select: { name: true, department: true } } } } },
        orderBy: { generatedAt: 'desc' }
      });
    } else {
      const profile = await prisma.staffProfile.findUnique({ where: { userId: req.user.id } });
      payslips = profile ? await prisma.payslip.findMany({ where: { staffProfileId: profile.id }, orderBy: { generatedAt: 'desc' } }) : [];
    }
    res.json({ success: true, data: payslips });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/payslips/generate', hasPermission('manage_hr'), async (req, res) => {
  try {
    const { staffProfileId, period, basicSalary, allowances = 0, deductions = 0 } = req.body;
    const tax = basicSalary * 0.075; // 7.5% simplified
    const pension = basicSalary * 0.08; // 8% pension
    const netPay = basicSalary + allowances - deductions - tax - pension;
    const payslip = await prisma.payslip.create({ data: { staffProfileId, period, basicSalary: Number(basicSalary), allowances: Number(allowances), deductions: Number(deductions), tax, pension, netPay } });
    res.status(201).json({ success: true, data: payslip });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PERFORMANCE REVIEWS ───────────────────────────────────────────────────────
router.get('/performance', hasPermission('view_hr'), async (req, res) => {
  try {
    const reviews = await prisma.performanceReview.findMany({
      include: { staffProfile: { include: { user: { select: { name: true, department: true } } } } },
      orderBy: { reviewDate: 'desc' }
    });
    res.json({ success: true, data: reviews });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/performance', requireRoles('ADMIN','HR_MANAGER','CEO','COO'), async (req, res) => {
  try {
    const review = await prisma.performanceReview.create({ data: req.body });
    res.status(201).json({ success: true, data: review });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
router.get('/stats', hasPermission('view_hr'), async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalStaff, activeStaff, pendingLeave, todayAttendance, onLeave] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.attendance.count({ where: { date: { gte: today } } }),
      prisma.leaveRequest.count({ where: { status: 'APPROVED', startDate: { lte: new Date() }, endDate: { gte: new Date() } } }),
    ]);
    res.json({ success: true, data: { totalStaff, activeStaff, pendingLeave, todayAttendance, onLeave, presentRate: totalStaff > 0 ? ((todayAttendance / totalStaff) * 100).toFixed(0) : 0 } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
