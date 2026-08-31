import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyLoginPage from "./pages/VerifyLoginPage";
import TaskApp from "./pages/TaskApp";
import AccountDeactivated from "./pages/AccountDeactivated";
import ProtectedRoute from "./components/ProtectedRoute";

// Redirect authenticated users away from auth pages.
function PublicOnlyRoute({ children }) {
  const { user, loading, authState } = useAuth();
  if (loading || authState === "loading") {
    return (
      <div className="route-loading">
        <div className="route-loading__spinner" aria-label="Loading" />
      </div>
    );
  }
  if (user && authState === "fully_verified") return <Navigate to="/app" replace />;
  if (user && authState === "awaiting_email_code") return <Navigate to="/verify-login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/verify-login"
        element={
          <ProtectedRoute requireVerified={false}>
            <VerifyLoginPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deactivated"
        element={
          <ProtectedRoute requireVerified={false}>
            <AccountDeactivated />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <TaskApp />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
