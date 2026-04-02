import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getProducts, createProduct, updateProduct, adjustStock,
  getCategories, createCategory,
  getSuppliers, createSupplier, updateSupplier,
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder,
  getTransfers, createTransfer, approveTransfer,
  getStockMovements, getInventoryStats
} from '../../api/client';
import { Modal, Badge, Tabs, SearchBar, EmptyState, Loading, fmtCurrency, fmtDate, PageHeader, Card, Field, Input, Select, Textarea } from '../../components/ui';
import { Package, Warehouse, Truck, TrendingDown, AlertTriangle, Plus, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Inventory() {
  const { user, hasPermission } = useAuth();
  const [tab, setTab] = useState('products');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [movements, setMovements] = useState([]);

  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [form, setForm] = useState({});
  const [editItem, setEditItem] = useState(null);
  const [lineItems, setLineItems] = useState([{ productId: '', quantity: 1, unitCost: 0, total: 0 }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, wh, pr, cat, sup, po, tr] = await Promise.all([
        getInventoryStats(), getWarehouses(), getProducts(), getCategories(),
        getSuppliers(), getPurchaseOrders(), getTransfers()
      ]);
      setStats(s.data.data); setWarehouses(wh.data.data); setProducts(pr.data.data);
      setCategories(cat.data.data); setSuppliers(sup.data.data);
      setPurchaseOrders(po.data.data); setTransfers(tr.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'movements') getStockMovements().then(r => setMovements(r.data.data)).catch(() => {});
  }, [tab]);

  const openModal = (type, item = null) => {
    setShowModal(type);
    setEditItem(item);
    setForm(item ? { ...item, categoryId: item.categoryId || '', supplierId: item.supplierId || '' } : { warehouseId: warehouses[0]?.id || '', valuationMethod: 'FIFO', unit: 'piece' });
    if (type === 'po') setLineItems([{ productId: '', quantity: 1, unitCost: 0, total: 0 }]);
    if (type === 'transfer') setLineItems([{ productId: '', quantity: 1 }]);
  };

  const closeModal = () => { setShowModal(null); setEditItem(null); setForm({}); setLineItems([{ productId: '', quantity: 1, unitCost: 0, total: 0 }]); };

  const updatePoItem = (i, field, val) => {
    const items = [...lineItems];
    items[i] = { ...items[i], [field]: val };
    items[i].total = Number(items[i].quantity || 0) * Number(items[i].unitCost || 0);
    setLineItems(items);
  };

  // ── WAREHOUSE ACTIONS ────────────────────────────────────────────────────────
  const handleWarehouse = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await updateWarehouse(editItem.id, form); toast.success('Warehouse updated'); }
      else { await createWarehouse(form); toast.success('Warehouse created'); }
      closeModal(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDeleteWarehouse = async (id) => {
    if (!window.confirm('Delete this warehouse? Only possible if no products are assigned.')) return;
    try { await deleteWarehouse(id); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Cannot delete — products assigned'); }
  };

  // ── PRODUCT ACTIONS ──────────────────────────────────────────────────────────
  const handleProduct = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, quantity: Number(form.quantity || 0), reorderLevel: Number(form.reorderLevel || 10), reorderQuantity: Number(form.reorderQuantity || 50), unitPrice: Number(form.unitPrice), costPrice: form.costPrice ? Number(form.costPrice) : undefined };
      if (editItem) { await updateProduct(editItem.id, data); toast.success('Product updated'); }
      else { await createProduct(data); toast.success('Product added'); }
      closeModal(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      await adjustStock(editItem.id, { type: form.adjustType, quantity: Number(form.adjustQty), notes: form.adjustNotes });
      toast.success('Stock adjusted'); closeModal(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ── SUPPLIER ACTIONS ─────────────────────────────────────────────────────────
  const handleSupplier = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await updateSupplier(editItem.id, form); toast.success('Supplier updated'); }
      else { await createSupplier(form); toast.success('Supplier created'); }
      closeModal(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ── PO ACTIONS ───────────────────────────────────────────────────────────────
  const handlePO = async (e) => {
    e.preventDefault();
    try {
      await createPurchaseOrder({ ...form, items: lineItems.map(i => ({ ...i, quantity: Number(i.quantity), unitCost: Number(i.unitCost), total: Number(i.quantity) * Number(i.unitCost) })) });
      toast.success('Purchase order created'); closeModal(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handlePOStatus = async (id, status) => {
    try { await updatePurchaseOrder(id, { status }); toast.success(`PO marked as ${status}`); load(); }
    catch { toast.error('Failed'); }
  };

  // ── TRANSFER ACTIONS ─────────────────────────────────────────────────────────
  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await createTransfer({ ...form, items: lineItems.map(i => ({ productId: i.productId, quantity: Number(i.quantity) })) });
      toast.success('Transfer request submitted'); closeModal(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleApproveTransfer = async (id, status) => {
    try { await approveTransfer(id, { status }); toast.success(status === 'APPROVED' ? 'Transfer approved — stock moved' : 'Transfer rejected'); load(); }
    catch { toast.error('Failed'); }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchWH = !warehouseFilter || p.warehouseId === warehouseFilter;
    return matchSearch && matchWH;
  });

  const TABS = [
    { id: 'products', label: 'Products', count: stats.total },
    { id: 'warehouses', label: 'Warehouses', count: stats.warehouses },
    { id: 'suppliers', label: 'Suppliers', count: stats.suppliers },
    { id: 'purchase-orders', label: 'Purchase Orders', count: purchaseOrders.filter(p => p.status === 'DRAFT').length },
    { id: 'transfers', label: 'Stock Transfers', count: transfers.filter(t => t.status === 'PENDING').length },
    { id: 'movements', label: 'Stock History' },
  ];

  return (
    <div className="page fade-in">
      <PageHeader title="Inventory" subtitle="Warehouses, products, suppliers, and stock management">
        <button className="btn btn-outline btn-sm" onClick={() => openModal('transfer')}><ArrowRightLeft size={13} /> Transfer Stock</button>
        {hasPermission('manage_inventory') && <button className="btn btn-primary btn-sm" onClick={() => openModal('product')}><Plus size={13} /> Add Product</button>}
      </PageHeader>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background: '#F5F3FF' }}><Package size={20} color="#7C3AED" /></div><div className="stat-label">Total Products</div><div className="stat-value" style={{ color: '#7C3AED' }}>{stats.total || 0}</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#FEF2F2' }}><AlertTriangle size={20} color="#DC2626" /></div><div className="stat-label">Low Stock</div><div className="stat-value" style={{ color: '#DC2626' }}>{stats.lowStock || 0}</div><div className="stat-change">Need reorder</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#EFF6FF' }}><Warehouse size={20} color="#3B82F6" /></div><div className="stat-label">Warehouses</div><div className="stat-value" style={{ color: '#3B82F6' }}>{stats.warehouses || 0}</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#FFFBEB' }}><Truck size={20} color="#D97706" /></div><div className="stat-label">Suppliers</div><div className="stat-value" style={{ color: '#D97706' }}>{stats.suppliers || 0}</div></div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── PRODUCTS ──────────────────────────────────────────────────────────── */}
      {tab === 'products' && (
        <Card title={`Products (${filteredProducts.length})`} actions={
          <>
            <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
            <select className="form-control" style={{ width: 180 }} value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {hasPermission('manage_inventory') && <button className="btn btn-primary btn-sm" onClick={() => openModal('product')}><Plus size={13} /> Add Product</button>}
          </>
        }>
          {loading ? <Loading /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Warehouse</th><th>Qty</th><th>Reorder At</th><th>Unit Price</th><th>Cost Price</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredProducts.length === 0 && <tr><td colSpan={10}><EmptyState icon="📦" title="No products found" /></td></tr>}
                  {filteredProducts.map(p => (
                    <tr key={p.id}>
                      <td className="font-mono" style={{ fontSize: 12 }}>{p.sku}</td>
                      <td><div style={{ fontWeight: 600 }}>{p.name}</div>{p.barcode && <div style={{ fontSize: 11, color: 'var(--text3)' }}>#{p.barcode}</div>}</td>
                      <td style={{ fontSize: 12 }}>{p.category?.name || '—'}</td>
                      <td style={{ fontSize: 12 }}>{p.warehouse?.name}</td>
                      <td><span style={{ fontWeight: 700, color: p.isLowStock ? 'var(--danger)' : 'var(--text)' }}>{p.quantity}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{p.reorderLevel}</td>
                      <td style={{ fontWeight: 600 }}>{fmtCurrency(p.unitPrice)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{p.costPrice ? fmtCurrency(p.costPrice) : '—'}</td>
                      <td><Badge status={p.isLowStock ? 'OVERDUE' : 'ACTIVE'} label={p.isLowStock ? 'Low Stock' : 'In Stock'} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openModal('product', p)}>Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(p); setShowModal('adjust'); setForm({ adjustType: 'IN', adjustQty: '', adjustNotes: '' }); }}>Adjust</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── WAREHOUSES ────────────────────────────────────────────────────────── */}
      {tab === 'warehouses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            {hasPermission('manage_inventory') && <button className="btn btn-primary btn-sm" onClick={() => openModal('warehouse')}><Plus size={13} /> Add Warehouse</button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {warehouses.map(wh => (
              <div key={wh.id} className="card">
                <div className="card-header" style={{ borderLeft: `4px solid ${wh.isPrimary ? 'var(--primary)' : 'var(--accent)'}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{wh.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{wh.code}</div>
                  </div>
                  {wh.isPrimary && <span className="badge badge-primary">Primary</span>}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>📍 {wh.location}</div>
                  {wh.address && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{wh.address}, {wh.city}, {wh.state}</div>}
                  {wh.phone && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>📞 {wh.phone}</div>}
                  {wh.email && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>✉️ {wh.email}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ background: 'var(--surface2)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {wh._count?.products || 0} products
                    </div>
                    <Badge status={wh.isActive ? 'ACTIVE' : 'VOID'} label={wh.isActive ? 'Active' : 'Inactive'} />
                  </div>
                  {hasPermission('manage_inventory') && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openModal('warehouse', wh)}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteWarehouse(wh.id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {warehouses.length === 0 && <EmptyState icon="🏭" title="No warehouses yet" sub="Create your first warehouse location" />}
          </div>
        </div>
      )}

      {/* ── SUPPLIERS ─────────────────────────────────────────────────────────── */}
      {tab === 'suppliers' && (
        <Card title={`Suppliers (${suppliers.length})`} actions={
          hasPermission('manage_inventory') && <button className="btn btn-primary btn-sm" onClick={() => openModal('supplier')}><Plus size={13} /> Add Supplier</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Payment Terms</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {suppliers.length === 0 && <tr><td colSpan={8}><EmptyState icon="🏢" title="No suppliers yet" /></td></tr>}
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontSize: 12 }}>{s.email || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.phone || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.city || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.paymentTerms || '—'}</td>
                    <td>{s._count?.products || 0}</td>
                    <td><Badge status={s.isActive ? 'ACTIVE' : 'VOID'} label={s.isActive ? 'Active' : 'Inactive'} /></td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openModal('supplier', s)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── PURCHASE ORDERS ───────────────────────────────────────────────────── */}
      {tab === 'purchase-orders' && (
        <Card title="Purchase Orders" actions={
          hasPermission('manage_inventory') && <button className="btn btn-primary btn-sm" onClick={() => openModal('po')}><Plus size={13} /> New PO</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PO Number</th><th>Supplier</th><th>Warehouse</th><th>Total</th><th>Status</th><th>Expected Date</th><th>Actions</th></tr></thead>
              <tbody>
                {purchaseOrders.length === 0 && <tr><td colSpan={7}><EmptyState icon="📋" title="No purchase orders" /></td></tr>}
                {purchaseOrders.map(po => (
                  <tr key={po.id}>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{po.poNumber}</td>
                    <td>{po.supplier?.name}</td>
                    <td style={{ fontSize: 12 }}>{po.warehouse?.name}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(po.total)}</td>
                    <td><Badge status={po.status === 'RECEIVED' ? 'ACTIVE' : po.status === 'CANCELLED' ? 'VOID' : 'PENDING'} label={po.status.replace('_',' ')} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(po.expectedDate)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {po.status === 'DRAFT' && <button className="btn btn-primary btn-sm" onClick={() => handlePOStatus(po.id, 'SENT')}>Send to Supplier</button>}
                        {po.status === 'SENT' && <button className="btn btn-primary btn-sm" onClick={() => handlePOStatus(po.id, 'RECEIVED')}>Mark Received</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TRANSFERS ─────────────────────────────────────────────────────────── */}
      {tab === 'transfers' && (
        <Card title="Stock Transfers" actions={
          <button className="btn btn-primary btn-sm" onClick={() => openModal('transfer')}><Plus size={13} /> New Transfer</button>
        }>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Transfer #</th><th>From</th><th>To</th><th>Items</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
              <tbody>
                {transfers.length === 0 && <tr><td colSpan={7}><EmptyState icon="🔄" title="No transfers" /></td></tr>}
                {transfers.map(t => (
                  <tr key={t.id}>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{t.transferNumber}</td>
                    <td style={{ fontSize: 12 }}>{t.fromWarehouse?.name}</td>
                    <td style={{ fontSize: 12 }}>{t.toWarehouse?.name}</td>
                    <td>{t.items?.length || 0} items</td>
                    <td><Badge status={t.status === 'APPROVED' ? 'ACTIVE' : t.status === 'REJECTED' ? 'VOID' : 'PENDING'} label={t.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(t.createdAt)}</td>
                    <td>
                      {t.status === 'PENDING' && hasPermission('approve_transfers') && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff' }} onClick={() => handleApproveTransfer(t.id, 'APPROVED')}>Approve</button>
                          <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleApproveTransfer(t.id, 'REJECTED')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MOVEMENTS ─────────────────────────────────────────────────────────── */}
      {tab === 'movements' && (
        <Card title="Stock Movement History">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Quantity</th><th>Reference</th><th>Notes</th></tr></thead>
              <tbody>
                {movements.length === 0 && <tr><td colSpan={6}><EmptyState icon="📊" title="No stock movements yet" /></td></tr>}
                {movements.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(m.createdAt)}</td>
                    <td><div style={{ fontWeight: 600 }}>{m.product?.name}</div><div className="font-mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{m.product?.sku}</div></td>
                    <td><Badge status={m.type === 'IN' ? 'ACTIVE' : m.type === 'OUT' ? 'OVERDUE' : 'PENDING'} label={m.type} /></td>
                    <td style={{ fontWeight: 700, color: m.type === 'IN' ? 'var(--success)' : m.type === 'OUT' ? 'var(--danger)' : 'var(--text)' }}>{m.type === 'IN' ? '+' : m.type === 'OUT' ? '-' : ''}{m.quantity}</td>
                    <td className="font-mono" style={{ fontSize: 12 }}>{m.reference || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══ MODALS ════════════════════════════════════════════════════════════════ */}

      {/* Warehouse */}
      {showModal === 'warehouse' && (
        <Modal title={editItem ? 'Edit Warehouse' : 'Add Warehouse'} onClose={closeModal} size="lg">
          <form onSubmit={handleWarehouse}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Warehouse Name" required><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Code" required hint="Auto-generated if left blank"><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. WH-004" /></Field>
                <Field label="Location / City" required><Input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} required /></Field>
                <Field label="State"><Input value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} /></Field>
                <Field label="Address"><Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
                <Field label="Country"><Input value={form.country || 'Nigeria'} onChange={e => setForm({ ...form, country: e.target.value })} /></Field>
                <Field label="Phone"><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.isPrimary || false} onChange={e => setForm({ ...form, isPrimary: e.target.checked })} />
                  Set as Primary Warehouse
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.isActive !== false} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  Active
                </label>
              </div>
              <Field label="Notes" style={{ marginTop: 12 }}><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'} Warehouse</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Product */}
      {showModal === 'product' && (
        <Modal title={editItem ? 'Edit Product' : 'Add Product'} onClose={closeModal} size="lg">
          <form onSubmit={handleProduct}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Product Name" required><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="SKU" required><Input value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })} required /></Field>
                <Field label="Category"><Select value={form.categoryId || ''} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                <Field label="Warehouse" required><Select value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })} required>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
                <Field label="Quantity"><Input type="number" value={form.quantity || 0} onChange={e => setForm({ ...form, quantity: e.target.value })} min="0" /></Field>
                <Field label="Reorder Level"><Input type="number" value={form.reorderLevel || 10} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
                <Field label="Unit Price (₦)" required><Input type="number" value={form.unitPrice || ''} onChange={e => setForm({ ...form, unitPrice: e.target.value })} required min="0" /></Field>
                <Field label="Cost Price (₦)"><Input type="number" value={form.costPrice || ''} onChange={e => setForm({ ...form, costPrice: e.target.value })} min="0" /></Field>
                <Field label="Unit of Measure"><Select value={form.unit || 'piece'} onChange={e => setForm({ ...form, unit: e.target.value })}>{['piece','box','carton','kg','litre','metre','set','pair'].map(u => <option key={u}>{u}</option>)}</Select></Field>
                <Field label="Valuation Method"><Select value={form.valuationMethod || 'FIFO'} onChange={e => setForm({ ...form, valuationMethod: e.target.value })}>{['FIFO','LIFO','AVERAGE'].map(m => <option key={m}>{m}</option>)}</Select></Field>
                <Field label="Supplier"><Select value={form.supplierId || ''} onChange={e => setForm({ ...form, supplierId: e.target.value })}><option value="">Select supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                <Field label="Barcode"><Input value={form.barcode || ''} onChange={e => setForm({ ...form, barcode: e.target.value })} /></Field>
              </div>
              <Field label="Description"><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add'} Product</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Stock */}
      {showModal === 'adjust' && editItem && (
        <Modal title={`Adjust Stock — ${editItem.name}`} onClose={closeModal}>
          <form onSubmit={handleAdjustStock}>
            <div className="modal-body">
              <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Current Stock</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{editItem.quantity} {editItem.unit || 'pieces'}</div>
              </div>
              <div className="grid-2">
                <Field label="Adjustment Type"><Select value={form.adjustType || 'IN'} onChange={e => setForm({ ...form, adjustType: e.target.value })}><option value="IN">Stock In (+)</option><option value="OUT">Stock Out (-)</option><option value="ADJUSTMENT">Adjustment</option></Select></Field>
                <Field label="Quantity" required><Input type="number" value={form.adjustQty || ''} onChange={e => setForm({ ...form, adjustQty: e.target.value })} required min="1" /></Field>
              </div>
              <Field label="Reason / Notes"><Textarea value={form.adjustNotes || ''} onChange={e => setForm({ ...form, adjustNotes: e.target.value })} placeholder="Reason for adjustment..." /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">Apply Adjustment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Supplier */}
      {showModal === 'supplier' && (
        <Modal title={editItem ? 'Edit Supplier' : 'Add Supplier'} onClose={closeModal}>
          <form onSubmit={handleSupplier}>
            <div className="modal-body">
              <Field label="Supplier Name" required><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></Field>
              <div className="grid-2">
                <Field label="Email"><Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="City"><Input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
                <Field label="Payment Terms"><Input value={form.paymentTerms || ''} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} placeholder="e.g. Net 30" /></Field>
                <Field label="Tax Number"><Input value={form.taxNumber || ''} onChange={e => setForm({ ...form, taxNumber: e.target.value })} /></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add'} Supplier</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Purchase Order */}
      {showModal === 'po' && (
        <Modal title="Create Purchase Order" onClose={closeModal} size="lg">
          <form onSubmit={handlePO}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="Supplier" required><Select value={form.supplierId || ''} onChange={e => setForm({ ...form, supplierId: e.target.value })} required><option value="">Select supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                <Field label="Deliver to Warehouse" required><Select value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })} required><option value="">Select warehouse</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
                <Field label="Expected Delivery Date"><Input type="date" value={form.expectedDate || ''} onChange={e => setForm({ ...form, expectedDate: e.target.value })} /></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Order Items</div>
                {lineItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 2 }}>
                      {i === 0 && <label className="form-label">Product</label>}
                      <Select value={item.productId || ''} onChange={e => { const items = [...lineItems]; items[i] = { ...items[i], productId: e.target.value }; const prod = products.find(p => p.id === e.target.value); if (prod) { items[i].unitCost = prod.costPrice || prod.unitPrice; items[i].total = Number(items[i].quantity) * items[i].unitCost; } setLineItems(items); }}>
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </Select>
                    </div>
                    <div style={{ width: 80 }}>
                      {i === 0 && <label className="form-label">Qty</label>}
                      <Input type="number" value={item.quantity} onChange={e => updatePoItem(i, 'quantity', e.target.value)} min="1" />
                    </div>
                    <div style={{ width: 130 }}>
                      {i === 0 && <label className="form-label">Unit Cost (₦)</label>}
                      <Input type="number" value={item.unitCost} onChange={e => updatePoItem(i, 'unitCost', e.target.value)} min="0" />
                    </div>
                    <div style={{ width: 110, textAlign: 'right', fontWeight: 600, paddingBottom: 4 }}>{fmtCurrency(item.total)}</div>
                    <button type="button" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', paddingBottom: 4 }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => setLineItems([...lineItems, { productId: '', quantity: 1, unitCost: 0, total: 0 }])} className="btn btn-outline btn-sm">+ Add Item</button>
                <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 800, fontSize: 15 }}>
                  Total: {fmtCurrency(lineItems.reduce((s, i) => s + i.total, 0))}
                </div>
              </div>
              <Field label="Notes"><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Purchase Order</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer */}
      {showModal === 'transfer' && (
        <Modal title="Request Stock Transfer" onClose={closeModal}>
          <form onSubmit={handleTransfer}>
            <div className="modal-body">
              <div className="grid-2">
                <Field label="From Warehouse" required><Select value={form.fromWarehouseId || ''} onChange={e => setForm({ ...form, fromWarehouseId: e.target.value })} required><option value="">Select source</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
                <Field label="To Warehouse" required><Select value={form.toWarehouseId || ''} onChange={e => setForm({ ...form, toWarehouseId: e.target.value })} required><option value="">Select destination</option>{warehouses.filter(w => w.id !== form.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
              </div>
              <div style={{ marginTop: 8 }}>
                {lineItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 2 }}>
                      {i === 0 && <label className="form-label">Product</label>}
                      <Select value={item.productId} onChange={e => { const items = [...lineItems]; items[i].productId = e.target.value; setLineItems(items); }}>
                        <option value="">Select product</option>
                        {products.filter(p => !form.fromWarehouseId || p.warehouseId === form.fromWarehouseId).map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>)}
                      </Select>
                    </div>
                    <div style={{ width: 100 }}>
                      {i === 0 && <label className="form-label">Quantity</label>}
                      <Input type="number" value={item.quantity} onChange={e => { const items = [...lineItems]; items[i].quantity = e.target.value; setLineItems(items); }} min="1" />
                    </div>
                    <button type="button" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', paddingBottom: 4 }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => setLineItems([...lineItems, { productId: '', quantity: 1 }])} className="btn btn-outline btn-sm">+ Add Product</button>
              </div>
              <Field label="Notes" style={{ marginTop: 12 }}><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Transfer Request</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
