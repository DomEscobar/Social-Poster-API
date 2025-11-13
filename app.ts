import express, { Application } from 'express';
import cors from 'cors';
import browserRoutes from './routes/browser.routes';
import instagramRoutes from './routes/instagram.routes';
import { errorHandler } from './middleware/errorHandler';
import * as fs from 'fs';
import * as path from 'path';

export class InstagramAPIServer {
  private app: Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.ensureUploadDirectory();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Instagram Poster API',
        version: '1.0.0',
        endpoints: {
          browser: {
            setConfig: 'POST /api/browser/config',
            getConfig: 'GET /api/browser/config',
            clearConfig: 'DELETE /api/browser/config',
          },
          instagram: {
            post: 'POST /api/instagram/post (multipart/form-data)',
            postWithPath: 'POST /api/instagram/post-with-path (application/json)',
          },
        },
        documentation: {
          setConfig: {
            method: 'POST',
            endpoint: '/api/browser/config',
            body: {
              executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
              userDataDir: 'C:\\Users\\YourUser\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data',
            },
          },
          post: {
            method: 'POST',
            endpoint: '/api/instagram/post',
            contentType: 'multipart/form-data',
            fields: {
              image: 'file (required)',
              caption: 'string (required)',
            },
          },
          postWithPath: {
            method: 'POST',
            endpoint: '/api/instagram/post-with-path',
            contentType: 'application/json',
            body: {
              imagePath: './images/photo.jpg',
              caption: 'Your caption here',
            },
          },
        },
      });
    });

    this.app.use('/api/browser', browserRoutes);
    this.app.use('/api/instagram', instagramRoutes);

    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private ensureUploadDirectory(): void {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log('');
      console.log('🚀 Instagram Poster API Server');
      console.log('================================');
      console.log(`✅ Server running on: http://localhost:${this.port}`);
      console.log(`📖 API Documentation: http://localhost:${this.port}/`);
      console.log('');
      console.log('Available endpoints:');
      console.log(`  POST   /api/browser/config     - Set browser configuration`);
      console.log(`  GET    /api/browser/config     - Get browser configuration`);
      console.log(`  DELETE /api/browser/config     - Clear browser configuration`);
      console.log(`  POST   /api/instagram/post     - Post to Instagram (with file upload)`);
      console.log(`  POST   /api/instagram/post-with-path - Post to Instagram (with file path)`);
      console.log(`  POST   /api/instagram/post-with-url - Post to Instagram (with image URL)`);
      console.log('');
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default InstagramAPIServer;

