import { createContext, useContext, useState, useEffect } from "react";
import { getStoredUser, setStoredUser, setAuthToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth-logout", onLogout);
    return () => window.removeEventListener("auth-logout", onLogout);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    setStoredUser(userData);
    setAuthToken(token);
  };

  const logout = () => {
    setUser(null);
    setStoredUser(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
