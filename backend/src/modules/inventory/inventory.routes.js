const express = require('express');
const router = express.Router();
const { authenticate, hasPermission, requireRoles } = require('../../middleware/auth.middleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
router.use(authenticate);

// ── WAREHOUSES ────────────────────────────────────────────────────────────────
router.get('/warehouses', hasPermission('view_inventory'), async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }]
    });
    res.json({ success: true, data: warehouses });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/warehouses/:id', hasPermission('view_inventory'), async (req, res) => {
  try {
    const wh = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { products: { include: { category: true } }, _count: { select: { products: true } } }
    });
    if (!wh) return res.status(404).json({ success: false, error: 'Warehouse not found' });
    res.json({ success: true, data: wh });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/warehouses', requireRoles('ADMIN','INVENTORY_MANAGER','COO','CEO'), async (req, res) => {
  try {
    // Generate code if not provided
    if (!req.body.code) {
      const count = await prisma.warehouse.count();
      req.body.code = `WH-${String(count + 1).padStart(3, '0')}`;
    }
    const wh = await prisma.warehouse.create({ data: req.body });
    res.status(201).json({ success: true, data: wh });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/warehouses/:id', requireRoles('ADMIN','INVENTORY_MANAGER','COO','CEO'), async (req, res) => {
  try {
    const wh = await prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: wh });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/warehouses/:id', requireRoles('ADMIN'), async (req, res) => {
  try {
    const count = await prisma.product.count({ where: { warehouseId: req.params.id } });
    if (count > 0) return res.status(400).json({ success: false, error: `Cannot delete — ${count} products assigned to this warehouse` });
    await prisma.warehouse.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PRODUCT CATEGORIES ────────────────────────────────────────────────────────
router.get('/categories', hasPermission('view_inventory'), async (req, res) => {
  try {
    const cats = await prisma.productCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: cats });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/categories', hasPermission('manage_inventory'), async (req, res) => {
  try {
    const cat = await prisma.productCategory.create({ data: req.body });
    res.status(201).json({ success: true, data: cat });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
router.get('/products', hasPermission('view_inventory'), async (req, res) => {
  try {
    const { search, warehouseId, categoryId, lowStock } = req.query;
    const where = { isActive: true };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ];
    if (warehouseId) where.warehouseId = warehouseId;
    if (categoryId) where.categoryId = categoryId;
    if (lowStock === 'true') where.quantity = { lte: prisma.product.fields?.reorderLevel };

    const products = await prisma.product.findMany({
      where,
      include: {
        warehouse: { select: { name: true, code: true } },
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { name: 'asc' }
    });

    // Add lowStock flag
    const enriched = products.map(p => ({ ...p, isLowStock: p.quantity <= p.reorderLevel }));
    res.json({ success: true, data: enriched });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/products/:id', hasPermission('view_inventory'), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        warehouse: true, category: true, supplier: true,
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/products', hasPermission('manage_inventory'), async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    // Log stock movement
    if (req.body.quantity > 0) {
      await prisma.stockMovement.create({ data: { productId: product.id, type: 'IN', quantity: req.body.quantity, notes: 'Initial stock', unitCost: req.body.costPrice } });
    }
    res.status(201).json({ success: true, data: product });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/products/:id', hasPermission('update_inventory'), async (req, res) => {
  try {
    const old = await prisma.product.findUnique({ where: { id: req.params.id } });
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    // Log quantity adjustment
    if (req.body.quantity !== undefined && req.body.quantity !== old.quantity) {
      const diff = req.body.quantity - old.quantity;
      await prisma.stockMovement.create({ data: { productId: product.id, type: 'ADJUSTMENT', quantity: diff, notes: req.body.adjustmentNote || 'Manual adjustment' } });
    }
    res.json({ success: true, data: product });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/products/:id/adjust', hasPermission('update_inventory'), async (req, res) => {
  try {
    const { quantity, type, notes, unitCost } = req.body;
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    const newQty = type === 'IN' ? product.quantity + Number(quantity) : Math.max(0, product.quantity - Number(quantity));
    await Promise.all([
      prisma.product.update({ where: { id: req.params.id }, data: { quantity: newQty } }),
      prisma.stockMovement.create({ data: { productId: req.params.id, type, quantity: Number(quantity), notes, unitCost: unitCost ? Number(unitCost) : null } })
    ]);
    res.json({ success: true, data: { newQuantity: newQty } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── STOCK TRANSFERS ───────────────────────────────────────────────────────────
router.get('/transfers', hasPermission('view_inventory'), async (req, res) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      include: {
        fromWarehouse: { select: { name: true, code: true } },
        toWarehouse: { select: { name: true, code: true } },
        items: { include: { product: { select: { name: true, sku: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: transfers });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/transfers', hasPermission('update_inventory'), async (req, res) => {
  try {
    const count = await prisma.stockTransfer.count();
    const transferNumber = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const transfer = await prisma.stockTransfer.create({
      data: { ...req.body, transferNumber, requestedById: req.user.id, items: { create: req.body.items } },
      include: { fromWarehouse: true, toWarehouse: true, items: { include: { product: true } } }
    });
    // Notify inventory manager
    const mgrs = await prisma.user.findMany({ where: { role: 'INVENTORY_MANAGER', isActive: true } });
    for (const m of mgrs) {
      try {
        await prisma.notification.create({ data: { userId: m.id, title: 'Stock Transfer Request', message: `New transfer ${transferNumber} from ${transfer.fromWarehouse.name} to ${transfer.toWarehouse.name}`, type: 'INFO' } });
      } catch {}
    }
    res.status(201).json({ success: true, data: transfer });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/transfers/:id/approve', hasPermission('approve_transfers'), async (req, res) => {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
    const status = req.body.status;
    await prisma.stockTransfer.update({ where: { id: req.params.id }, data: { status, approvedById: req.user.id, completedAt: status === 'APPROVED' ? new Date() : null } });
    // If approved, move stock
    if (status === 'APPROVED') {
      for (const item of transfer.items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (product) {
          await prisma.product.update({ where: { id: item.productId }, data: { quantity: Math.max(0, product.quantity - item.quantity) } });
          await prisma.stockMovement.create({ data: { productId: item.productId, type: 'TRANSFER', quantity: item.quantity, reference: transfer.transferNumber, notes: `Transfer to ${transfer.toWarehouseId}` } });
        }
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── SUPPLIERS ─────────────────────────────────────────────────────────────────
router.get('/suppliers', hasPermission('view_inventory'), async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true, purchaseOrders: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: suppliers });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/suppliers', hasPermission('manage_inventory'), async (req, res) => {
  try {
    const s = await prisma.supplier.create({ data: req.body });
    res.status(201).json({ success: true, data: s });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/suppliers/:id', hasPermission('manage_inventory'), async (req, res) => {
  try {
    const s = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: s });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────
router.get('/purchase-orders', hasPermission('view_inventory'), async (req, res) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: pos });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/purchase-orders', hasPermission('manage_inventory'), async (req, res) => {
  try {
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const { items = [], ...data } = req.body;
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitCost)), 0);
    const po = await prisma.purchaseOrder.create({
      data: { ...data, poNumber, subtotal, total: subtotal, createdById: req.user.id, items: { create: items.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unitCost) })) } },
      include: { supplier: true, warehouse: true, items: { include: { product: true } } }
    });
    res.status(201).json({ success: true, data: po });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/purchase-orders/:id', hasPermission('manage_inventory'), async (req, res) => {
  try {
    const po = await prisma.purchaseOrder.update({ where: { id: req.params.id }, data: req.body });
    // If received, update stock
    if (req.body.status === 'RECEIVED') {
      const fullPO = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
      for (const item of fullPO.items) {
        const p = await prisma.product.findUnique({ where: { id: item.productId } });
        if (p) {
          await prisma.product.update({ where: { id: item.productId }, data: { quantity: p.quantity + item.quantity } });
          await prisma.stockMovement.create({ data: { productId: item.productId, type: 'IN', quantity: item.quantity, reference: fullPO.poNumber, unitCost: item.unitCost } });
        }
      }
    }
    res.json({ success: true, data: po });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── STOCK MOVEMENTS ───────────────────────────────────────────────────────────
router.get('/movements', hasPermission('view_inventory'), async (req, res) => {
  try {
    const { productId } = req.query;
    const movements = await prisma.stockMovement.findMany({
      where: productId ? { productId } : {},
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json({ success: true, data: movements });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
router.get('/stats', hasPermission('view_inventory'), async (req, res) => {
  try {
    const [total, lowStock, warehouses, suppliers, totalValue] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.warehouse.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.product.aggregate({ _sum: { unitPrice: true } }),
    ]);
    // Low stock calculation
    const allProducts = await prisma.product.findMany({ where: { isActive: true }, select: { quantity: true, reorderLevel: true } });
    const lowStockCount = allProducts.filter(p => p.quantity <= p.reorderLevel).length;
    res.json({ success: true, data: { total, lowStock: lowStockCount, warehouses, suppliers, totalValue: totalValue._sum.unitPrice || 0 } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
