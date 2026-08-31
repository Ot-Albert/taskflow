import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Wraps protected routes. Enforces the full authentication state machine:
//   - Not authenticated → /login
//   - Password verified but awaiting email code → /verify-login
//   - Deactivated → /deactivated
//   - Fully verified → allow access
export default function ProtectedRoute({ children, requireVerified = true }) {
  const { user, loading, authState, isDeactivated } = useAuth();
  const location = useLocation();

  if (loading || authState === "loading") {
    return (
      <div className="route-loading">
        <div className="route-loading__spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user has completed password auth but not the email code,
  // redirect to the verification page.
  if (
    requireVerified &&
    (authState === "password_verified" || authState === "awaiting_email_code")
  ) {
    return (
      <Navigate
        to="/verify-login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Deactivated accounts are redirected to the reactivation page,
  // except when already on that page.
  if (isDeactivated && location.pathname !== "/deactivated") {
    return <Navigate to="/deactivated" replace />;
  }

  // For routes that require full verification (like /app), block access
  // if not fully verified.
  if (requireVerified && authState !== "fully_verified" && authState !== "deactivated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
