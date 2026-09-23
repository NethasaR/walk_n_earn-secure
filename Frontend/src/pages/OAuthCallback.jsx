import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * OAuthCallback.jsx
 *
 * Handles the redirect from the backend after a successful Google OIDC
 * authentication. Reads the JWT token and user data from the URL query
 * parameters, stores them in the application's auth context and localStorage
 * (consistent with the existing login mechanism), then clears the token
 * from the URL using history.replaceState before navigating to the app.
 *
 * Security note: The token appears in the URL momentarily during this redirect.
 * It is immediately removed from the URL before navigation to prevent it
 * from appearing in browser history or server logs.
 *
 * Author: Viman (SE4030 Individual Contribution — OAuth/OIDC)
 */
function OAuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // --- Check for error response from backend ---
    const error = params.get("error");
    if (error) {
      const errorMessages = {
        google_auth_cancelled: "Google sign-in was cancelled. Please try again.",
        invalid_state: "Authentication request was invalid or expired. Please try again.",
        session_expired: "Authentication session expired. Please try again.",
        invalid_token: "Could not verify your Google identity. Please try again.",
        email_not_verified: "Your Google email address is not verified.",
        auth_init_failed: "Could not connect to Google. Please try again.",
        auth_failed: "Authentication failed. Please try again.",
      };
      setErrorMessage(errorMessages[error] || "Authentication failed. Please try again.");
      return;
    }

    // --- Read token and user from URL ---
    const token = params.get("token");
    const encodedUser = params.get("user");

    if (!token || !encodedUser) {
      setErrorMessage("Authentication failed: missing credentials. Please try again.");
      return;
    }

    // --- Decode user payload ---
    let user;
    try {
      user = JSON.parse(atob(encodedUser.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      setErrorMessage("Authentication failed: invalid credentials. Please try again.");
      return;
    }

    // --- Clear token from URL immediately (security measure) ---
    // This prevents the token from persisting in browser history
    window.history.replaceState({}, document.title, window.location.pathname);

    // --- Store auth data (consistent with existing login mechanism) ---
    localStorage.setItem("walknEarnToken", token);
    login(user);

    // --- Navigate to the main app ---
    navigate("/app/walk", { replace: true });
  }, [navigate, login]);

  // Show error state
  if (errorMessage) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f1e6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "24px",
            padding: "32px 24px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
            textAlign: "center",
            maxWidth: "400px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "20px", color: "#222" }}>
            Sign-In Failed
          </h2>
          <p style={{ color: "#666", fontSize: "14px", margin: "0 0 24px 0" }}>
            {errorMessage}
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "12px 24px",
              borderRadius: "14px",
              border: "none",
              backgroundColor: "#edaf5e",
              color: "#222",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while processing
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f1e6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ fontSize: "40px" }}>🔐</div>
      <p style={{ color: "#555", fontSize: "16px", fontWeight: "600" }}>
        Completing sign-in…
      </p>
    </div>
  );
}

export default OAuthCallback;
