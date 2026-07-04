import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & {
        userId: string;
        tenantId: string;
        role: string;
        email: string;
        emailVerifiedAt?: Date | null;
      };
      /** Assigned by the requireProjectMember middleware. */
      projectRole?: string;
      /** Per-request correlation id (see middleware/requestId). */
      id?: string;
    }
  }
}
