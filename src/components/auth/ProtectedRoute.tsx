import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const user = localStorage.getItem('mcm_user');

  // Mode développement - autoriser l'accès sans login
  const isDev = import.meta.env.DEV;
  
  if (!user && !isDev) {
    // Redirect to login page, but save the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function useAuth() {
  const userStr = localStorage.getItem('mcm_user');
  
  if (!userStr) {
    return { user: null, isAuthenticated: false };
  }

  try {
    const user = JSON.parse(userStr);
    return { user, isAuthenticated: true };
  } catch {
    return { user: null, isAuthenticated: false };
  }
}

export function logout() {
  localStorage.removeItem('mcm_user');
  window.location.href = '/login';
}
