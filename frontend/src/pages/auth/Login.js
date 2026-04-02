import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const quickLogin = (role) => {
    const map = { admin: 'admin@omoibo.com', ceo: 'ceo@omoibo.com', sales: 'salesmanager@omoibo.com', finance: 'financemanager@omoibo.com' };
    setEmail(map[role]); setPassword('Admin@1234');
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
          <div className="login-title">Omoibo Global CRM</div>
          <div className="login-subtitle">Sign in to your account</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yourname@omoibo.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Demo Login</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['admin', 'ceo', 'sales', 'finance'].map(r => (
              <button key={r} onClick={() => quickLogin(r)} className="btn btn-outline btn-sm" style={{ textTransform: 'capitalize' }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20, padding: '12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
          All demo accounts: <strong>Admin@1234</strong>
        </div>
      </div>
    </div>
  );
}
