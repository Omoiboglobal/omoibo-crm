import React, { useState, useEffect } from 'react';
import { getExecutiveDashboard } from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fmt = (n) => n >= 1000000 ? `₦${(n/1000000).toFixed(1)}M` : n >= 1000 ? `₦${(n/1000).toFixed(0)}K` : `₦${Math.round(n||0)}`;

export default function Executive() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExecutiveDashboard().then(r => { setData(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading executive dashboard...</div></div>;
  if (!data) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No data available</div></div>;

  const financeChart = [
    { name: 'Revenue', value: data.finance?.totalRevenue || 0, color: '#1A7A4A' },
    { name: 'Expenses', value: data.finance?.totalExpenses || 0, color: '#C0392B' },
    { name: 'Net Profit', value: Math.max(0, (data.finance?.netProfit || 0)), color: '#1B3A6B' },
  ];

  const salesChart = [
    { name: 'Total Leads', value: data.sales?.totalLeads || 0 },
    { name: 'Total Deals', value: data.sales?.totalDeals || 0 },
    { name: 'Won', value: data.sales?.closedWon || 0 },
  ];

  const pieData = [
    { name: 'Delivered', value: data.logistics?.delivered || 0, color: '#1A7A4A' },
    { name: 'Pending/Transit', value: (data.logistics?.totalOrders || 0) - (data.logistics?.delivered || 0), color: '#D35400' },
  ];

  const kpis = [
    { label: 'Total Revenue', value: fmt(data.finance?.totalRevenue), sub: `${data.finance?.profitMargin}% margin`, color: '#1A7A4A', bg: '#D5F5E3' },
    { label: 'Net Profit', value: fmt(data.finance?.netProfit), sub: 'After all expenses', color: '#1B3A6B', bg: '#E8EFFE' },
    { label: 'Sales Conversion', value: `${data.sales?.conversionRate}%`, sub: `${data.sales?.closedWon} deals won`, color: '#2E86C1', bg: '#D6EAF8' },
    { label: 'Delivery Rate', value: `${data.logistics?.deliveryRate}%`, sub: `${data.logistics?.delivered} of ${data.logistics?.totalOrders} orders`, color: '#6C3483', bg: '#E8DAEF' },
    { label: 'Total Orders', value: data.logistics?.totalOrders, sub: 'All time', color: '#D35400', bg: '#FDEBD0' },
    { label: 'Active Staff', value: data.hr?.activeStaff, sub: 'Across all departments', color: '#B7770D', bg: '#FEF3C7' },
    { label: 'Total Products', value: data.inventory?.totalProducts, sub: 'In inventory', color: '#C0392B', bg: '#FADBD8' },
    { label: 'Asset Value', value: fmt(data.facility?.totalAssetValue), sub: 'Company assets', color: '#1B3A6B', bg: '#E8EFFE' },
  ];

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Executive Dashboard</h1>
        <p className="page-subtitle">Company-wide KPIs and performance overview · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="stat-grid">
        {kpis.map((k, i) => (
          <div key={i} className="stat-card" style={{ borderLeft: `4px solid ${k.color}` }}>
            <div className="stat-label">{k.label}</div>
            <div className="stat-value" style={{ fontSize: 20, color: k.color }}>{k.value}</div>
            <div className="stat-change">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mt-6">
        <div className="card">
          <div className="card-header"><span className="card-title">Financial Overview (₦)</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={financeChart}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {financeChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Sales Funnel</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesChart} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#2E86C1" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2 mt-4">
        <div className="card">
          <div className="card-header"><span className="card-title">Order Delivery Status</span></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div>
              {pieData.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.color }} />
                  <span style={{ fontSize: 13 }}>{e.name}: <strong>{e.value}</strong></span>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 20, fontWeight: 800, color: '#1A7A4A' }}>{data.logistics?.deliveryRate}%</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Delivery success rate</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Company Snapshot</span></div>
          <div className="card-body">
            {[
              { label: 'Total Leads in Pipeline', value: data.sales?.totalLeads },
              { label: 'Active Deals', value: data.sales?.totalDeals },
              { label: 'Total Orders Processed', value: data.logistics?.totalOrders },
              { label: 'Staff Headcount', value: data.hr?.activeStaff },
              { label: 'Products in Stock', value: data.inventory?.totalProducts },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>{r.label}</span>
                <strong style={{ color: 'var(--primary)' }}>{r.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
