# 🔐 LexCrypt — Full-Stack Cryptography Vault

> Military-grade AES-256 encryption, RSA key pairs, SHA-256 digital signatures — built with React.js + Node.js + Express + MongoDB.

---

## 🚀 Features
🔐 AES-256 Encryption – Secure sensitive data
✍️ RSA-2048 Digital Signatures – Identity verification
🧾 SHA-256 Hashing – Tamper detection
📁 Secure file upload & vault system
🔑 Authentication system (Login / Signup)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Axios, Framer Motion, react-hot-toast |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose ODM |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Encryption (server) | Node.js `crypto` — AES-256-CBC, PBKDF2-SHA256 |
| Encryption (client) | Web Crypto API — AES-CBC, PBKDF2, SHA-256 |
| Security | Helmet.js, CORS, express-rate-limit, express-validator |

---
## 🏗️ Architecture

```
lexcrypt/
├── backend/                  ← Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── server.js         ← Entry point
│   │   ├── app.js            ← Express app (CORS, Helmet, rate limiting)
│   │   ├── config/
│   │   │   └── db.js         ← Mongoose connection
│   │   ├── models/
│   │   │   ├── user.model.js       ← User schema (bcrypt password hashing)
│   │   │   ├── vaultFile.model.js  ← Encrypted file records
│   │   │   └── signature.model.js  ← Digital signature records
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  ← JWT Bearer token verification
│   │   ├── controllers/
│   │   │   ├── auth.controller.js       ← Signup, login, getMe, saveKeys
│   │   │   ├── vault.controller.js      ← Upload, list, decrypt, delete
│   │   │   ├── crypto.controller.js     ← Text encrypt/decrypt
│   │   │   └── signature.controller.js  ← Sign, verify, list, delete
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── vault.routes.js
│   │   │   ├── crypto.routes.js
│   │   │   └── signature.routes.js
│   │   └── utils/
│   │       ├── crypto.utils.js   ← AES-256-CBC, PBKDF2, SHA-256, signatures
│   │       └── jwt.utils.js      ← Token signing + response helper
│   ├── uploads/              ← Static file storage
│   ├── .env.example
│   └── package.json
│
└── frontend/                 ← React.js SPA
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── index.js          ← ReactDOM entry
    │   ├── App.jsx           ← Router + AuthProvider + Toaster
    │   ├── api/
    │   │   └── index.js      ← Axios instance + JWT interceptor + all API calls
    │   ├── context/
    │   │   └── AuthContext.jsx  ← Global auth state (useReducer)
    │   ├── utils/
    │   │   └── crypto.js     ← Client-side AES-256-CBC, SHA-256, key generation
    │   ├── components/
    │   │   ├── ui/index.jsx       ← Button, Input, Card, Badge, Alert, Spinner…
    │   │   └── layout/index.jsx   ← MatrixCanvas, Navbar, ProtectedRoute
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── Signup.jsx
    │   │   ├── Login.jsx
    │   │   ├── Vault.jsx        ← 4-step key wizard
    │   │   ├── Upload.jsx       ← File encrypt/vault/decrypt with modal auth
    │   │   ├── Crypto.jsx       ← Text encrypt/decrypt via API
    │   │   └── Signatures.jsx   ← Sign, verify, log via API
    │   └── styles/
    │       └── globals.css
    ├── .env
    └── package.json
```

---

## 🔒 Security Architecture

| Layer | What's protected | How |
|---|---|---|
| **Transport** | All API calls | HTTPS (production) + CORS whitelist |
| **Authentication** | Every protected route | JWT Bearer tokens (7-day expiry) |
| **Passwords** | User passwords in DB | bcrypt (12 rounds) |
| **Rate Limiting** | All routes | 200 req/15min global; 20 req/15min auth |
| **Headers** | XSS, clickjacking etc. | Helmet.js |
| **File Encryption** | Files in MongoDB | AES-256-CBC, PBKDF2-SHA256, random IV per file |
| **Integrity** | Every vault file | SHA-256 hash stored at encrypt time, verified at decrypt time |
| **Authentication** | File decryption | Private key required, normalised comparison |
| **Non-repudiation** | Vault files | SHA-256(hash:userId:fileId) digital signature |
| **Private keys** | User's private key | **Never sent to server** — session-only (sessionStorage) |

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### 1. Backend Setup

