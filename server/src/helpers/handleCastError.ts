import { TGenericErrorResponse } from "../types/error.types";

export const handleCastError = (): TGenericErrorResponse => ({
  statusCode: 400,
  message: "Invalid id. Please provide a valid id",
});
