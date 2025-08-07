import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import registerRoutes from './routes/register';
import documentsRoutes from './routes/tenants/documents';
import demoRegisterRoutes from './routes/demoRegister';
import companyRegistrationRoutes from './routes/companyRegistration';
import exampleTenantRoutes from './routes/tenants/example';
import testDemoRoutes from './routes/tenants/testDemo';

// Import database
import { db } from './config/db';

// Carica le variabili d'ambiente
dotenv.config();

class App {
  public app: Application;
  public port: string | number;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Sicurezza HTTP headers
    this.app.use(helmet());

    // Compressione delle risposte
    this.app.use(compression());

    // Logging delle richieste HTTP
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy (per Heroku, AWS, etc.)
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        // Check database health
        const dbHealth = await db.healthCheck();
        const poolStats = db.getPoolStats();
        
        const isHealthy = dbHealth.status === 'healthy';
        
        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'OK' : 'DEGRADED',
          message: 'Server health check',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          database: dbHealth,
          pool: poolStats,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        });
      } catch (error) {
        res.status(503).json({
          status: 'ERROR',
          message: 'Health check failed',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // API routes base
    this.app.get('/api', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'Welcome to MioSaaS API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          api: '/api',
          register: '/api/register',
          auth: {
            protected: '/api/auth/protected',
            optional: '/api/auth/optional',
            adminOnly: '/api/auth/admin-only',
            me: '/api/auth/me',
            validateToken: '/api/auth/validate-token'
          },
          tenants: {
            documents: '/api/tenants/documents',
            documentById: '/api/tenants/documents/:id',
            documentsStats: '/api/tenants/documents/stats/summary',
            examples: '/api/tenants/example',
            testDemo: '/api/tenants/test'
          },
          company: {
            register: '/api/register-company'
          },
          demo: {
            register: '/api/demo/register'
          }
        }
      });
    });

    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // User registration route (public - no auth required)
    this.app.use('/api', registerRoutes);

    // Demo registration route
    this.app.use('/api/demo', demoRegisterRoutes);

    // Company registration route (protected)
    this.app.use('/api', companyRegistrationRoutes);

    // Tenant-specific routes (protected)
    this.app.use('/api/tenants/documents', documentsRoutes);
    this.app.use('/api/tenants/example', exampleTenantRoutes);
    
    // Test demo routes (NO AUTH - solo per testing!)
    this.app.use('/api/tenants/test', testDemoRoutes);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Global Error Handler:', error);
      
      res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on http://localhost:${this.port}`);
      console.log(`📄 Health check: http://localhost:${this.port}/health`);
      console.log(`📡 API base: http://localhost:${this.port}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

export default App;