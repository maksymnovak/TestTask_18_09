import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '@/config/database';

/**
 * Request validation middleware factory
 */
export function validateRequest<T extends z.ZodType>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validation = schema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      // Replace request body with validated data
      request.body = validation.data;
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request format',
      });
    }
  };
}

/**
 * Query parameter validation middleware factory
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validation = schema.safeParse(request.query);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Query validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      request.query = validation.data;
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid query parameters',
      });
    }
  };
}

/**
 * URL parameter validation middleware factory
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validation = schema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Parameter validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      request.params = validation.data;
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid URL parameters',
      });
    }
  };
}

/**
 * Company ownership validation middleware
 * Ensures user can only access their own company's resources
 */
export async function validateCompanyOwnership(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const params = request.params as any;
    const companyId = params.companyId || params.id;

    if (!companyId) {
      return reply.status(400).send({
        success: false,
        error: 'Company ID is required',
      });
    }

    // In a real application, you would extract userId from JWT token
    // For this MVP, we'll use a simple email-based lookup
    const body = request.body as any;
    const query = request.query as any;
    const userEmail = body?.email || query?.email;

    if (!userEmail) {
      return reply.status(401).send({
        success: false,
        error: 'User email is required for authorization',
      });
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'User not found',
      });
    }

    // Check if company belongs to user
    const company = await db.company.findFirst({
      where: {
        id: companyId,
        userId: user.id,
      },
    });

    if (!company) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied: Company not found or not owned by user',
      });
    }

    // Add user and company to request context
    (request as any).user = user;
    (request as any).company = company;

  } catch (error) {
    console.error('Company ownership validation error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Authorization check failed',
    });
  }
}

/**
 * Audit logging middleware
 */
export async function auditLog(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip;

    // Determine action based on method and URL
    let action = `${method} ${url}`;
    let resource: string | undefined;

    // Extract resource information
    const params = request.params as any;
    if (params.companyId) {
      resource = `Company:${params.companyId}`;
    } else if (params.id) {
      resource = `Resource:${params.id}`;
    }

    // Log the action
    await db.auditLog.create({
      data: {
        userId: user?.id,
        action,
        resource,
        metadata: JSON.stringify({
          method,
          url,
          userAgent,
          timestamp: new Date().toISOString(),
        }),
        ipAddress,
        userAgent,
        createdAt: new Date(),
      },
    });

  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit logging failed:', error);
  }
}

/**
 * Error handling middleware
 */
export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  console.error('Request error:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    headers: request.headers,
  });

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';

  let statusCode = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.message.includes('not found')) {
    statusCode = 404;
    message = isProduction ? 'Resource not found' : error.message;
  } else if (error.message.includes('unauthorized') || error.message.includes('access denied')) {
    statusCode = 403;
    message = isProduction ? 'Access denied' : error.message;
  } else if (error.message.includes('validation') || error.message.includes('invalid')) {
    statusCode = 400;
    message = isProduction ? 'Bad request' : error.message;
  }

  return reply.status(statusCode).send({
    success: false,
    error: message,
    ...(isProduction ? {} : { stack: error.stack }),
  });
}

/**
 * Request sanitization middleware
 */
export async function sanitizeInput(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      request.query = sanitizeObject(request.query);
    }

  } catch (error) {
    console.error('Input sanitization error:', error);
    return reply.status(400).send({
      success: false,
      error: 'Invalid input format',
    });
  }
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize string input
 */
function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}