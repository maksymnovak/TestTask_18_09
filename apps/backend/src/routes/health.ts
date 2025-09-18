import { FastifyInstance } from 'fastify';
import { healthCheck } from '@/config/database';
import { config } from '@/config/environment';

export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * Basic health check
   * GET /health
   */
  fastify.get('/health', async (request, reply) => {
    const startTime = Date.now();

    try {
      // Check database connectivity
      const dbHealthy = await healthCheck();

      // Check file system (upload directory)
      let fsHealthy = false;
      try {
        const fs = await import('fs/promises');
        await fs.access(config.upload.uploadDir);
        fsHealthy = true;
      } catch {
        fsHealthy = false;
      }

      const responseTime = Date.now() - startTime;

      const health = {
        status: dbHealthy && fsHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.server.nodeEnv,
        checks: {
          database: {
            status: dbHealthy ? 'up' : 'down',
            responseTime: responseTime,
          },
          filesystem: {
            status: fsHealthy ? 'up' : 'down',
            uploadDir: config.upload.uploadDir,
          },
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      return reply.status(statusCode).send(health);
    } catch (error) {
      console.error('Health check error:', error);
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime,
      });
    }
  });

  /**
   * Readiness probe (for Kubernetes)
   * GET /ready
   */
  fastify.get('/ready', async (request, reply) => {
    try {
      const dbHealthy = await healthCheck();

      if (dbHealthy) {
        return reply.status(200).send({
          status: 'ready',
          timestamp: new Date().toISOString(),
        });
      } else {
        return reply.status(503).send({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          reason: 'Database not accessible',
        });
      }
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Liveness probe (for Kubernetes)
   * GET /live
   */
  fastify.get('/live', async (request, reply) => {
    return reply.status(200).send({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * API status and metrics
   * GET /api/status
   */
  fastify.get('/api/status', async (request, reply) => {
    try {
      const [dbHealthy] = await Promise.all([
        healthCheck(),
      ]);

      // Get basic metrics from database
      const metrics = await getApiMetrics();

      return reply.send({
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.server.nodeEnv,
        database: {
          status: dbHealthy ? 'connected' : 'disconnected',
        },
        metrics,
      });
    } catch (error) {
      console.error('Status check error:', error);
      return reply.status(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve status',
      });
    }
  });
}

/**
 * Get basic API metrics
 */
async function getApiMetrics() {
  try {
    const { db } = await import('@/config/database');

    const [
      totalUsers,
      totalCompanies,
      totalDocuments,
      totalNotifications,
    ] = await Promise.all([
      db.user.count(),
      db.company.count(),
      db.document.count(),
      db.notification.count(),
    ]);

    return {
      users: totalUsers,
      companies: totalCompanies,
      documents: totalDocuments,
      notifications: totalNotifications,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return {
      error: 'Failed to fetch metrics',
    };
  }
}