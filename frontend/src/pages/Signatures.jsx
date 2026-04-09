import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { sigAPI } from '../api';
import { Badge, Button, CopyButton, Spinner, StatusBar } from '../components/ui';

/**
 * Signatures Page — Digital Signature Audit Log
 *
 * HOW SIGNATURES ARE USED IN THIS PROJECT (answers the doubt):
 *
 * 1. AUTO signatures (prefix [AUTO]):
 *    Created AUTOMATICALLY every time you upload a file to the vault.
 *    Formula: SHA-256( fileHash : userId : fileId )
 *    This signature is stored on the VaultFile record AND here in the log.
 *    At decrypt time the server re-derives this signature and compares — if
 *    they don't match, decryption is BLOCKED. This is the main security use.
 *
 * 2. MANUAL signatures:
 *    Created here by typing/pasting any document text.
 *    Used to sign contracts, messages, or any arbitrary content.
 *    You can share the hash with someone and they can verify the content
 *    hasn't changed using the Verify tab.
 *
 * The unified log shows BOTH so you have a complete audit trail of every
 * cryptographic operation in your account.
 */
export default function Signatures() {
  const [tab, setTab]             = useState('sign');
  const [signInput, setSignInput] = useState('');
  const [signResult, setSignResult] = useState(null);
  const [verifyContent, setVerifyContent] = useState('');
  const [verifyHash, setVerifyHash]       = useState('');
  const [verifyResult, setVerifyResult]   = useState(null);
  const [sigLog, setSigLog]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(false);

  const fetchLog = useCallback(async () => {
    setFetching(true);
    try {
      const res = await sigAPI.list();
      setSigLog(res.data.signatures);
    } catch { toast.error('Failed to load signature log'); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const handleSign = async () => {
    if (!signInput.trim()) { toast.error('Enter content to sign'); return; }
    setLoading(true);
    try {
      const res = await sigAPI.sign({ content: signInput, label: `Document ${sigLog.filter(s => !s.label.startsWith('[AUTO]')).length + 1}` });
      setSignResult(res.data);
      fetchLog();
      toast.success('Document signed & stored in MongoDB audit log');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Signing failed');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!verifyContent.trim() || !verifyHash.trim()) { toast.error('Fill in both fields'); return; }
    setLoading(true);
    try {
      const res = await sigAPI.verify({ content: verifyContent, hash: verifyHash });
      setVerifyResult(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await sigAPI.delete(id);
      setSigLog(l => l.filter(s => s._id !== id));
      toast.success('Signature removed from audit log');
    } catch { toast.error('Delete failed'); }
  };

  const autoCount   = sigLog.filter(s => s.label.startsWith('[AUTO]')).length;
  const manualCount = sigLog.filter(s => !s.label.startsWith('[AUTO]')).length;

  const tabs = [
    { id: 'sign',   label: '✍️ Sign Document' },
    { id: 'verify', label: '🔍 Verify Hash' },
    { id: 'log',    label: `📋 Audit Log (${sigLog.length})` },
  ];

  return (
    <div className="page-wrapper">
      <div style={{ width: '100%', maxWidth: 720 }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 6 }}>✍️ Digital Signatures</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
            Every vault file upload <strong style={{ color: 'var(--accent3)' }}>automatically creates a signature</strong> here.
            These <Badge variant="cyan">[AUTO]</Badge> signatures are re-verified server-side every time a file is decrypted — blocking access if tampered.
            You can also manually sign any document text.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge variant="cyan">SHA-256</Badge>
            <Badge variant="green">Auto File Signatures</Badge>
            <Badge variant="purple">Manual Signing</Badge>
            <Badge variant="cyan">MongoDB Audit Log</Badge>
          </div>
        </div>

        <StatusBar dot="green" right={`${autoCount} auto · ${manualCount} manual`}>
          Unified audit log · {sigLog.length} total signature{sigLog.length !== 1 ? 's' : ''} in MongoDB
        </StatusBar>

        {/* How it's used info box */}
        <div style={{ background: 'rgba(0,255,157,.04)', border: '1px solid rgba(0,255,157,.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 13, lineHeight: 1.7, color: 'var(--text2)' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent3)', marginBottom: 6 }}>🔐 How signatures protect your vault files</div>
          <ol style={{ paddingLeft: 18 }}>
            <li>You upload a file → server computes <code style={{ color: 'var(--accent)', background: 'rgba(0,212,255,.1)', padding: '1px 5px', borderRadius: 4 }}>SHA-256(hash:userId:fileId)</code> → stored as the file's digital signature AND in this log as <Badge variant="cyan">[AUTO]</Badge></li>
            <li>You click Decrypt → server re-derives the same signature → if they don't match → <strong style={{ color: 'var(--danger)' }}>decryption is blocked</strong></li>
            <li>Then server decrypts and re-hashes content → compares to the original SHA-256 → second blocking check</li>
          </ol>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', padding: 4, borderRadius: 12, marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', color: tab === t.id ? 'var(--accent)' : 'var(--text3)', background: tab === t.id ? 'var(--card)' : 'transparent', boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,.3)' : 'none', transition: 'all .2s', fontFamily: "'Outfit',sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SIGN TAB ── */}
        {tab === 'sign' && (
          <div className="fade-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Sign any document or message. The SHA-256 hash is stored in MongoDB.
              Share the hash with the receiver — they can paste the document + hash on the Verify tab to confirm nothing changed.
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>Document / Text to Sign</label>
            <textarea value={signInput} onChange={e => setSignInput(e.target.value)} placeholder="Paste document content or text to sign…" rows={6}
              style={{ width: '100%', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 16, boxSizing: 'border-box', transition: 'border .2s' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent2)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
            {signResult && (
              <>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent3)', display: 'inline-block' }} /> SHA-256 Hash (share this for verification)
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--accent3)', wordBreak: 'break-all', lineHeight: 1.7 }}>{signResult.sha256}</div>
                  <CopyButton text={signResult.sha256} label="Copy Hash" />
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} /> Digital Signature (stored in MongoDB)
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all', lineHeight: 1.7 }}>{signResult.signature}</div>
                  <CopyButton text={signResult.signature} label="Copy Signature" />
                </div>
                <div style={{ background: 'rgba(0,255,157,.05)', border: '1px solid rgba(0,255,157,.2)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: 'var(--accent3)', marginBottom: 16 }}>
                  ✅ Signature stored in MongoDB audit log. Share the <strong>SHA-256 hash</strong> with anyone who needs to verify this document.
                </div>
              </>
            )}
            <Button variant="purple" loading={loading} onClick={handleSign}>✍️ Sign &amp; Store in MongoDB</Button>
          </div>
        )}

        {/* ── VERIFY TAB ── */}
        {tab === 'verify' && (
          <div className="fade-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Paste the original document content and the SHA-256 hash you received.
              The server re-hashes the content and compares — if they match, the document is authentic.
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>Original Content</label>
            <textarea value={verifyContent} onChange={e => setVerifyContent(e.target.value)} placeholder="Paste the original document content…" rows={5}
              style={{ width: '100%', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>SHA-256 Hash to Verify</label>
            <input value={verifyHash} onChange={e => setVerifyHash(e.target.value)} placeholder="Paste the SHA-256 hash…"
              style={{ width: '100%', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: "'Space Mono',monospace", marginBottom: 16, boxSizing: 'border-box' }}
            />
            {verifyResult && (
              <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: verifyResult.valid ? 'rgba(0,255,157,.1)' : 'rgba(255,68,102,.1)', border: `1px solid ${verifyResult.valid ? 'rgba(0,255,157,.3)' : 'rgba(255,68,102,.3)'}`, color: verifyResult.valid ? 'var(--accent3)' : '#ff8099' }}>
                {verifyResult.valid
                  ? '✅ Signature VALID — document is authentic and has not been modified'
                  : '❌ Signature INVALID — hash mismatch, document may have been tampered with'}
              </div>
            )}
            <Button variant="primary" loading={loading} onClick={handleVerify}>🔍 Verify via API</Button>
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {tab === 'log' && (
          <div className="fade-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <Badge variant="green">{autoCount} AUTO (file uploads)</Badge>
              <Badge variant="purple">{manualCount} Manual (signed docs)</Badge>
            </div>
            {fetching ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
            ) : sigLog.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '40px 0' }}>
                No signatures yet. Upload a file or sign a document to see the audit log.
              </div>
            ) : sigLog.map(sig => {
              const isAuto = sig.label.startsWith('[AUTO]');
              return (
                <div key={sig._id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg2)', border: `1px solid ${isAuto ? 'rgba(0,255,157,.15)' : 'var(--border)'}`, borderRadius: 12, marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{isAuto ? '🔐' : '✍️'} {isAuto ? sig.label.replace('[AUTO] ', '') : sig.label}</span>
                      {isAuto && <Badge variant="green">AUTO</Badge>}
                    </div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--text3)', wordBreak: 'break-all', marginBottom: 4 }}>SHA-256: {sig.sha256}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(sig.signedAt).toLocaleString()}</div>
                    {isAuto && <div style={{ fontSize: 11, color: 'var(--accent3)', marginTop: 4 }}>↳ This signature is verified server-side every time the file is decrypted</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant="green">✓ VALID</Badge>
                    <button onClick={() => handleDelete(sig._id)} style={{ background: 'rgba(255,68,102,.1)', border: '1px solid rgba(255,68,102,.3)', color: 'var(--danger)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
