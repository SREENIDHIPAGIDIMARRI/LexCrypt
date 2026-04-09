import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, Input, Button, Alert, PasswordStrength } from '../components/ui';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loading } = useAuth();
  const [form, setForm] = useState({ firstName:'', lastName:'', username:'', email:'', password:'', confirm:'' });
  const [errors, setErrors] = useState({});

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    if (!form.username.trim() || form.username.length < 3) e.username = 'Min 3 characters';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await signup({ firstName: form.firstName, lastName: form.lastName, username: form.username, email: form.email, password: form.password });
      toast.success('Account created! Setting up your vault...');
      navigate('/vault');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="page-wrapper">
      <Card className="fade-up" style={{ maxWidth: 520 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, marginBottom:6 }}>Create Account</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginBottom:32, lineHeight:1.6 }}>Join LexCrypt and secure your data with next-gen cryptography.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="First Name" placeholder="Lex" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
            <Input label="Last Name" placeholder="Crypt" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
          </div>
          <Input label="Username" placeholder="lexuser" value={form.username} onChange={set('username')} error={errors.username} />
          <Input label="Email Address" type="email" placeholder="you@lexcrypt.io" value={form.email} onChange={set('email')} error={errors.email} />
          <div style={{ marginBottom: 18 }}>
            <Input label="Password" type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} error={errors.password} />
            <PasswordStrength password={form.password} />
          </div>
          <Input label="Confirm Password" type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />

          <Button type="submit" variant="primary" full loading={loading} style={{ marginTop:8 }}>
            Create Account →
          </Button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text2)' }}>
          Already have an account?{' '}
          <span style={{ color:'var(--accent)', cursor:'pointer' }} onClick={() => navigate('/login')}>Sign In</span>
        </p>
      </Card>
    </div>
  );
}
