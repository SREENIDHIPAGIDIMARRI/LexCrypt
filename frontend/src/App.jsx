import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MatrixCanvas, Navbar, ProtectedRoute } from './components/layout';

import Landing    from './pages/Landing';
import Signup     from './pages/Signup';
import Login      from './pages/Login';
import Vault      from './pages/Vault';
import Upload     from './pages/Upload';
import Crypto     from './pages/Crypto';
import Signatures from './pages/Signatures';

import './styles/globals.css';

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <MatrixCanvas />
      <Navbar />
      <Routes>
        <Route path="/"           element={<Landing />} />
        <Route path="/signup"     element={user ? <Navigate to="/vault" /> : <Signup />} />
        <Route path="/login"      element={user ? <Navigate to="/vault" /> : <Login />} />
        <Route path="/vault"      element={<ProtectedRoute><Vault /></ProtectedRoute>} />
        <Route path="/upload"     element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/crypto"     element={<ProtectedRoute><Crypto /></ProtectedRoute>} />
        <Route path="/signatures" element={<ProtectedRoute><Signatures /></ProtectedRoute>} />
        <Route path="*"           element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background:'var(--card)', color:'var(--text)', border:'1px solid var(--border)', fontFamily:"'Outfit',sans-serif", fontSize:14 },
            success: { iconTheme: { primary:'var(--accent3)', secondary:'#000' } },
            error:   { iconTheme: { primary:'var(--danger)',  secondary:'#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