```bash
cd lexcrypt/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/lexcrypt
#   JWT_SECRET=your_minimum_32_char_secret_here
#   PORT=5000

# Start development server
npm run dev
# → LexCrypt Backend running on port 5000
# → MongoDB: connected
```

### 2. Frontend Setup

```bash
cd lexcrypt/frontend

# Install dependencies
npm install

# Start React development server
npm start
# → Opens http://localhost:3000
```

### 3. MongoDB Atlas (Production)

Replace `MONGO_URI` in `.env` with your Atlas connection string:
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/lexcrypt?retryWrites=true&w=majority
```

---


## ⚡ Cryptographic Flow

### File Encryption
```
User uploads file
  → FileReader reads bytes as base64
  → SHA-256(base64) computed client-side → stored as integrity hash
  → AES secret = PBKDF2-SHA256(publicKey, salt, 100000 iterations)
  → AES-256-CBC encrypts base64 with random IV
  → { cipherText, iv, sha256Hash } sent to backend API (JWT auth)
  → Backend generates digital signature: SHA-256(hash:userId:fileId)
  → All stored in MongoDB VaultFile document
```

### File Decryption
```
User clicks Decrypt
  → Private key modal opens, shows SHA-256 fingerprint + digital signature
  → User enters private key
  → Frontend: normaliseKey(input) === normaliseKey(sessionPrivKey)  ← auth check
  → POST /api/vault/decrypt/:id { privateKey }
  → Backend: verifySignature(hash, userId, fileId, storedSig)  ← sig check
  → Backend: AES-256-CBC decrypt with stored keySecret
  → Backend: SHA-256(decrypted) === storedHash  ← integrity check
  → { decryptedContent, sigValid, integrityOk } returned
  → Client reconstructs file bytes, shows preview + download
```

### Text Encryption (Crypto page)
```
POST /api/crypto/encrypt { plainText, publicKey }
  → Server: secret = SHA-256(publicKey)
  → Server: { cipherText, iv } = AES-256-CBC(plainText, PBKDF2(secret))
  → Server stores keySecret on user document
  → Returns { cipherText, iv, sha256, algorithm }

POST /api/crypto/decrypt { cipherText, iv, privateKey }
  → Server retrieves keySecret from user.keySecret
  → Server: AES-256-CBC decrypt
  → Returns { plainText }
```

---


## 📡 API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/signup` | ❌ | `{ firstName, lastName, username, email, password }` | Register new user |
| POST | `/login` | ❌ | `{ identifier, password }` | Login, returns JWT |
| GET | `/me` | ✅ JWT | — | Get current user |
| PUT | `/keys` | ✅ JWT | `{ publicKey, keySecret, vaultName }` | Save vault keys |

### Vault — `/api/vault`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/upload` | ✅ JWT | `{ originalName, mimeType, size, cipherText, iv, sha256Hash, publicKey }` | Upload encrypted file |
| GET | `/files` | ✅ JWT | — | List all vault files (no cipherText) |
| POST | `/decrypt/:id` | ✅ JWT | `{ privateKey }` | Decrypt a vault file |
| DELETE | `/files/:id` | ✅ JWT | — | Delete vault file |

### Crypto — `/api/crypto`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/encrypt` | ✅ JWT | `{ plainText, publicKey }` | AES-256 encrypt text |
| POST | `/decrypt` | ✅ JWT | `{ cipherText, iv, privateKey }` | AES-256 decrypt text |

### Signatures — `/api/signatures`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/sign` | ✅ JWT | `{ content, label }` | SHA-256 sign document |
| POST | `/verify` | ✅ JWT | `{ content, hash }` | Verify SHA-256 hash |
| GET | `/` | ✅ JWT | — | List all signatures |
| DELETE | `/:id` | ✅ JWT | — | Delete signature |

---



## 🗒️ Notes

- **Private keys are never sent to the server.** They live only in `sessionStorage` during the browser session. Once you close the tab, they're gone — save them!
- **The AES key** is derived from `SHA-256(publicKey)` via PBKDF2 with 100,000 iterations and a fixed salt. Both frontend and backend use the same derivation so they always produce the same AES key.
- **Each file gets a unique random IV** for AES-CBC — even encrypting the same file twice produces different ciphertext.
