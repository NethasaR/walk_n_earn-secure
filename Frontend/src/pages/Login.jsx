import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Display user-friendly message if redirected back from a failed OAuth attempt
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get("error");
    if (error) {
      const errorMessages = {
        google_auth_cancelled: "Google sign-in was cancelled.",
        invalid_state: "Sign-in session expired or was invalid. Please try again.",
        session_expired: "Sign-in session expired. Please try again.",
        auth_failed: "Google sign-in failed. Please try again.",
        auth_init_failed: "Could not connect to Google. Please try again.",
      };
      setMessage(errorMessages[error] || "Authentication failed. Please try again.");
    }
  }, [location.search]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        setLoading(false);
        return;
      }

      login(data.user);
      localStorage.setItem("walknEarnToken", data.token);
      setLoading(false);
      navigate("/app/walk");
    } catch (error) {
      setMessage("Something went wrong while logging in");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f1e6",
        padding: "24px 16px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <button
              onClick={() => navigate("/")}
              style={{
                border: "none",
                background: "#eee",
                borderRadius: "10px",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              ← Home
            </button>

            <span style={{ fontWeight: "700" }}>Walk n Earn</span>
          </div>

          <div style={{ textAlign: "center", marginBottom: "26px" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                margin: "0 auto 14px auto",
                borderRadius: "20px",
                backgroundColor: "#edaf5e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              🚶
            </div>

            <h1 style={{ margin: 0, fontSize: "28px", color: "#222" }}>
              Welcome Back
            </h1>
            <p style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
              Login and continue your walking journey
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #ddd",
                  fontSize: "15px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #ddd",
                  fontSize: "15px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: "#edaf5e",
                color: "#222",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "18px 0",
              gap: "12px",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#eee" }} />
            <span style={{ color: "#999", fontSize: "13px" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#eee" }} />
          </div>

          {/* Google Sign-In Button */}
          {/* Clicking this navigates to the backend OIDC initiation endpoint. */}
          {/* No client secret is ever present in frontend code. */}
          <button
            id="google-signin-btn"
            type="button"
            disabled={googleLoading}
            onClick={() => {
              setGoogleLoading(true);
              window.location.href = `${API_URL}/auth/google`;
            }}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "14px",
              border: "1px solid #ddd",
              backgroundColor: "#fff",
              color: "#333",
              fontSize: "15px",
              fontWeight: "600",
              cursor: googleLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              transition: "box-shadow 0.2s",
              opacity: googleLoading ? 0.7 : 1,
            }}
          >
            {/* Google 'G' logo SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </button>

          {message && (
            <p
              style={{
                marginTop: "12px",
                textAlign: "center",
                color: "red",
                fontSize: "14px",
              }}
            >
              {message}
            </p>
          )}

          <p style={{ marginTop: "14px", textAlign: "center", fontSize: "14px" }}>
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              style={{
                color: "#edaf5e",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;