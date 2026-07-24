import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, User } from "../api/client";

type AuthState = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("aimp_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get<User>("/api/auth/me");
        setUser(data);
      } catch {
        localStorage.removeItem("aimp_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading,
      async login(email, password) {
        const { data } = await api.post<{ access_token: string }>("/api/auth/login", {
          email,
          password,
        });
        localStorage.setItem("aimp_token", data.access_token);
        setToken(data.access_token);
        const me = await api.get<User>("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        setUser(me.data);
      },
      logout() {
        localStorage.removeItem("aimp_token");
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
