import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & {
        userId: string;
        tenantId: string;
        role: string;
        email: string;
      };
    }
  }
}
