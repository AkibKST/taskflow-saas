/* eslint-disable @typescript-eslint/no-explicit-any */
import { TGenericErrorResponse } from "../types/error.types";

export const handlerDuplicateError = (err: any): TGenericErrorResponse => {
  const target = err.meta?.target;
  const field = Array.isArray(target) ? target.join(", ") : target;
  return {
    statusCode: 409,
    message: field ? `${field} already exists!!` : "Duplicate value!!",
  };
};
