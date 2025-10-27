import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err.message.includes('Only image files')) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  if (err.message.includes('File too large')) {
    res.status(400).json({
      success: false,
      error: 'File size exceeds 10MB limit',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
};

