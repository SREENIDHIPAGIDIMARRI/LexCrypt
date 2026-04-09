import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { cryptoAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, CopyButton, Spinner, StatusBar } from '../components/ui';
import { normaliseKey, formatSize } from '../utils/crypto';

/**
 * Crypto Page — Text Encryption & Decryption
 *
 * HOW IT WORKS (answers the doubts):
 *
 * ENCRYPTION:
 *   - You type plain text → POST /api/crypto/encrypt
 *   - Server: AES-256-CBC encrypts using your vault keySecret
 *   - Server: SHA-256 hashes the plain text → stored SILENTLY in MongoDB
 *   - Server: saves { cipherText, iv, plainHash, label } as a CryptoSession
 *   - You get back: sessionId + cipherText (hash stays server-side, you never enter it)
 *
 * DECRYPTION:
 *   - Pick a session from the history list
 *   - Enter your private key (authentication)
 *   - POST /api/crypto/decrypt { sessionId, privateKey }
 *   - Server: decrypts → re-hashes result → compares to stored plainHash AUTOMATICALLY
 *   - If hashes don't match → BLOCKED (cipher text was tampered with)
 *   - You never manually type a hash anywhere — it's all automatic
 *
 * WHERE DATA IS STORED:
 *   - Every encrypt creates a CryptoSession document in MongoDB
 *   - Session history is shown in the "History" tab
 *   - You can decrypt any past session by selecting it from the list
 */
