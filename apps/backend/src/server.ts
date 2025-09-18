import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import { config } from '@/config/environment';
import { FileService } from '@/services/file';
import { errorHandler, sanitizeInput, auditLog } from '@/middleware/security';

// Route imports
import { healthRoutes } from '@/routes/health';
import { companyRoutes } from '@/routes/company';
import { kycRoutes } from '@/routes/kyc';
import { financialsRoutes } from '@/routes/financials';
import { filesRoutes } from '@/routes/files';
import { scoreRoutes } from '@/routes/score';
import { notificationsRoutes } from '@/routes/notifications';

/**
 * Create and configure Fastify server with enterprise-level security and monitoring
 */
async function createServer() {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
      ...(config.server.nodeEnv === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: config.server.nodeEnv === 'production',
  });

  // ===== Security Middleware =====

  // Helmet for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: config.server.nodeEnv === 'production'
      ? [config.cors.origin]
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    skipOnError: true,
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.round(context.ttl / 1000),
    }),
  });

  // File upload handling
  await fastify.register(multipart, {
    limits: {
      fileSize: config.upload.maxFileSize,
      files: 5, // Max 5 files per request
      fieldSize: 1024 * 1024, // 1MB field size limit
    },
  });

  // ===== API Documentation =====
  if (config.server.nodeEnv !== 'production') {
    await fastify.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Capital Marketplace API',
          description: 'Production-ready capital marketplace platform API',
          version: '1.0.0',
          contact: {
            name: 'API Support',
            email: 'support@capitalmarketplace.com',
          },
        },
        servers: [
          {
            url: `http://${config.server.host}:${config.server.port}`,
            description: 'Development server',
          },
        ],
        tags: [
          { name: 'Health', description: 'Health check endpoints' },
          { name: 'Companies', description: 'Company management' },
          { name: 'KYC', description: 'Know Your Customer verification' },
          { name: 'Financials', description: 'Financial data integration' },
          { name: 'Files', description: 'Document upload and management' },
          { name: 'Score', description: 'Investability scoring' },
          { name: 'Notifications', description: 'User notifications' },
        ],
      },
    });

    await fastify.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });
  }

  // ===== Global Hooks =====

  // Request preprocessing
  fastify.addHook('preHandler', sanitizeInput);
  fastify.addHook('preHandler', auditLog);

  // Response headers
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-response-time', Date.now() - (request as any).requestTime);
    return payload;
  });

  // Add request timing
  fastify.addHook('onRequest', (request, _reply, done) => {
    (request as any).requestTime = Date.now();
    done();
  });

  // ===== Error Handling =====
  fastify.setErrorHandler(errorHandler);

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Route not found',
      path: request.url,
      method: request.method,
    });
  });

  // ===== Route Registration =====

  // Health checks (no /api prefix for load balancers)
  await fastify.register(healthRoutes);

  // API routes with /api prefix
  await fastify.register(async function (fastify) {
    await fastify.register(companyRoutes, { prefix: '/company' });
    await fastify.register(kycRoutes, { prefix: '/kyc' });
    await fastify.register(financialsRoutes, { prefix: '/financials' });
    await fastify.register(filesRoutes, { prefix: '/files' });
    await fastify.register(scoreRoutes, { prefix: '/score' });
    await fastify.register(notificationsRoutes, { prefix: '/notifications' });
  }, { prefix: '/api' });

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize file service
    await FileService.initialize();

    // Create server
    const fastify = await createServer();

    // Start server
    const address = await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    console.log(`
🚀 Capital Marketplace API Server Started Successfully!

📊 Server Info:
   • Address: ${address}
   • Environment: ${config.server.nodeEnv}
   • Node Version: ${process.version}

📚 Documentation:
   • Swagger UI: ${address}/docs
   • Health Check: ${address}/health
   • API Status: ${address}/api/status

🔒 Security Features:
   • Rate limiting: ${config.rateLimit.max} requests per ${config.rateLimit.windowMs}ms
   • File upload limit: ${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB
   • CORS enabled for: ${config.cors.origin}

⏰ Ready to accept requests!
    `);

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      try {
        await fastify.close();
        console.log('✅ Server closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start().catch(console.error);
}

export { createServer, start };