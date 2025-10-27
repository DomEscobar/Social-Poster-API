import { Request, Response } from 'express';
import { configManager } from '../config';
import { InstagramPoster } from '../lib/InstagramPoster';
import * as fs from 'fs';

export class InstagramController {
  
  public async post(req: Request, res: Response): Promise<void> {
    try {
      const { caption } = req.body;
      const file = req.file;

      if (!caption) {
        res.status(400).json({
          success: false,
          error: 'Caption is required',
        });
        return;
      }

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'Image file is required',
        });
        return;
      }

      const config = configManager.getConfig();

      if (!config) {
        res.status(400).json({
          success: false,
          error: 'Browser configuration not set. Please set browser config first using /api/browser/config endpoint',
        });
        return;
      }

      const imagePath = file.path;

      const poster = new InstagramPoster({
        useBrave: config.useBrave,
        executablePath: config.executablePath,
        braveUserDataDir: config.userDataDir,
        headless: false,
      });

      await poster.post({
        username: '',
        password: '',
        imagePath: imagePath,
        caption: caption,
      });

      // Clean up uploaded file
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      res.json({
        success: true,
        message: 'Posted to Instagram successfully',
        data: {
          caption: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
          imageSize: file.size,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to Instagram',
      });
    }
  }

  public async postWithUrl(req: Request, res: Response): Promise<void> {
    try {
      const { caption, imagePath } = req.body;

      if (!caption) {
        res.status(400).json({
          success: false,
          error: 'Caption is required',
        });
        return;
      }

      if (!imagePath) {
        res.status(400).json({
          success: false,
          error: 'Image path is required',
        });
        return;
      }

      if (!fs.existsSync(imagePath)) {
        res.status(400).json({
          success: false,
          error: `Image not found at path: ${imagePath}`,
        });
        return;
      }

      const config = configManager.getConfig();

      if (!config) {
        res.status(400).json({
          success: false,
          error: 'Browser configuration not set. Please set browser config first using /api/browser/config endpoint',
        });
        return;
      }

      const poster = new InstagramPoster({
        useBrave: config.useBrave,
        executablePath: config.executablePath,
        braveUserDataDir: config.userDataDir,
        headless: false,
      });

      await poster.post({
        username: '',
        password: '',
        imagePath: imagePath,
        caption: caption,
      });

      res.json({
        success: true,
        message: 'Posted to Instagram successfully',
        data: {
          caption: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
          imagePath: imagePath,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to Instagram',
      });
    }
  }
}

