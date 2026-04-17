import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refreshUser = async () => {
    const token = localStorage.getItem("agri_token");
    if (!token) {
      setUser(null);
      setReady(true);
      return null;
    }

    try {
      const nextUser = await api("/auth/me");
      setUser(nextUser);
      return nextUser;
    } catch {
      localStorage.removeItem("agri_token");
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = ({ token, user: nextUser }) => {
    localStorage.setItem("agri_token", token);
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem("agri_token");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, ready, login, logout, refreshUser, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
