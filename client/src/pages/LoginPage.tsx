import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // If already logged in, send to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Check for error param
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            hsl(var(--primary)) 0px,
            hsl(var(--primary)) 1px,
            transparent 1px,
            transparent 40px
          )`,
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-primary px-8 py-6 text-center">
            {/* Truck + wordmark */}
            <div className="flex items-center justify-center gap-3 mb-1">
              <svg
                viewBox="0 0 36 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-9 h-6"
                aria-label="Trucker's Direct logo"
              >
                <rect x="0" y="6" width="22" height="14" rx="1.5" fill="white" opacity="0.9" />
                <path d="M22 9h8l4 6v5h-12V9z" fill="white" opacity="0.75" />
                <circle cx="6" cy="21" r="3" fill="hsl(var(--primary))" stroke="white" strokeWidth="1.5" />
                <circle cx="17" cy="21" r="3" fill="hsl(var(--primary))" stroke="white" strokeWidth="1.5" />
                <circle cx="29" cy="21" r="3" fill="hsl(var(--primary))" stroke="white" strokeWidth="1.5" />
                <rect x="3" y="10" width="8" height="5" rx="0.75" fill="hsl(var(--primary))" opacity="0.4" />
                <rect x="24" y="11" width="5" height="4" rx="0.5" fill="hsl(var(--primary))" opacity="0.3" />
              </svg>
              <span className="text-white text-xl font-bold tracking-tight">
                Trucker's Direct
              </span>
            </div>
            <p className="text-white/70 text-sm font-medium tracking-wide uppercase">
              Bookkeeping & Compliance
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-8 text-center">
            <h1 className="text-foreground text-xl font-semibold mb-2">
              Sign in to your account
            </h1>
            <p className="text-muted-foreground text-sm mb-8">
              Access is restricted to{" "}
              <span className="font-medium text-foreground">@truckersdirect.net</span>{" "}
              Google Workspace accounts.
            </p>

            {/* Error message */}
            {error === "unauthorized" && (
              <div className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-left">
                <strong>Access denied.</strong> Only @truckersdirect.net accounts can sign in.
                Make sure you're using your work Google account.
              </div>
            )}

            {/* Google sign-in button */}
            <a
              href="/auth/google"
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-border rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-150 no-underline"
              data-testid="button-google-signin"
            >
              {/* Google "G" logo */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </a>

            <p className="mt-6 text-xs text-muted-foreground">
              By signing in, you agree to keep client data confidential.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 opacity-60">
          Trucker's Direct &copy; {new Date().getFullYear()} &mdash; Internal use only
        </p>
      </div>
    </div>
  );
}
