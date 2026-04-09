import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lexcrypt_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lexcrypt_token');
      localStorage.removeItem('lexcrypt_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/* ── Auth ── */
export const authAPI = {
  signup:   (d) => api.post('/auth/signup', d),
  login:    (d) => api.post('/auth/login', d),
  getMe:    ()  => api.get('/auth/me'),
  saveKeys: (d) => api.put('/auth/keys', d),
};

/* ── Vault files ── */
export const vaultAPI = {
  upload:     (d)     => api.post('/vault/upload', d),
  listFiles:  ()      => api.get('/vault/files'),
  decrypt:    (id, d) => api.post(`/vault/decrypt/${id}`, d),
  deleteFile: (id)    => api.delete(`/vault/files/${id}`),
};

/* ── Text crypto sessions ── */
export const cryptoAPI = {
  encryptText:   (d)  => api.post('/crypto/encrypt', d),
  decryptText:   (d)  => api.post('/crypto/decrypt', d),
  listSessions:  ()   => api.get('/crypto/sessions'),
  getSession:    (id) => api.get(`/crypto/sessions/${id}`),
  deleteSession: (id) => api.delete(`/crypto/sessions/${id}`),
};

/* ── Signatures ── */
export const sigAPI = {
  sign:   (d)  => api.post('/signatures/sign', d),
  verify: (d)  => api.post('/signatures/verify', d),
  list:   ()   => api.get('/signatures'),
  delete: (id) => api.delete(`/signatures/${id}`),
};

export default api;
