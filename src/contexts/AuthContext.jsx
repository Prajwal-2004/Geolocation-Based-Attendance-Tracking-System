import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, loginUser, logoutUser, registerUser, seedDefaultAdmin } from '@/lib/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    seedDefaultAdmin();
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = (email, password) => {
    const u = loginUser(email, password);
    setUser(u);
    return u;
  };

  const register = (data, password) => {
    const u = registerUser(data, password);
    setUser(u);
    return u;
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
