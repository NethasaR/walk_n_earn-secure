import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Walk from "./pages/Walk";
import Rewards from "./pages/Rewards";
import Leaderboard from "./pages/Leaderboard";
import AppAbout from "./pages/AppAbout";
import Admin from "./pages/Admin";
import AdminLeaderboard from "./pages/AdminLeaderboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import { useAuth } from "./context/AuthContext";
import AdminRoute from "./components/AdminRoute";
import Weather from "./pages/Weather";
import OAuthCallback from "./pages/OAuthCallback";

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/app/walk" replace /> : <Landing />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/app/walk" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/app/walk" replace /> : <Signup />}
        />
        <Route path="/about" element={<About />} />
        {/* OAuth/OIDC callback route — receives JWT from backend after Google auth */}
        <Route path="/auth/callback" element={<OAuthCallback />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/walk" replace />} />
          <Route path="walk" element={<Walk />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="weather" element={<Weather />} />
          <Route path="about" element={<AppAbout />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="admin-leaderboard"
            element={
              <AdminRoute>
                <AdminLeaderboard />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;