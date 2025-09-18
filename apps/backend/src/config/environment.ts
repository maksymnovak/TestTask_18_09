import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().default('file:./dev.db'),

  // Server Configuration
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('localhost'),

  // Security
  JWT_SECRET: z.string().default('your-super-secret-jwt-key-change-this-in-production'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // External APIs
  PERSONA_API_KEY: z.string().optional(),
  PERSONA_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENVIRONMENT: z.enum(['sandbox', 'development', 'production']).default('sandbox'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Environment = z.infer<typeof envSchema>;

function validateEnvironment(): Environment {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Invalid environment variables:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export const env = validateEnvironment();

// Type-safe environment access
export const config = {
  database: {
    url: env.DATABASE_URL,
  },
  server: {
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
  },
  security: {
    jwtSecret: env.JWT_SECRET,
    bcryptRounds: env.BCRYPT_ROUNDS,
  },
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    uploadDir: env.UPLOAD_DIR,
  },
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW,
  },
  cors: {
    origin: env.CORS_ORIGIN,
  },
  external: {
    persona: {
      apiKey: env.PERSONA_API_KEY,
      environment: env.PERSONA_ENVIRONMENT,
    },
    plaid: {
      clientId: env.PLAID_CLIENT_ID,
      secret: env.PLAID_SECRET,
      environment: env.PLAID_ENVIRONMENT,
    },
  },
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;