import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, Input, Button } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) { toast.error('All fields required'); return; }
    try {
      await login(form.identifier, form.password);
      toast.success('Welcome back!');
      navigate('/vault');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="page-wrapper">
      <Card className="fade-up">
        <div style={{ fontSize:52, textAlign:'center', marginBottom:20 }}>🔒</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, marginBottom:6, textAlign:'center' }}>Welcome Back</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginBottom:32, lineHeight:1.6, textAlign:'center' }}>Enter your credentials to access your secure vault.</p>

        <form onSubmit={handleSubmit}>
          <Input label="Username or Email" placeholder="username or email" value={form.identifier} onChange={set('identifier')} />
          <Input label="Password" type="password" placeholder="Your password" value={form.password} onChange={set('password')} />
          <Button type="submit" variant="primary" full loading={loading} style={{ marginTop:8 }}>
            Unlock Vault 🔓
          </Button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text2)' }}>
          No account?{' '}
          <span style={{ color:'var(--accent)', cursor:'pointer' }} onClick={() => navigate('/signup')}>Create one free</span>
        </p>
      </Card>
    </div>
  );
}
