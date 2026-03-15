import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.user, data.token);
      navigate(redirect || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Family Tree</h1>
        <p style={styles.subtitle}>Sign in to your account</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            autoComplete="current-password"
          />
          <Button type="submit" variant="primary" disabled={loading} loading={loading} loadingLabel="Signing in...">
            Sign in
          </Button>
        </form>
        <p style={styles.footer}>
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    background: "#fff",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  title: { margin: "0 0 4px", fontSize: 24, fontWeight: 700 },
  subtitle: { margin: "0 0 24px", color: "#666", fontSize: 14 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  error: { background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, fontSize: 14 },
  input: {
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 16,
  },
  footer: { marginTop: 20, textAlign: "center", fontSize: 14, color: "#666" },
};
