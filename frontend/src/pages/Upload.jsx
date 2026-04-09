import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { vaultAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, StatusBar, MonoBox, Spinner, CopyButton } from '../components/ui';
import { fileToBase64, sha256, aesEncrypt, aesDecrypt, pubKeyToSecret, formatSize, fileIcon, normaliseKey } from '../utils/crypto';

export default function Upload() {
  const { user } = useAuth();
  const [queue, setQueue]   = useState([]);
  const [vault, setVault]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [dragOver, setDragOver]   = useState(false);
  const [vaultSize, setVaultSize] = useState('');

  // Modal state
  const [modal, setModal]           = useState(false);
  const [modalFile, setModalFile]   = useState(null);
  const [privKeyInput, setPrivKeyInput] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError]   = useState('');
  const [modalSigStatus, setModalSigStatus] = useState(null);

  // Decrypted preview
  const [preview, setPreview]     = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewName, setPreviewName] = useState('');

  const fileRef = useRef();

  const fetchVault = useCallback(async () => {
    try {
      const res = await vaultAPI.listFiles();
      setVault(res.data.files);
      const total = res.data.files.reduce((a, f) => a + f.size, 0);
      setVaultSize(formatSize(total));
    } catch { toast.error('Failed to load vault'); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  /* ── Drop zone ── */
  const handleFiles = (files) => {
    const incoming = Array.from(files).filter(f => !queue.find(q => q.name === f.name));
    setQueue(q => [...q, ...incoming]);
  };

  /* ── Encrypt all queued files → upload to backend ── */
  const encryptAll = async () => {
    if (!queue.length) return;
    if (!user.publicKey || !user.keySecret) { toast.error('Generate your key pair in the Vault page first.'); return; }
    setLoading(true);
    const secret = user.keySecret;
    for (const file of queue) {
      try {
        toast.loading(`Encrypting ${file.name}…`, { id: file.name });
        const b64 = await fileToBase64(file);
        const hash = await sha256(b64);
        const { cipherText, iv } = await aesEncrypt(b64, secret);
        await vaultAPI.upload({
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          cipherText, iv, sha256Hash: hash,
          publicKey: user.publicKey,
        });
        toast.success(`${file.name} encrypted & saved`, { id: file.name });
      } catch (e) {
        toast.error(`Failed: ${file.name}`, { id: file.name });
      }
    }
    setQueue([]);
    setLoading(false);
    fetchVault();
  };

  /* ── Open private-key modal ── */
  const openDecryptModal = (file) => {
    setModalFile(file);
    setPrivKeyInput('');
    setModalError('');
    setModalSigStatus(null);
    setModal(true);
  };

  /* ── Confirm decrypt in modal ── */
  const confirmDecrypt = async () => {
    if (!privKeyInput.trim()) { setModalError('Private key is required to decrypt.'); return; }
    const storedPriv = sessionStorage.getItem('lexcrypt_privkey') || '';
    if (normaliseKey(privKeyInput) !== normaliseKey(storedPriv)) {
      setModalError('Private key does not match your vault key pair.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    try {
      const res = await vaultAPI.decrypt(modalFile._id, { privateKey: privKeyInput });
      const { decryptedContent, sigValid, integrityOk, file: f } = res.data;
      setModalSigStatus({ sigValid, integrityOk });

      // Decode base64 → bytes → Blob
      const binary = atob(decryptedContent);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: f.mimeType });
      setPreviewBlob(blob);
      setPreviewName(f.originalName);

      // Text preview
      if (f.mimeType.startsWith('text') || /\.(txt|md|json|csv|xml|html|js|py|ts|sh)$/i.test(f.originalName)) {
        const text = new TextDecoder().decode(bytes);
        setPreview(text.slice(0, 5000) + (text.length > 5000 ? '\n…[truncated]' : ''));
      } else {
        setPreview(`[Binary file — ${formatSize(f.size)}] — click Download to save.`);
      }

      setTimeout(() => { setModal(false); setModalLoading(false); }, 1200);
    } catch (e) {
      setModalError(e.response?.data?.message || 'Decryption failed');
      setModalLoading(false);
    }
  };

  /* ── Delete vault file ── */
  const deleteFile = async (id) => {
    if (!window.confirm('Remove this file from vault?')) return;
    try {
      await vaultAPI.deleteFile(id);
      toast.success('File deleted');
      fetchVault();
    } catch { toast.error('Delete failed'); }
  };

  /* ── Download ── */
  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="page-wrapper">
      <div style={{ width:'100%', maxWidth:920 }}>
        {/* Header */}
        <div className="fade-up" style={{ marginBottom:24 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, marginBottom:6 }}>📁 File Upload & Encrypted Vault</h1>
          <p style={{ color:'var(--text2)', fontSize:14 }}>Files are encrypted client-side with AES-256, then uploaded to MongoDB. Private key required to decrypt.</p>
          <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
            <Badge variant="cyan">AES-256-CBC</Badge>
            <Badge variant="green">MongoDB Backend</Badge>
            <Badge variant="purple">JWT Auth</Badge>
            <Badge variant="cyan">SHA-256 Integrity</Badge>
          </div>
        </div>

        {/* Backend status */}
        <StatusBar dot="green" right={`Vault: ${vaultSize || '0 B'}`}>
          Connected to LexCrypt API · {user?.username}'s encrypted vault
        </StatusBar>

        {/* Drop zone */}
        <div
          className="fade-up"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current.click()}
          style={{ border:`2px dashed ${dragOver?'var(--accent)':'var(--border2)'}`, borderRadius:16, padding:'40px 24px', textAlign:'center', cursor:'pointer', background: dragOver?'rgba(0,212,255,.04)':'rgba(14,21,38,.4)', marginBottom:20, transition:'all .2s' }}
        >
          <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={e => handleFiles(e.target.files)} />
          <div style={{ fontSize:40, marginBottom:12 }}>📤</div>
          <p style={{ fontSize:14, color:'var(--text2)' }}><strong style={{ color:'var(--accent)' }}>Click to browse</strong> or drag & drop files</p>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Any file type · Encrypted client-side before upload</p>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="fade-up" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ fontWeight:700, fontSize:13, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text2)' }}>📂 Upload Queue · {queue.length} file{queue.length>1?'s':''}</span>
              <Button variant="outline" size="sm" onClick={() => setQueue([])}>Clear</Button>
            </div>
            {queue.map((f, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, marginBottom:8, gap:12, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{fileIcon(f.name)} {f.name}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{formatSize(f.size)} · {f.type||'unknown'}</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <Badge variant="warn">Queued</Badge>
                  <Button variant="danger" size="sm" onClick={() => setQueue(q => q.filter((_,j) => j!==i))}>✕</Button>
                </div>
              </div>
            ))}
            <Button variant="green" full loading={loading} onClick={encryptAll} style={{ marginTop:8 }}>
              🔐 Encrypt All & Upload to Vault
            </Button>
          </div>
        )}

        {/* Vault list */}
        <div className="fade-up" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontWeight:700, fontSize:13, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text2)' }}>🔐 Encrypted Vault · {vault.length} file{vault.length!==1?'s':''}</span>
          </div>

          {fetching ? (
            <div style={{ textAlign:'center', padding:40 }}><Spinner /></div>
          ) : vault.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)', border:'1px dashed var(--border)', borderRadius:12 }}>
              🔒 No encrypted files yet — upload files above to get started
            </div>
          ) : (
            vault.map(file => (
              <div key={file._id} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:10, gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, marginBottom:4 }}>🔐 {file.encName}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--text3)', wordBreak:'break-all' }}>SHA-256: {file.sha256Hash?.slice(0,40)}…</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                    {file.originalName} · {formatSize(file.size)} · {new Date(file.encryptedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <Badge variant="green">Encrypted</Badge>
                  <Button variant="outline" size="sm" onClick={() => openDecryptModal(file)}>🔓 Decrypt</Button>
                  <Button variant="danger" size="sm" onClick={() => deleteFile(file._id)}>🗑</Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Decrypted preview */}
        {preview && (
          <div className="fade-up" style={{ background:'var(--card)', border:'1px solid rgba(0,255,157,.2)', borderRadius:16, padding:24, marginTop:20 }}>
            <div style={{ fontWeight:700, fontSize:12, letterSpacing:'1px', textTransform:'uppercase', color:'var(--accent3)', marginBottom:12 }}>
              ✅ Decrypted Output
              {modalSigStatus && (
                <Badge variant={modalSigStatus.sigValid && modalSigStatus.integrityOk ? 'green' : 'warn'} style={{ marginLeft:12 }}>
                  {modalSigStatus.sigValid && modalSigStatus.integrityOk ? '✅ SHA-256 & Sig Verified' : '⚠️ Verify Warning'}
                </Badge>
              )}
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:'var(--accent3)', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16, maxHeight:220, overflowY:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.8 }}>
              {preview}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
              <CopyButton text={preview} label="Copy Content" />
              <button onClick={() => previewBlob && download(previewBlob, previewName)} style={{ background:'none', border:'1px solid rgba(0,255,157,.3)', color:'var(--accent3)', borderRadius:6, padding:'5px 14px', fontSize:12, cursor:'pointer', fontFamily:"'Outfit',sans-serif", marginTop:8 }}>⬇️ Download Decrypted</button>
              <button onClick={() => setPreview(null)} style={{ background:'none', border:'1px solid rgba(255,68,102,.3)', color:'var(--danger)', borderRadius:6, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:"'Outfit',sans-serif", marginTop:8 }}>✕ Close</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Private Key Modal ── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(4,7,16,.88)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border2)', borderRadius:20, padding:'36px 40px', width:'100%', maxWidth:500, position:'relative', boxShadow:'0 24px 80px rgba(0,0,0,.6)' }}>
            <div style={{ position:'absolute', top:-1, left:'20%', right:'20%', height:2, background:'linear-gradient(90deg,transparent,var(--accent2),transparent)' }} />
            <div style={{ fontSize:28, textAlign:'center', marginBottom:12 }}>🔐</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, textAlign:'center', marginBottom:6 }}>Authentication Required</h3>
            <p style={{ textAlign:'center', color:'var(--text2)', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
              <strong style={{ color:'var(--text)' }}>{modalFile?.originalName}</strong><br/>
              {formatSize(modalFile?.size)} · Encrypted {modalFile?.encryptedAt ? new Date(modalFile.encryptedAt).toLocaleString() : ''}
            </p>

            {/* SHA-256 hash display */}
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent3)', display:'inline-block' }} /> File SHA-256 Fingerprint
              </div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--accent3)', wordBreak:'break-all', lineHeight:1.7 }}>{modalFile?.sha256Hash}</div>
            </div>

            {/* Digital signature */}
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent2)', display:'inline-block' }} /> Digital Signature
              </div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--accent2)', wordBreak:'break-all', lineHeight:1.7 }}>{modalFile?.signature}</div>
            </div>

            <label style={{ display:'block', fontSize:12, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text2)', marginBottom:8 }}>🔴 Enter Your Private Key</label>
            <textarea
              value={privKeyInput}
              onChange={e => { setPrivKeyInput(e.target.value); setModalError(''); }}
              placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
              rows={5}
              style={{ width:'100%', background:'var(--bg)', border:`1px solid ${modalError?'var(--danger)':'var(--border)'}`, borderRadius:10, color:'var(--accent2)', fontFamily:"'Space Mono',monospace", fontSize:11, padding:'12px 14px', outline:'none', resize:'vertical', lineHeight:1.7, boxSizing:'border-box' }}
            />

            {modalError && <div style={{ color:'#ff8099', fontSize:13, marginTop:8, padding:'10px 14px', background:'rgba(255,68,102,.1)', border:'1px solid rgba(255,68,102,.3)', borderRadius:8 }}>{modalError}</div>}
            {modalSigStatus && !modalError && (
              <div style={{ fontSize:13, marginTop:8, padding:'10px 14px', background:'rgba(0,255,157,.07)', border:'1px solid rgba(0,255,157,.25)', borderRadius:8, color:'var(--accent3)' }}>
                🔑 Key authenticated &nbsp;·&nbsp; {modalSigStatus.sigValid ? '✅ Signature verified' : '⚠️ Signature mismatch'} &nbsp;·&nbsp; {modalSigStatus.integrityOk ? '✅ Integrity OK' : '⚠️ Hash mismatch'}
              </div>
            )}

            <div style={{ display:'flex', gap:12, marginTop:16 }}>
              <Button variant="outline" onClick={() => setModal(false)} style={{ flex:1 }}>Cancel</Button>
              <Button variant="purple" loading={modalLoading} onClick={confirmDecrypt} style={{ flex:2 }}>🔓 Verify & Decrypt</Button>
            </div>
            <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', marginTop:14 }}>Your private key never leaves your browser.</p>
          </div>
        </div>
      )}
    </div>
  );
}
