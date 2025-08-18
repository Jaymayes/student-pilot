// Express Request augmentation for authentication
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        claims?: JwtClaims;
      };
    }
  }
}

export interface JwtClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  role?: string;
  scopes?: string[];
  iat?: number;
  exp?: number;
}