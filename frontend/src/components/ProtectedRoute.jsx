import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function ProtectedRoute({ role, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <main className="page">
        <section className="panel">
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/access-denied" replace />;
  }

  if (
    role &&
    role !== "admin" &&
    user.profileComplete === false &&
    !location.pathname.includes("/profile") &&
    !location.pathname.includes("/fprofile") &&
    !location.pathname.includes("/cprofile")
  ) {
    return <Navigate to={role === "farmer" ? "/farmer/fprofile" : "/customer/cprofile"} replace />;
  }

  return children;
}
