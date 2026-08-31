import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Wraps protected routes. Redirects to /login if not authenticated.
// Redirects to /deactivated if the account is deactivated.
export default function ProtectedRoute({ children }) {
  const { user, loading, isDeactivated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="route-loading">
        <div className="route-loading__spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow access to the deactivated page itself, but redirect all other
  // protected routes when the account is deactivated.
  if (isDeactivated && location.pathname !== "/deactivated") {
    return <Navigate to="/deactivated" replace />;
  }

  return children;
}
