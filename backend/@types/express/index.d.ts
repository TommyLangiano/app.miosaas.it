declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      email: string;
      companyId?: string;
      role?: string;
      tokenType?: string;
      name?: string;
      emailVerified?: boolean;
      username?: string;
      scope?: string;
      [key: string]: any;
    };
  }
}