export default function Crypto() {
  const { user } = useAuth();
  const [tab, setTab] = useState('encrypt');

  // Encrypt state
  const [plainText, setPlainText]   = useState('');
  const [label, setLabel]           = useState('');
  const [encResult, setEncResult]   = useState(null); // { sessionId, cipherText, iv, label }
  const [encLoading, setEncLoading] = useState(false);

  // Decrypt state
  const [selectedSession, setSelectedSession] = useState(null);
  const [privKey, setPrivKey]       = useState('');
  const [decResult, setDecResult]   = useState(null);
  const [decLoading, setDecLoading] = useState(false);

  // History
  const [sessions, setSessions]     = useState([]);
  const [fetching, setFetching]     = useState(false);

  const fetchSessions = useCallback(async () => {
    setFetching(true);
    try {
      const res = await cryptoAPI.listSessions();
      setSessions(res.data.sessions);
    } catch { /* silent */ }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Encrypt ──
  const handleEncrypt = async () => {
    if (!plainText.trim()) { toast.error('Enter plain text to encrypt'); return; }
    if (!user?.publicKey)  { toast.error('Generate your key pair in Vault first'); return; }
    setEncLoading(true);
    try {
      const res = await cryptoAPI.encryptText({ plainText, label: label || undefined });
      setEncResult(res.data);
      fetchSessions();
      toast.success('Encrypted & saved to MongoDB');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Encryption failed');
    } finally { setEncLoading(false); }
  };

  // ── Load session for decryption ──
  const loadSession = async (id) => {
    try {
      const res = await cryptoAPI.getSession(id);
      setSelectedSession(res.data.session);
      setDecResult(null);
      setPrivKey('');
      setTab('decrypt');
      toast.success('Session loaded — enter your private key to decrypt');
    } catch { toast.error('Failed to load session'); }
  };

  // ── Decrypt ──
  const handleDecrypt = async () => {
    if (!selectedSession) { toast.error('Select a session from History tab first'); return; }
    if (!privKey.trim())  { toast.error('Private key is required'); return; }
    setDecLoading(true);
    try {
      const res = await cryptoAPI.decryptText({ sessionId: selectedSession._id, privateKey: privKey });
      setDecResult(res.data);
      toast.success('✅ Decrypted — SHA-256 verified automatically');
    } catch (e) {
      const data = e.response?.data;
      toast.error(data?.message || 'Decryption failed');
      if (data?.integrityOk === false) {
        setDecResult({ error: true, message: data.message, storedHash: data.storedHash, computedHash: data.computedHash });
      }
    } finally { setDecLoading(false); }
  };

  // ── Delete session ──
  const deleteSession = async (id) => {
    if (!window.confirm('Delete this session? The cipher text will be gone.')) return;
    try {
      await cryptoAPI.deleteSession(id);
      setSessions(s => s.filter(x => x._id !== id));
      if (selectedSession?._id === id) { setSelectedSession(null); setDecResult(null); }
      toast.success('Session deleted');
    } catch { toast.error('Delete failed'); }
  };

  const downloadEnc = () => {
    if (!encResult) return;
    const data = JSON.stringify({ sessionId: encResult.sessionId, cipherText: encResult.cipherText, iv: encResult.iv, label: encResult.label, algorithm: 'AES-256-CBC' }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'lexcrypt_cipher.enc.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const tabs = [
    { id: 'encrypt', label: '🔐 Encrypt' },
    { id: 'decrypt', label: '🔓 Decrypt' },
    { id: 'history', label: `📋 History (${sessions.length})` },
  ];

  const infoBox = (text, color = 'var(--accent)') => (
    <div style={{ background: 'rgba(0,212,255,.04)', border: '1px solid rgba(0,212,255,.12)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
      <span style={{ color, fontWeight: 600 }}>ℹ️ </span>{text}
    </div>
  );

  return (
    <div className="page-wrapper">
      <div style={{ width: '100%', maxWidth: 820 }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 6 }}>🔐 Text Encryption &amp; Decryption</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
            Every encryption is saved as a <strong style={{ color: 'var(--accent)' }}>CryptoSession</strong> in MongoDB.
            The SHA-256 hash is stored <strong style={{ color: 'var(--accent3)' }}>silently on the server</strong> — you never enter it manually.
            It is auto-verified when you decrypt.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge variant="cyan">AES-256-CBC</Badge>
            <Badge variant="green">Auto SHA-256 Verify</Badge>
            <Badge variant="purple">MongoDB Sessions</Badge>
            <Badge variant="cyan">Private Key Auth</Badge>
          </div>
        </div>

        <StatusBar dot="green" right={`${sessions.length} session${sessions.length !== 1 ? 's' : ''} stored`}>
          API connected · Sessions persisted to MongoDB
        </StatusBar>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', padding: 4, borderRadius: 12, marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', color: tab === t.id ? 'var(--accent)' : 'var(--text3)', background: tab === t.id ? 'var(--card)' : 'transparent', boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,.3)' : 'none', transition: 'all .2s', fontFamily: "'Outfit',sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ENCRYPT TAB ── */}
        {tab === 'encrypt' && (
          <div className="fade-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            {infoBox('The SHA-256 hash of your plain text is stored automatically in MongoDB at encrypt time — you never see or enter it. It will be silently verified when you decrypt.')}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>Session Label (optional)</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Secret message to Alice" style={{ width: '100%', padding: '11px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: "'Outfit',sans-serif", boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
              {/* Plain text input */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>Plain Text</label>
                <textarea value={plainText} onChange={e => setPlainText(e.target.value)} placeholder="Type your secret message here…" rows={7}
                  style={{ width: '100%', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, boxSizing: 'border-box', transition: 'border .2s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              {/* Cipher output */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>Cipher Text Output</label>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, minHeight: 180, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: encResult ? 'var(--accent3)' : 'var(--text3)', wordBreak: 'break-all', lineHeight: 1.8, flex: 1, fontStyle: encResult ? 'normal' : 'italic' }}>
                    {encResult ? encResult.cipherText : 'Cipher text will appear here after encryption…'}
                  </div>
                  {encResult && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Session ID: </span>
                        <span style={{ fontFamily: "'Space Mono',monospace" }}>{encResult.sessionId}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                        <span style={{ color: 'var(--accent3)', fontWeight: 600 }}>SHA-256: </span>
                        <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--text3)' }}>stored silently in MongoDB ✓</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <CopyButton text={encResult.cipherText} label="Copy Cipher" />
                        <button onClick={downloadEnc} style={{ background: 'none', border: '1px solid rgba(0,212,255,.3)', color: 'var(--accent)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", marginTop: 8 }}>⬇️ Download .enc</button>
                        <button onClick={() => { setSelectedSession({ _id: encResult.sessionId, label: encResult.label, cipherText: encResult.cipherText, iv: encResult.iv }); setTab('decrypt'); }} style={{ background: 'none', border: '1px solid rgba(123,94,167,.3)', color: 'var(--accent2)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", marginTop: 8 }}>→ Decrypt this</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button variant="green" loading={encLoading} onClick={handleEncrypt}>🔐 Encrypt via API (saves to MongoDB)</Button>
          </div>
        )}

        {/* ── DECRYPT TAB ── */}
        {tab === 'decrypt' && (
          <div className="fade-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            {infoBox('Select a session from History, then enter your private key. The SHA-256 hash is verified AUTOMATICALLY — no manual hash entry needed.', 'var(--accent2)')}

            {/* Selected session display */}
            {selectedSession ? (
              <div style={{ background: 'rgba(0,212,255,.04)', border: '1px solid rgba(0,212,255,.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>📄 {selectedSession.label || 'Untitled session'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Space Mono',monospace" }}>ID: {selectedSession._id}</div>
                    <div style={{ marginTop: 8, fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--accent3)', wordBreak: 'break-all', lineHeight: 1.7, maxHeight: 80, overflowY: 'auto' }}>{selectedSession.cipherText}</div>
                  </div>
                  <button onClick={() => { setSelectedSession(null); setDecResult(null); }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, padding: '0 0 0 12px' }}>✕</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setTab('history')} style={{ border: '2px dashed var(--border2)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, color: 'var(--text3)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                <div>No session selected — click here to pick one from History</div>
              </div>
            )}

            {/* Private key input */}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>🔴 Private Key (required for authentication)</label>
            <textarea value={privKey} onChange={e => setPrivKey(e.target.value)} placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"} rows={4}
              style={{ width: '100%', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid rgba(123,94,167,.4)', borderRadius: 10, color: 'var(--accent2)', fontSize: 11, outline: 'none', resize: 'vertical', fontFamily: "'Space Mono',monospace", lineHeight: 1.7, boxSizing: 'border-box', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => { const k = sessionStorage.getItem('lexcrypt_privkey') || ''; setPrivKey(k); if (k) toast.success('Key loaded from session'); else toast.error('No session key — paste manually'); }} style={{ background: 'none', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                📋 Load Session Key
              </button>
              <Button variant="purple" loading={decLoading} onClick={handleDecrypt}>🔓 Decrypt &amp; Verify (auto SHA-256)</Button>
            </div>

            {/* Result */}
            {decResult && !decResult.error && (
              <div style={{ background: 'rgba(0,255,157,.05)', border: '1px solid rgba(0,255,157,.25)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <Badge variant="green">✅ SHA-256 Verified</Badge>
                  <Badge variant="green">✅ Integrity OK</Badge>
                  <Badge variant="cyan">AES-256-CBC</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--accent3)', marginBottom: 10 }}>{decResult.message}</div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Decrypted Plain Text</label>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontFamily: "'Outfit',sans-serif", fontSize: 15, color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {decResult.plainText}
                </div>
                <CopyButton text={decResult.plainText} label="Copy Plain Text" />
              </div>
            )}
            {decResult?.error && (
              <div style={{ background: 'rgba(255,68,102,.1)', border: '1px solid rgba(255,68,102,.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ color: '#ff8099', fontWeight: 600, marginBottom: 8 }}>{decResult.message}</div>
                {decResult.storedHash && (
                  <div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: 'var(--text3)' }}>
                    Stored hash:   {decResult.storedHash}<br/>
                    Computed hash: {decResult.computedHash}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="fade-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
              Every encryption you perform is saved here as a <strong style={{ color: 'var(--accent)' }}>CryptoSession</strong> in MongoDB.
              Click <strong style={{ color: 'var(--accent2)' }}>Decrypt</strong> on any session to load it for decryption.
              The SHA-256 integrity check runs automatically — you never enter the hash manually.
            </div>

            {fetching ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px 0', border: '1px dashed var(--border)', borderRadius: 12 }}>
                No sessions yet — encrypt some text to see it here
              </div>
            ) : sessions.map(s => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg2)', border: `1px solid ${selectedSession?._id === s._id ? 'var(--accent2)' : 'var(--border)'}`, borderRadius: 12, marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>📄 {s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(s.encryptedAt).toLocaleString()} · SHA-256 stored in DB</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant="green">Saved</Badge>
                  <button onClick={() => loadSession(s._id)} style={{ background: 'rgba(123,94,167,.15)', border: '1px solid rgba(123,94,167,.4)', color: 'var(--accent2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>Decrypt</button>
                  <button onClick={() => deleteSession(s._id)} style={{ background: 'rgba(255,68,102,.1)', border: '1px solid rgba(255,68,102,.3)', color: 'var(--danger)', borderRadius: 8, padding: '7px 10px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
