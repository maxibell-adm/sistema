import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { carregarUsuarios } from '@/config/usuarios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const salvo = localStorage.getItem('maxibell.usuario');
    const perfil = carregarUsuarios().find((u) => u.id === salvo && u.ativo);
    if (perfil) setUsuario(perfil);
  }, []);

  function login(id, usuarioCompleto = null) {
    const perfil = usuarioCompleto || carregarUsuarios().find((u) => u.id === id && u.ativo);
    if (!perfil) return false;
    setUsuario(perfil);
    localStorage.setItem('maxibell.usuario', perfil.id);
    return true;
  }

  function logout() {
    setUsuario(null);
    localStorage.removeItem('maxibell.usuario');
  }

  const value = useMemo(() => ({ usuario, login, logout }), [usuario]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


