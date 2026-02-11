import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { getCurrentUser, loginUser, logoutUser, registerUser, seedDefaultAdmin } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => User;
  register: (data: Omit<User, 'id' | 'createdAt'>, password: string) => User;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    seedDefaultAdmin();
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    const u = loginUser(email, password);
    setUser(u);
    return u;
  };

  const register = (data: Omit<User, 'id' | 'createdAt'>, password: string) => {
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
