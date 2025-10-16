import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { env } from "./environment";
import { authRateLimit, recordAuthSuccess } from "./middleware/authRateLimit";

// Environment validation is already done in environment.ts

const getOidcConfig = memoize(
  async () => {
    if (env.FEATURE_AUTH_PROVIDER === 'scholar-auth') {
      // Scholar Auth configuration
      const issuerUrl = env.AUTH_ISSUER_URL!;
      const config = await client.discovery(
        new URL(issuerUrl),
        env.AUTH_CLIENT_ID!,
        {
          client_secret: env.AUTH_CLIENT_SECRET!,
        }
      );
      console.log(`🔐 OAuth configured: Scholar Auth (${issuerUrl})`);
      return config;
    } else {
      // Legacy Replit OIDC configuration
      const issuerUrl = env.ISSUER_URL || "https://replit.com/oidc";
      const config = await client.discovery(
        new URL(issuerUrl),
        env.REPL_ID
      );
      console.log(`🔐 OAuth configured: Replit OIDC (${issuerUrl})`);
      return config;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax', // RT-018: CSRF protection
      maxAge: sessionTtl,
      domain: undefined, // Explicit domain scoping
      path: '/', // Explicit path scoping
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategyConfig: any = {
      name: `replitauth:${domain}`,
      config,
      scope: "openid email profile offline_access",
      callbackURL: `https://${domain}/api/callback`,
    };
    
    // Add client authentication for Scholar Auth
    if (env.FEATURE_AUTH_PROVIDER === 'scholar-auth') {
      strategyConfig.client_id = env.AUTH_CLIENT_ID;
      strategyConfig.client_secret = env.AUTH_CLIENT_SECRET;
    }
    
    const strategy = new Strategy(strategyConfig, verify);
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", authRateLimit, (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", authRateLimit, (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err?: any) => {
      if (!err && req.user) {
        // Record successful authentication
        const userClaims = (req.user as any)?.claims;
        recordAuthSuccess(req, userClaims?.sub);
      }
      next(err);
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
