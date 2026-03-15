import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get(`/invitations/by-token/${token}`)
      .then(({ data }) => setInvitation(data.invitation))
      .catch(() => setError("Invitation not found or expired"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!user) {
      navigate(`/register?redirect=/invite/${token}`, { replace: true });
      return;
    }
    setAccepting(true);
    setError("");
    try {
      await api.post("/invitations/accept", { token });
      navigate(`/tree/${invitation.treeId}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Could not accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <div style={styles.page}><p>Loading invitation...</p></div>;
  if (error && !invitation) return <div style={styles.page}><p style={styles.error}>{error}</p><Link to="/">Go to dashboard</Link></div>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>You&apos;re invited</h1>
        {invitation && (
          <>
            <p style={styles.text}>
              <strong>{invitation.invitedBy}</strong> invited you to the family tree &quot;{invitation.treeName}&quot; as <strong>{invitation.role}</strong>.
            </p>
            {error && <p style={styles.error}>{error}</p>}
            {!user ? (
              <p style={styles.text}>
                <Link to={`/login?redirect=/invite/${token}`}>Sign in</Link> or <Link to={`/register?redirect=/invite/${token}`}>create an account</Link> to accept.
              </p>
            ) : (
              <Button type="button" variant="primary" onClick={handleAccept} disabled={accepting} loading={accepting} loadingLabel="Accepting...">
                Accept invitation
              </Button>
            )}
          </>
        )}
        <p style={styles.footer}><Link to="/">Back to dashboard</Link></p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { maxWidth: 420, width: "100%", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
  title: { margin: "0 0 16px", fontSize: 22 },
  text: { margin: "0 0 16px", color: "#374151" },
  error: { color: "#b91c1c", marginBottom: 16 },
  footer: { marginTop: 24, fontSize: 14 },
};
