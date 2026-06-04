import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import SQLiteStore from "connect-sqlite3";
import type { Express, Request, Response, NextFunction } from "express";
import path from "path";

const ALLOWED_DOMAIN = "truckersdirect.net";

// Session user shape
declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      name: string;
      picture: string;
    };
  }
}

export function setupAuth(app: Express) {
  const SQLiteStoreSession = SQLiteStore(session);

  // ─── Session middleware ───────────────────────────────────────────────
  app.use(
    session({
      store: new SQLiteStoreSession({
        db: "sessions.db",
        dir: process.env.DATA_DIR || ".",
      }) as any,
      secret: process.env.SESSION_SECRET || "truckers-direct-dev-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
      },
    })
  );

  // ─── Passport setup ──────────────────────────────────────────────────
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize / deserialize — store minimal user in session
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // Only configure Google strategy if credentials are present
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
        },
        (_accessToken, _refreshToken, profile, done) => {
          const email = profile.emails?.[0]?.value || "";
          const domain = email.split("@")[1] || "";

          if (domain !== ALLOWED_DOMAIN) {
            return done(null, false, {
              message: `Access restricted to @${ALLOWED_DOMAIN} accounts.`,
            });
          }

          const user = {
            id: profile.id,
            email,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value || "",
          };

          return done(null, user);
        }
      )
    );
  }

  // ─── Auth routes ─────────────────────────────────────────────────────

  // Start Google OAuth flow
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
    })
  );

  // OAuth callback
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/#/login?error=unauthorized",
    }),
    (req: Request, res: Response) => {
      // Successful login — redirect to app root
      res.redirect("/#/");
    }
  );

  // Get current user (used by frontend)
  app.get("/auth/me", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ user: null });
    }
  });

  // Logout
  app.post("/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });
  });
}

// ─── Middleware: protect /api routes ─────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow unauthenticated access in dev mode when no OAuth creds configured
  if (!process.env.GOOGLE_CLIENT_ID) {
    return next();
  }
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required", loginUrl: "/auth/google" });
}
