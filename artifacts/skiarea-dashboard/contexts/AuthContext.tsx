import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { changePassword, getCurrentUser, setAuthTokenGetter } from "@workspace/api-client-react";
import type { AuthUser as ApiAuthUser } from "@workspace/api-client-react";

const TOKEN_KEY = "auth_token";
const USER_KEY  = "auth_user";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export type AuthUser = ApiAuthUser;

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  /** True until the stored session has been checked at startup. */
  isLoading: boolean;
  /** True only when a token exists AND the account was verified by the server. */
  isAuthenticated: boolean;
  /** Token exists but the server could not be reached to verify it. */
  sessionError: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch /auth/me. Returns false on network failure. */
  refreshSession: () => Promise<boolean>;
  changeOwnPassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function errStatus(e: unknown): number | undefined {
  return typeof e === "object" && e !== null && "status" in e ? (e as { status?: number }).status : undefined;
}

export function isPasswordChangeRequiredError(e: unknown): boolean {
  if (errStatus(e) !== 403) return false;
  const data = (e as { data?: unknown }).data;
  return typeof data === "object" && data !== null && (data as { code?: unknown }).code === "PASSWORD_CHANGE_REQUIRED";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const refreshing = useRef<Promise<boolean> | null>(null);

  const applySession = useCallback(async (newToken: string, newUser: AuthUser) => {
    const changed = tokenRef.current !== newToken;
    await AsyncStorage.multiSet([[TOKEN_KEY, newToken], [USER_KEY, JSON.stringify(newUser)]]);
    tokenRef.current = newToken;
    setAuthTokenGetter(() => newToken);
    if (changed) queryClient.clear();
    setToken(newToken);
    setUser(newUser);
    setSessionError(false);
  }, [queryClient]);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    setAuthTokenGetter(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    queryClient.clear();
    setToken(null);
    setUser(null);
    setSessionError(false);
  }, [queryClient]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshing.current) return refreshing.current;
    const run = (async () => {
      const current = tokenRef.current;
      if (!current) return true;
      try {
        const me = await getCurrentUser();
        if (tokenRef.current !== current) return true;
        await applySession(current, me);
        return true;
      } catch (e) {
        if (tokenRef.current !== current) return true;
        const status = errStatus(e);
        if (status === 401 || status === 403) { await clearSession(); return true; }
        setSessionError(true);
        return false;
      }
    })();
    refreshing.current = run;
    try { return await run; } finally { refreshing.current = null; }
  }, [applySession, clearSession]);

  // Startup: never trust cached auth_user; verify token with the server.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          tokenRef.current = storedToken;
          setAuthTokenGetter(() => storedToken);
          setToken(storedToken);
          await refreshSession();
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [refreshSession]);

  // React to server-side flag changes during the session.
  useEffect(() => {
    const onError = (error: unknown) => {
      if (isPasswordChangeRequiredError(error)) void refreshSession();
      else if (errStatus(error) === 401 && tokenRef.current) void refreshSession();
    };
    const unsubQ = queryClient.getQueryCache().subscribe((ev) => {
      if (ev.type === "updated" && ev.action.type === "error") onError(ev.action.error);
    });
    const unsubM = queryClient.getMutationCache().subscribe((ev) => {
      if (ev.type === "updated" && ev.action.type === "error") onError(ev.action.error);
    });
    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active" && tokenRef.current) void refreshSession();
    });
    return () => { unsubQ(); unsubM(); appSub.remove(); };
  }, [queryClient, refreshSession]);

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
    await applySession(data.token, { ...data.user, mustChangePassword: data.user.mustChangePassword === true });
  }

  async function changeOwnPassword(currentPassword: string | undefined, newPassword: string): Promise<void> {
    const result = await changePassword({ currentPassword, newPassword });
    await applySession(result.token, result.user);
  }

  const verified = !!token && !!user && !sessionError;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: verified,
        sessionError: !!token && sessionError,
        mustChangePassword: verified && !!user?.mustChangePassword,
        login,
        logout: clearSession,
        refreshSession,
        changeOwnPassword,
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
