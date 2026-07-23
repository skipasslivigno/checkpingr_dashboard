import { UserRole } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        role: UserRole;
        email: string;
        name: string;
      };
    }
  }
}

export {};
