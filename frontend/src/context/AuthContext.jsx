import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

const initialState = {
  user:    JSON.parse(localStorage.getItem('lexcrypt_user') || 'null'),
  token:   localStorage.getItem('lexcrypt_token') || null,
  loading: false,
  error:   null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload, error: null };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('lexcrypt_token', action.payload.token);
      localStorage.setItem('lexcrypt_user', JSON.stringify(action.payload.user));
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
    case 'UPDATE_USER':
      const updated = { ...state.user, ...action.payload };
      localStorage.setItem('lexcrypt_user', JSON.stringify(updated));
      return { ...state, user: updated };
    case 'LOGOUT':
      localStorage.removeItem('lexcrypt_token');
      localStorage.removeItem('lexcrypt_user');
      return { user: null, token: null, loading: false, error: null };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    default: return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Rehydrate user from token on mount
  useEffect(() => {
    if (state.token && !state.user) {
      authAPI.getMe()
        .then(res => dispatch({ type: 'UPDATE_USER', payload: res.data.user }))
        .catch(() => dispatch({ type: 'LOGOUT' }));
    }
  }, []);

  const login = useCallback(async (identifier, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const res = await authAPI.login({ identifier, password });
    dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
    return res.data;
  }, []);

  const signup = useCallback(async (data) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const res = await authAPI.signup(data);
    dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
    return res.data;
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((data) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
  }, []);

  const saveKeys = useCallback(async (data) => {
    const res = await authAPI.saveKeys(data);
    dispatch({ type: 'UPDATE_USER', payload: res.data.user });
    return res.data;
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, updateUser, saveKeys }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
