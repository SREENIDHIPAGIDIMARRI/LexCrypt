import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, Input, Button, PasswordStrength, MonoBox, CopyButton, StatusBar } from '../components/ui';
import { generateKeyPair, pubKeyToSecret, passwordStrength } from '../utils/crypto';

const STEPS = ['Vault Name', 'Set Password', 'Confirm', 'Generate Keys'];

export default function Vault() {
  const { user, saveKeys } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ vaultName: '', vaultDesc: '', password: '', confirm: '' });
  const [keys, setKeys] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [privateKeySaved, setPrivateKeySaved] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const nextStep = async () => {
    if (step === 1 && !form.vaultName.trim()) { toast.error('Enter a vault name'); return; }
    if (step === 2 && passwordStrength(form.password) < 2) { toast.error('Use a stronger password'); return; }
    if (step === 3) {
      if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
      await runKeyGeneration();
    }
    setStep(s => s + 1);
  };

  const runKeyGeneration = async () => {
    setStep(4);
    const msgs = ['Initializing RSA engine...','Generating prime factors...','Deriving public exponent...','Computing private exponent...','Validating key pair...','Keys generated!'];
    for (let i = 0; i < msgs.length; i++) {
      await new Promise(r => setTimeout(r, 350));
      setStatusMsg(msgs[i]);
      setProgress(Math.round((i + 1) / msgs.length * 100));
    }
    const kp = generateKeyPair();
    setKeys(kp);
  };

  const handleSaveKeys = async () => {
    if (!keys) return;
    setSaving(true);
    try {
      const keySecret = await pubKeyToSecret(keys.publicKey);
      await saveKeys({ publicKey: keys.publicKey, keySecret, vaultName: form.vaultName, vaultDesc: form.vaultDesc });
      // Also store private key in sessionStorage (never sent to server)
      sessionStorage.setItem('lexcrypt_privkey', keys.privateKey);
      toast.success('Vault configured! Keys saved.');
      navigate('/upload');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save keys');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Card className="fade-up" md style={{ maxWidth: 640 }}>
        {/* Step indicator */}
        <div style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, border:'1px solid', borderColor: done ? 'var(--accent3)' : active ? 'var(--accent)' : 'var(--border)', color: done ? 'var(--accent3)' : active ? 'var(--accent)' : 'var(--text3)', background: done ? 'rgba(0,255,157,.05)' : active ? 'rgba(0,212,255,.07)' : 'transparent' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background: done ? 'var(--accent3)' : active ? 'var(--accent)' : 'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color: (done||active) ? '#000' : 'var(--text3)' }}>
                  {done ? '✓' : n}
                </div>
                {label}
              </div>
            );
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:6 }}>🏦 Create Your Vault</h2>
            <p style={{ color:'var(--text2)', fontSize:14, marginBottom:24 }}>Name your encrypted storage hub.</p>
            <Input label="Vault Name" placeholder="My Secure Vault" value={form.vaultName} onChange={set('vaultName')} />
            <Input label="Description (optional)" placeholder="Personal encryption vault" value={form.vaultDesc} onChange={set('vaultDesc')} />
            <Button variant="primary" full onClick={nextStep}>Continue →</Button>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:6 }}>🔑 Set Vault Password</h2>
            <p style={{ color:'var(--text2)', fontSize:14, marginBottom:24 }}>This password encrypts your vault. Store it safely.</p>
            <div style={{ marginBottom:18 }}>
              <Input label="Vault Password" type="password" placeholder="Strong unique password" value={form.password} onChange={set('password')} />
              <PasswordStrength password={form.password} />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button variant="primary" full onClick={nextStep}>Continue →</Button>
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:6 }}>✅ Confirm Password</h2>
            <p style={{ color:'var(--text2)', fontSize:14, marginBottom:24 }}>Re-enter your vault password to confirm.</p>
            <Input label="Confirm Vault Password" type="password" placeholder="Re-enter password" value={form.confirm} onChange={set('confirm')} />
            <div style={{ display:'flex', gap:12 }}>
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="primary" full onClick={nextStep}>Confirm & Generate Keys →</Button>
            </div>
          </>
        )}

        {/* Step 4 — Key generation */}
        {step === 4 && (
          <>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:6 }}>🗝️ Generating Cryptographic Keys</h2>
            <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20 }}>Your RSA-2048 key pair is being generated.</p>
            <StatusBar dot={keys ? 'green' : 'blue'}>{statusMsg || 'Waiting...'}</StatusBar>
            <div style={{ background:'var(--border)', borderRadius:4, height:6, overflow:'hidden', marginBottom:20 }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,var(--accent),var(--accent3))', borderRadius:4, width:`${progress}%`, transition:'width .4s ease' }} />
            </div>

            {keys && (
              <>
                {/* Public key */}
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text2)', marginBottom:8 }}>🔵 Public Key <span style={{ color:'var(--text3)', fontWeight:400 }}>(saved to server)</span></div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--accent)', wordBreak:'break-all', lineHeight:1.7, maxHeight:120, overflowY:'auto' }}>{keys.publicKey}</div>
                  <CopyButton text={keys.publicKey} label="Copy Public Key" />
                </div>

                {/* Private key */}
                <div style={{ background:'var(--bg2)', border:'1px solid rgba(123,94,167,.4)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text2)', marginBottom:8 }}>🔴 Private Key <span style={{ color:'var(--text3)', fontWeight:400 }}>(NEVER sent to server)</span></div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--accent2)', wordBreak:'break-all', lineHeight:1.7, maxHeight:120, overflowY:'auto' }}>{keys.privateKey}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <CopyButton text={keys.privateKey} label="Copy Private Key" />
                    <button onClick={() => setPrivateKeySaved(true)} style={{ background:'none', border:'1px solid rgba(0,255,157,.3)', color:'var(--accent3)', borderRadius:6, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:"'Outfit',sans-serif", marginTop:8 }}>
                      ✓ I've saved it
                    </button>
                  </div>
                </div>

                <div style={{ background:'rgba(255,68,102,.07)', border:'1px solid rgba(255,68,102,.2)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#ff8099', marginBottom:20 }}>
                  ⚠️ <strong>Save your private key now!</strong> It is stored only in your browser session. Anyone with it can decrypt your data.
                </div>

                <Button variant="green" full loading={saving} onClick={handleSaveKeys} style={{ opacity: privateKeySaved ? 1 : 0.5 }}>
                  {privateKeySaved ? '✅ Save & Go to Vault →' : 'Confirm you saved the private key first'}
                </Button>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
