import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE } from '../config/api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  loginMethod: 'email' | 'google';
}

export interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseError = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json();
    return payload.error || payload.message || fallback;
  } catch {
    return fallback;
  }
};

const fetchWithNetworkMessage = async (url: string, init: RequestInit) => {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error('Cannot reach backend API. Please ensure backend is running.');
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    }
  }, []);

  const persistSession = (data: any, loginMethod: 'email' | 'google') => {
    const newUser: User = {
      id: String(data.userId),
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      loginMethod,
    };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('authToken', data.token);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetchWithNetworkMessage(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Login failed'));
      }

      const data = await response.json();
      persistSession(data, 'email');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await fetchWithNetworkMessage(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Signup failed'));
      }

      const data = await response.json();
      persistSession(data, 'email');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetchWithNetworkMessage(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response, 'Google login failed'));
      }

      const data = await response.json();
      persistSession(data, 'google');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: user !== null,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
