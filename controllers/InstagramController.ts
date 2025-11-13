import { Request, Response } from 'express';
import { configManager } from '../config';
import { InstagramPoster } from '../lib/InstagramPoster';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export class InstagramController {
  
  private getFileExtensionFromUrl(url: string): string {
    const urlPath = url.split('?')[0];
    const match = urlPath.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    return match ? match[1].toLowerCase() : 'jpg';
  }

  private async downloadImageFromUrl(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      
      protocol.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
          return;
        }

        const contentType = response.headers['content-type'];
        const isImageContentType = contentType && contentType.startsWith('image/');
        const isGenericContentType = contentType && (
          contentType.includes('octet-stream') || 
          contentType.includes('application/octet-stream') ||
          contentType.includes('binary/octet-stream')
        );

        let ext = 'jpg';
        if (isImageContentType) {
          ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
        } else if (isGenericContentType || !contentType) {
          ext = this.getFileExtensionFromUrl(imageUrl);
        } else {
          reject(new Error(`URL does not point to an image. Content-Type: ${contentType}`));
          return;
        }

        const tempFileName = `temp-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
        const tempFilePath = path.join('uploads', tempFileName);

        const fileStream = fs.createWriteStream(tempFilePath);
        
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(tempFilePath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(tempFilePath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }
  
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
        headless: true,
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
        headless: true,
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

  public async postWithExternalUrl(req: Request, res: Response): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      const { caption, imageUrl } = req.body;

      if (!caption) {
        res.status(400).json({
          success: false,
          error: 'Caption is required',
        });
        return;
      }

      if (!imageUrl) {
        res.status(400).json({
          success: false,
          error: 'Image URL is required',
        });
        return;
      }

      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
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

      tempFilePath = await this.downloadImageFromUrl(imageUrl);

      const poster = new InstagramPoster({
        useBrave: config.useBrave,
        executablePath: config.executablePath,
        braveUserDataDir: config.userDataDir,
        headless: true,
      });

      await poster.post({
        username: '',
        password: '',
        imagePath: tempFilePath,
        caption: caption,
      });

      const fileStats = fs.statSync(tempFilePath);

      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      res.json({
        success: true,
        message: 'Posted to Instagram successfully from external URL',
        data: {
          caption: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
          imageUrl: imageUrl,
          imageSize: fileStats.size,
        },
      });
    } catch (error) {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to Instagram from external URL',
      });
    }
  }
}

