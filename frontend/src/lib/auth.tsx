"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch, clearTokens, getTokens, setTokens } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (
    credential: string,
  ) => Promise<LoginResponse & { created: boolean }>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  /** True right after an explicit sign-out, so route guards don't bounce the
   *  user to /login while the caller navigates them elsewhere. */
  signedOut: boolean;
  refreshUser: () => Promise<void>;
}

interface RegisterInput {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getTokens()) {
      setUser(null);
      return;
    }
    // Only a real auth failure ends the session. A dropped connection, an
    // aborted request (fast navigation) or a server hiccup must not sign the
    // member out, so retry those a couple of times and keep the tokens.
    for (const wait of [0, 800, 2000]) {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      try {
        setUser(await apiFetch<User>("/auth/me/"));
        return;
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          clearTokens();
          setUser(null);
          return;
        }
      }
    }
    setUser(null); // still unreachable: show signed-out UI, keep the tokens
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      await refreshUser();
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>("/auth/login/", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    setTokens({ access: data.access, refresh: data.refresh });
    setSignedOut(false);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await apiFetch("/auth/register/", {
      method: "POST",
      auth: false,
      body: input,
    });
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const data = await apiFetch<LoginResponse & { created: boolean }>(
      "/auth/google/",
      { method: "POST", auth: false, body: { credential } },
    );
    setTokens({ access: data.access, refresh: data.refresh });
    setSignedOut(false);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setSignedOut(true);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      signedOut,
      refreshUser,
    }),
    [user, loading, login, loginWithGoogle, register, logout, signedOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
