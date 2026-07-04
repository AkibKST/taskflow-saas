import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError";
import { prisma } from "../config/prisma";

export interface AuthPayload extends jwt.JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  /** Populated from the DB by verifyToken, not from the JWT. */
  emailVerifiedAt?: Date | null;
}

export const verifyToken = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError(401, "Access token required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;

    // Re-validate against the DB every request so deactivations and role changes
    // take effect immediately rather than lagging until the ≤15-min access token
    // expires. The authoritative role/tenant come from the row, not the JWT.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isActive: true, role: true, tenantId: true, emailVerifiedAt: true },
    });

    if (!user || !user.isActive) {
      return next(new AppError(401, "Account is inactive or no longer exists"));
    }

    req.user = {
      ...decoded,
      role: user.role,
      tenantId: user.tenantId,
      emailVerifiedAt: user.emailVerifiedAt,
    };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
};
