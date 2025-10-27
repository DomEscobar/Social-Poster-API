import { Request, Response } from 'express';
import { configManager } from '../config';
import * as fs from 'fs';

export class BrowserController {
  
  public setConfig(req: Request, res: Response): void {
    try {
      const { executablePath, userDataDir } = req.body;

      if (!executablePath || !userDataDir) {
        res.status(400).json({
          success: false,
          error: 'Both executablePath and userDataDir are required',
        });
        return;
      }

      if (!fs.existsSync(executablePath)) {
        res.status(400).json({
          success: false,
          error: `Browser executable not found at: ${executablePath}`,
        });
        return;
      }

      if (!fs.existsSync(userDataDir)) {
        res.status(400).json({
          success: false,
          error: `User data directory not found at: ${userDataDir}`,
        });
        return;
      }

      configManager.setConfig({
        executablePath,
        userDataDir,
        useBrave: true,
      });

      res.json({
        success: true,
        message: 'Browser configuration saved successfully',
        config: {
          executablePath,
          userDataDir,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public getConfig(req: Request, res: Response): void {
    try {
      const config = configManager.getConfig();

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'No browser configuration found. Please set configuration first.',
        });
        return;
      }

      res.json({
        success: true,
        config: {
          executablePath: config.executablePath,
          userDataDir: config.userDataDir,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public clearConfig(req: Request, res: Response): void {
    try {
      configManager.clearConfig();
      
      res.json({
        success: true,
        message: 'Browser configuration cleared successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

