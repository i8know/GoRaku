import { Navigate, type RouteObject } from "react-router-dom";

export function ProtectedRoute<P = any, S = any, E = any>(component: any, authenticated: boolean) {
  return authenticated ? component : <Navigate to="/login" replace state={{ from: component }} />;
}