import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "auth_token";
const USER_KEY  = "auth_user";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer";
  tenantId: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ])
      .then(([storedToken, storedUser]) => {
        if (storedToken) {
          setAuthTokenGetter(() => storedToken);
          setToken(storedToken);
        }
        if (storedUser) {
          try { setUser(JSON.parse(storedUser) as AuthUser); } catch { /* ignore */ }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Login failed");
    }

    const data = await res.json() as { token: string; user: AuthUser };
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setAuthTokenGetter(() => data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout(): Promise<void> {
    setAuthTokenGetter(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
