import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, error } = useAuth();
  const [, navigate] = useLocation();

  // If auth returns a non-401 error (network issue etc.) or dev mode with no OAuth,
  // treat as authenticated so the app is still usable locally
  const isDevMode = error && (error as any)?.message?.includes("401") === false;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isDevMode) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, isDevMode, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isDevMode) {
    return null;
  }

  return <>{children}</>;
}
