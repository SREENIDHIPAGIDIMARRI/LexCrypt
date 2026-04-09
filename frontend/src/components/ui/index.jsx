import React from 'react';
import { passwordStrength } from '../../utils/crypto';

/* ─── BUTTON ─── */
export function Button({ children, variant = 'primary', size = 'md', loading, full, style, ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: "'Outfit', sans-serif", fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 10, transition: 'all .2s', opacity: loading ? .7 : 1,
    width: full ? '100%' : 'auto',
  };
  const sizes = { sm: { padding: '8px 16px', fontSize: 13 }, md: { padding: '13px 24px', fontSize: 15 }, lg: { padding: '16px 32px', fontSize: 16 } };
  const variants = {
    primary: { background: 'linear-gradient(135deg,#0095b3,var(--accent))', color: '#000', boxShadow: '0 4px 20px rgba(0,212,255,.25)' },
    purple:  { background: 'linear-gradient(135deg,#5a3d8a,var(--accent2))', color: '#fff', boxShadow: '0 4px 20px rgba(123,94,167,.25)' },
    green:   { background: 'linear-gradient(135deg,#00b870,var(--accent3))', color: '#000', boxShadow: '0 4px 20px rgba(0,255,157,.2)' },
    danger:  { background: 'linear-gradient(135deg,#c4002e,var(--danger))', color: '#fff' },
    outline: { background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' },
    ghost:   { background: 'transparent', color: 'var(--text2)' },
  };
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }} disabled={loading} {...props}>
      {loading ? <Spinner size={16} /> : children}
    </button>
  );
}

/* ─── INPUT ─── */
export function Input({ label, error, mono, type = 'text', ...props }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>{label}</label>}
      <input
        type={type}
        style={{
          width: '100%', padding: '13px 16px',
          background: 'var(--bg2)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none',
          fontFamily: mono ? "'Space Mono', monospace" : "'Outfit', sans-serif",
          transition: 'border .2s, box-shadow .2s',
        }}
        onFocus={e => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--accent)'}
        onBlur={e  => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'}
        {...props}
      />
      {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>{error}</p>}
    </div>
  );
}

/* ─── TEXTAREA ─── */
export function Textarea({ label, mono, rows = 5, ...props }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>{label}</label>}
      <textarea
        rows={rows}
        style={{
          width: '100%', padding: '13px 16px', resize: 'vertical',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, color: 'var(--text)', fontSize: mono ? 11 : 14,
          fontFamily: mono ? "'Space Mono', monospace" : "'Outfit', sans-serif",
          outline: 'none', lineHeight: 1.7, transition: 'border .2s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e  => e.target.style.borderColor = 'var(--border)'}
        {...props}
      />
    </div>
  );
}

/* ─── CARD ─── */
export function Card({ children, wide, md, style, accent = 'cyan' }) {
  const accents = { cyan: 'var(--accent)', purple: 'var(--accent2)', green: 'var(--accent3)' };
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
      padding: '40px 44px', width: '100%',
      maxWidth: wide ? 920 : md ? 620 : 480,
      boxShadow: '0 20px 60px rgba(0,0,0,.5), var(--glow)',
      position: 'relative', overflow: 'hidden', ...style,
    }}>
      {/* top accent line */}
      <div style={{ position: 'absolute', top: -1, left: '20%', right: '20%', height: 2, background: `linear-gradient(90deg,transparent,${accents[accent]},transparent)` }} />
      {children}
    </div>
  );
}

/* ─── BADGE ─── */
export function Badge({ children, variant = 'cyan' }) {
  const styles = {
    cyan:   { background: 'rgba(0,212,255,.08)',    border: '1px solid rgba(0,212,255,.2)',    color: 'var(--accent)' },
    purple: { background: 'rgba(123,94,167,.1)',    border: '1px solid rgba(123,94,167,.3)',   color: 'var(--accent2)' },
    green:  { background: 'rgba(0,255,157,.08)',    border: '1px solid rgba(0,255,157,.2)',    color: 'var(--accent3)' },
    red:    { background: 'rgba(255,68,102,.1)',    border: '1px solid rgba(255,68,102,.3)',   color: 'var(--danger)' },
    warn:   { background: 'rgba(255,187,51,.1)',    border: '1px solid rgba(255,187,51,.3)',   color: 'var(--warn)' },
  };
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-block', ...styles[variant] }}>
      {children}
    </span>
  );
}

/* ─── ALERT ─── */
export function Alert({ children, type = 'error', style }) {
  const styles = {
    error:   { background: 'rgba(255,68,102,.1)',  border: '1px solid rgba(255,68,102,.3)',  color: '#ff8099' },
    success: { background: 'rgba(0,255,157,.1)',   border: '1px solid rgba(0,255,157,.3)',   color: 'var(--accent3)' },
    info:    { background: 'rgba(0,212,255,.07)',  border: '1px solid rgba(0,212,255,.2)',   color: 'var(--accent)' },
    warn:    { background: 'rgba(255,187,51,.1)',  border: '1px solid rgba(255,187,51,.3)',  color: 'var(--warn)' },
  };
  if (!children) return null;
  return <div style={{ padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16, ...styles[type], ...style }}>{children}</div>;
}

/* ─── SPINNER ─── */
export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '2px solid var(--border2)', borderTopColor: 'var(--accent)',
      animation: 'spin .6s linear infinite', flexShrink: 0,
    }} />
  );
}

/* ─── PASSWORD STRENGTH ─── */
export function PasswordStrength({ password }) {
  const s = passwordStrength(password);
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const barColor = (i) => {
    if (i > s) return 'var(--border)';
    if (s <= 1) return 'var(--danger)';
    if (s === 2) return 'var(--warn)';
    return 'var(--accent3)';
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: barColor(i), transition: 'background .3s' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{password ? labels[s] || '' : 'Enter a password'}</span>
    </div>
  );
}

/* ─── MONO TEXT BOX ─── */
export function MonoBox({ children, label, dotColor = 'var(--accent)', style }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', ...style }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
          {label}
        </div>
      )}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--accent3)', wordBreak: 'break-all', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
        {children || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Empty</span>}
      </div>
    </div>
  );
}

/* ─── STATUS BAR ─── */
export function StatusBar({ dot = 'green', children, right }) {
  const dots = { green: 'var(--accent3)', blue: 'var(--accent)', gray: 'var(--text3)', red: 'var(--danger)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dots[dot], boxShadow: `0 0 8px ${dots[dot]}`, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{children}</span>
      {right && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>{right}</span>}
    </div>
  );
}

/* ─── SECTION TITLE ─── */
export function SectionTitle({ title, sub, badges }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>{title}</h2>
      {sub && <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: badges ? 14 : 0 }}>{sub}</p>}
      {badges && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{badges}</div>}
    </div>
  );
}

/* ─── DIVIDER ─── */
export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0', color: 'var(--text3)', fontSize: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

/* ─── COPY BUTTON ─── */
export function CopyButton({ text, label = 'Copy', style }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} style={{ background: 'none', border: '1px solid var(--border)', color: copied ? 'var(--accent3)' : 'var(--text3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all .2s', marginTop: 8, ...style }}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  );
}
