// AUTH TEMPORARILY DISABLED FOR QA
// Re-enable by restoring the full ProtectedRoute implementation
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
