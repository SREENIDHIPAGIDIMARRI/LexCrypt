import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button } from '../components/ui';

const features = [
  { icon: '🔐', title: 'AES-256 Encryption',    desc: 'Military-grade symmetric encryption protects every file in your vault with an unbreakable cipher.' },
  { icon: '🗝️', title: 'RSA Key Pairs',          desc: 'Public key encrypts. Private key decrypts. Your private key never touches our servers.' },
  { icon: '✍️', title: 'SHA-256 Signatures',     desc: 'Every file gets a cryptographic fingerprint. Verify authenticity and integrity at any time.' },
  { icon: '🛡️', title: 'MongoDB Vault Backend',  desc: 'Encrypted files stored securely in MongoDB. JWT auth on every API call. Helmet + CORS + rate limiting.' },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="page-wrapper" style={{ textAlign:'center', paddingTop:120 }}>
      {/* Eyebrow */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', background:'rgba(0,212,255,.07)', border:'1px solid rgba(0,212,255,.2)', borderRadius:20, fontSize:12, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--accent)', marginBottom:28, fontFamily:"'Space Mono',monospace" }}>
        🔒 AES-256 · RSA · SHA-256 · MongoDB
      </div>

      {/* Hero */}
      <h1 className="fade-up" style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(40px,6vw,76px)', lineHeight:1.05, marginBottom:24 }}>
        Military-Grade<br />
        <span style={{ background:'linear-gradient(135deg,var(--accent),var(--accent2),var(--accent3))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Cryptography</span><br />
        For Everyone
      </h1>

      <p className="fade-up a1" style={{ fontSize:18, color:'var(--text2)', maxWidth:560, margin:'0 auto 44px', lineHeight:1.7 }}>
        LexCrypt combines AES-256-CBC encryption, RSA key pairs, and SHA-256 digital signatures — all backed by a secure Node.js + MongoDB API.
      </p>

      <div className="fade-up a2" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:70 }}>
        <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>🚀 Get Started Free</Button>
        <Button variant="outline" size="lg" onClick={() => navigate('/login')}>→ Sign In</Button>
      </div>

      {/* Feature grid */}
      <div className="fade-up a3" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:20, maxWidth:920, width:'100%', marginBottom:60 }}>
        {features.map(f => (
          <div key={f.title} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'26px 22px', textAlign:'left', transition:'transform .2s,border-color .2s' }}
            onMouseOver={e=>e.currentTarget.style.transform='translateY(-4px)'}
            onMouseOut={e=>e.currentTarget.style.transform='none'}>
            <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, marginBottom:8 }}>{f.title}</div>
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Tech stack badges */}
      <div className="fade-up a4" style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        {['React.js','Node.js','Express.js','MongoDB','JWT Auth','AES-256-CBC','PBKDF2','SHA-256'].map(t => (
          <Badge key={t} variant="cyan">{t}</Badge>
        ))}
      </div>
    </div>
  );
}
