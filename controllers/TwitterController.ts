import { Request, Response } from 'express';
import { configManager } from '../config';
import { TwitterPoster } from '../lib/TwitterPoster';
import * as fs from 'fs';

export class TwitterController {
  
  public async post(req: Request, res: Response): Promise<void> {
    try {
      const { text } = req.body;
      const file = req.file;

      if (!text) {
        res.status(400).json({
          success: false,
          error: 'Tweet text is required',
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

      const imagePath = file?.path;

      const poster = new TwitterPoster({
        useBrave: config.useBrave,
        executablePath: config.executablePath,
        braveUserDataDir: config.userDataDir,
        headless: false,
      });

      await poster.post({
        username: '',
        password: '',
        text: text,
        imagePath: imagePath,
      });

      if (imagePath && fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      res.json({
        success: true,
        message: 'Posted to Twitter successfully',
        data: {
          text: text,
          hasImage: !!file,
          imageSize: file?.size,
        },
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to Twitter',
      });
    }
  }

  public async postWithUrl(req: Request, res: Response): Promise<void> {
    try {
      const { text, imageUrl } = req.body;

      if (!text) {
        res.status(400).json({
          success: false,
          error: 'Tweet text is required',
        });
        return;
      }

      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        res.status(400).json({
          success: false,
          error: 'Invalid image URL. Must start with http:// or https://',
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

      const poster = new TwitterPoster({
        useBrave: config.useBrave,
        executablePath: config.executablePath,
        braveUserDataDir: config.userDataDir,
        headless: true,
      });

      await poster.post({
        username: '',
        password: '',
        text: text,
        imagePath: imageUrl,
      });

      res.json({
        success: true,
        message: 'Posted to Twitter successfully from external URL',
        data: {
          text: text,
          imageUrl: imageUrl || null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to Twitter from external URL',
      });
    }
  }
}

