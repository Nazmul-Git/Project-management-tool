export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Utility function to create common errors
export const createError = (message: string, statusCode: number) => {
  return new AppError(message, statusCode);
};

// Common error types
export const Errors = {
  BadRequest: (message = 'Bad request') => createError(message, 400),
  Unauthorized: (message = 'Unauthorized') => createError(message, 401),
  Forbidden: (message = 'Forbidden') => createError(message, 403),
  NotFound: (message = 'Not found') => createError(message, 404),
  Conflict: (message = 'Conflict') => createError(message, 409),
  InternalServerError: (message = 'Internal server error') => createError(message, 500),
};