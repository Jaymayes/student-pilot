import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import crypto from "crypto";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { env } from "./environment";
import { authRateLimit, recordAuthSuccess } from "./middleware/authRateLimit";
import { StudentEvents } from "./services/businessEvents";
import { telemetryClient } from "./telemetry/telemetryClient";

// Environment validation is already done in environment.ts

const getOidcConfig = memoize(
  async () => {
    if (env.FEATURE_AUTH_PROVIDER === 'scholar-auth') {
      // Scholar Auth configuration with fallback
      const issuerUrl = env.AUTH_ISSUER_URL!;
      const clientId = env.AUTH_CLIENT_ID!;
      const clientSecret = env.AUTH_CLIENT_SECRET!;
      
      console.log(`🔐 OAuth configured: Scholar Auth (${issuerUrl})`);
      console.log(`   Client ID: ${clientId}`);
      
      try {
        const config = await client.discovery(
          new URL(issuerUrl),
          clientId,
          {
            client_secret: clientSecret,
          }
        );
        console.log('✅ Scholar Auth discovery successful');
        return config;
      } catch (error: any) {
        console.error('❌ Scholar Auth discovery failed, falling back to Replit OIDC:', error.message);
        console.log('⚠️  Using Replit OIDC as fallback authentication provider');
        
        // Fallback to Replit OIDC
        const fallbackIssuerUrl = env.ISSUER_URL || "https://replit.com/oidc";
        const config = await client.discovery(
          new URL(fallbackIssuerUrl),
          env.REPL_ID
        );
        console.log(`🔐 Fallback OAuth configured: Replit OIDC (${fallbackIssuerUrl})`);
        return config;
      }
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
      secure: true, // Always require HTTPS for cross-app auth
      sameSite: 'none', // Required for cross-domain OIDC redirects
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
  sessionId?: string,
  requestId?: string,
) {
  const userId = claims["sub"];
  
  // Check if user exists before upsert
  const existingUser = await storage.getUser(userId);
  const isNewUser = !existingUser;
  
  await storage.upsertUser({
    id: userId,
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
  
  // Emit student_signup event for new users
  if (isNewUser) {
    await StudentEvents.signup(
      userId,
      sessionId || 'unknown',
      requestId || crypto.randomUUID(),
      {
        email: claims["email"],
        firstName: claims["first_name"],
        lastName: claims["last_name"],
      }
    );
    console.log(`📊 Business Event: student_signup emitted for user ${userId}`);
    
    // Protocol v3.4.1: Emit funnel event for student signup
    telemetryClient.trackStudentSignup({ userId, source: 'oauth' });
    console.log(`📊 v3.4.1: funnel_event (student_signup) emitted for user ${userId}`);
  }
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
    const requestId = crypto.randomUUID();
    await upsertUser(tokens.claims(), undefined, requestId);
    verified(null, user);
  };

  // Register strategies for all configured domains
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Add localhost for development
  if (env.NODE_ENV === 'development' && !domains.includes('localhost')) {
    domains.push('localhost');
  }
  
  for (const domain of domains) {
    const strategyConfig: any = {
      name: `replitauth:${domain}`,
      config,
      scope: "openid email profile offline_access",
      callbackURL: domain.includes('localhost') 
        ? `http://${domain}:5000/api/callback`
        : `https://${domain}/api/callback`,
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
      // Use correct client_id based on auth provider
      const clientId = env.FEATURE_AUTH_PROVIDER === 'scholar-auth' 
        ? env.AUTH_CLIENT_ID!
        : env.REPL_ID;
      
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: clientId,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Standardized error format with request_id
  const requestId = (req as any).id || crypto.randomUUID();

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        request_id: requestId
      }
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        request_id: requestId
      }
    });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        request_id: requestId
      }
    });
    return;
  }
};
