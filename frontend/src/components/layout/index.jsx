import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* ── Animated matrix canvas background ── */
export function MatrixCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx    = canvas.getContext('2d');
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    class Particle {
      constructor() { this.reset(); this.y = Math.random() * canvas.height; }
      reset() {
        this.x = Math.random() * canvas.width; this.y = -10;
        this.speed = .2 + Math.random() * .6;
        this.size  = Math.random() < .3 ? 1.5 : .8;
        this.opacity = Math.random() * .6 + .2;
        this.char  = '01ABCDEFabcdef'[Math.floor(Math.random() * 14)];
        this.color = Math.random() < .5 ? '#00d4ff' : '#7b5ea7';
      }
      update() { this.y += this.speed; if (this.y > canvas.height) this.reset(); }
      draw()   { ctx.globalAlpha = this.opacity; ctx.fillStyle = this.color; ctx.font = `${this.size * 10}px 'Space Mono'`; ctx.fillText(this.char, this.x, this.y); }
    }
    for (let i = 0; i < 120; i++) particles.push(new Particle());
    let raf;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} id="bg-canvas" style={{ position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:0,opacity:.35,pointerEvents:'none' }} />;
}

/* ── Navbar ── */
export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = user ? [
    { label: '🔐 Vault',       path: '/vault' },
    { label: '✍️ Signatures',  path: '/signatures' },
    { label: '📁 Files',       path: '/upload' },
    { label: '🔑 Encrypt',     path: '/crypto' },
  ] : [];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 40px',
      background: 'rgba(8,11,20,0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Logo */}
      <div onClick={() => navigate('/')} style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, background:'linear-gradient(135deg,var(--accent),var(--accent2))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:2, cursor:'pointer' }}>
        Lex<span style={{ color:'var(--accent3)', WebkitTextFillColor:'var(--accent3)' }}>Crypt</span>
      </div>

      {/* Nav links */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
        {navItems.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)} style={{
            padding:'8px 16px', border:'1px solid', borderColor: location.pathname === item.path ? 'var(--accent)' : 'var(--border2)',
            background: location.pathname === item.path ? 'rgba(0,212,255,.07)' : 'transparent',
            color: location.pathname === item.path ? 'var(--accent)' : 'var(--text2)',
            borderRadius:8, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13, transition:'all .2s',
          }}>
            {item.label}
          </button>
        ))}

        {user ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:'rgba(0,212,255,.06)', border:'1px solid var(--border2)', borderRadius:20, fontSize:13, color:'var(--text2)' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent3)', boxShadow:'0 0 8px var(--accent3)' }} />
              {user.username}
            </div>
            <button onClick={() => { logout(); navigate('/'); }} style={{ padding:'8px 16px', border:'1px solid var(--border2)', background:'transparent', color:'var(--text2)', borderRadius:8, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13, transition:'all .2s' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/signup')} style={{ padding:'8px 18px', border:'1px solid var(--border2)', background:'transparent', color:'var(--text2)', borderRadius:8, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13, transition:'all .2s' }}>Sign Up</button>
            <button onClick={() => navigate('/login')} style={{ padding:'8px 18px', border:'1px solid var(--accent)', background:'rgba(0,212,255,.07)', color:'var(--accent)', borderRadius:8, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:13 }}>Log In</button>
          </>
        )}
      </div>
    </nav>
  );
}

/* ── Protected Route wrapper ── */
export function ProtectedRoute({ children }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!user && !token) navigate('/login'); }, [user, token]);
  if (!user && !token) return null;
  return children;
}
