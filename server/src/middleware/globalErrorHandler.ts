/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { handleCastError } from "../helpers/handleCastError";
import { handlerDuplicateError } from "../helpers/handleDuplicateError";
import { handlerValidationError } from "../helpers/handlerValidationError";
import { handlerZodError } from "../helpers/handlerZodError";
import AppError from "../utils/AppError";
import { TErrorSources } from "../types/error.types";
import { envVars } from "../config/env";
import { captureException } from "../utils/observability";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (envVars.NODE_ENV === "development") {
    console.log(err);
  }

  let errorSources: TErrorSources[] = [];
  let statusCode = 500;
  let message = "Something Went Wrong!!";

  // Prisma duplicate key (P2002) or invalid ID (P2023)
  if (err.code === "P2002") {
    const simplifiedError = handlerDuplicateError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
  } else if (err.code === "P2023") {
    const simplifiedError = handleCastError();
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
  } else if (err.name === "ZodError") {
    const simplifiedError = handlerZodError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources as TErrorSources[];
  }
  else if (err.name === "ValidationError") {
    const simplifiedError = handlerValidationError(err);
    statusCode = simplifiedError.statusCode;
    errorSources = simplifiedError.errorSources as TErrorSources[];
    message = simplifiedError.message;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    statusCode = 500;
    message = err.message;
  }

  // Report unexpected (5xx) errors to the error tracker with the request id so a
  // user's report can be correlated to a specific failure. Expected 4xx
  // AppErrors are not reported (they're normal control flow).
  if (statusCode >= 500) {
    captureException(err, { requestId: (req as any).id, path: req.originalUrl });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    requestId: (req as any).id,
    err: envVars.NODE_ENV === "development" ? err : null,
    stack: envVars.NODE_ENV === "development" ? err.stack : null,
  });
};
