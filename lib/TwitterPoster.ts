import { Page } from 'puppeteer';
import { BrowserService } from './services/BrowserService';
import { Logger, LogLevel } from './utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export interface TwitterPostConfig {
  username: string;
  password: string;
  imagePath?: string;
  text: string;
  headless?: boolean;
  useBrave?: boolean;
  braveUserDataDir?: string;
  executablePath?: string;
}

export class TwitterPoster {
  private browserService: BrowserService;
  private logger: Logger;

  constructor(config?: Partial<TwitterPostConfig>) {
    this.logger = new Logger(LogLevel.INFO);

    const defaultBraveExe = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
    const defaultBraveUserData = path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'User Data');

    let browserConfig: any = {
      headless: config?.headless ?? false,
      slowMo: 50,
      userDataDir: './userData',
    };

    if (config?.useBrave) {
      browserConfig.executablePath = config.executablePath || defaultBraveExe;
      browserConfig.userDataDir = config.braveUserDataDir || defaultBraveUserData;

      this.logger.info('Using Brave browser with profile:', browserConfig.userDataDir);
    } else if (config?.executablePath || config?.braveUserDataDir) {
      browserConfig.executablePath = config.executablePath;
      browserConfig.userDataDir = config.braveUserDataDir || './userData';
    }

    this.browserService = new BrowserService(browserConfig);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.delay(delayTime);
  }

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

        const tempFileName = `temp-twitter-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
        const tempFilePath = path.join('uploads', tempFileName);

        const fileStream = fs.createWriteStream(tempFilePath);

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(tempFilePath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(tempFilePath, () => { });
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  private isUrl(str: string): boolean {
    return str.startsWith('http://') || str.startsWith('https://');
  }

  private async typeWithDelay(page: Page, selector: string, text: string): Promise<void> {
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);
    await this.delay(500);

    for (const char of text) {
      await page.type(selector, char);
      await this.delay(50 + Math.random() * 150);
    }
  }

  public async post(config: TwitterPostConfig): Promise<void> {
    const browser = await this.browserService.launch();
    const page = await browser.newPage();
    let downloadedImagePath: string | null = null;

    try {
      await page.setViewport({
        width: 1920,
        height: 1080,
      });

      this.logger.info('Navigating to Twitter/X...');
      await page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
      await this.randomDelay();

      const isLoggedIn = await this.checkIfLoggedIn(page);

      if (!isLoggedIn) {
        if (!config.username || !config.password) {
          throw new Error('Not logged in and no credentials provided. Please log in manually first or provide credentials.');
        }
        await this.login(page, config.username, config.password);
      } else {
        this.logger.info('Already logged in - using existing session');
      }

      let imagePathToUse = config.imagePath;

      if (config.imagePath && this.isUrl(config.imagePath)) {
        this.logger.info('Downloading image from URL:', config.imagePath);
        downloadedImagePath = await this.downloadImageFromUrl(config.imagePath);
        imagePathToUse = downloadedImagePath;
        this.logger.info('Image downloaded to:', downloadedImagePath);
      }

      await this.createPost(page, config.text, imagePathToUse);

      this.logger.info('Tweet posted successfully!');

      await this.performPostPostActions(page);

    } catch (error) {
      this.logger.error('Error posting to Twitter:', error);
      throw error;
    } finally {
      if (downloadedImagePath && fs.existsSync(downloadedImagePath)) {
        this.logger.info('Cleaning up downloaded image');
        fs.unlinkSync(downloadedImagePath);
      }
      await this.browserService.close();
    }
  }

  private async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      const tweetBoxExists = await page.$('div[data-testid="tweetTextarea_0"]') !== null;
      const composeButtonExists = await page.$('a[data-testid="SideNav_NewTweet_Button"]') !== null;
      return tweetBoxExists || composeButtonExists;
    } catch (e) {
      return false;
    }
  }

  private async login(page: Page, username: string, password: string): Promise<void> {
    this.logger.info('Logging in to Twitter/X...');

    try {
      await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' });
      await this.randomDelay();

      await page.waitForSelector('input[autocomplete="username"]', { visible: true, timeout: 10000 });
      await page.type('input[autocomplete="username"]', username);
      await this.randomDelay(500, 1000);

      const nextButtons = await page.$$('div[role="button"]');
      for (const button of nextButtons) {
        const text = await button.evaluate(el => el.textContent?.trim());
        if (text === 'Next') {
          await button.click();
          break;
        }
      }

      await this.randomDelay();

      await page.waitForSelector('input[name="password"]', { visible: true, timeout: 10000 });
      await page.type('input[name="password"]', password);
      await this.randomDelay(500, 1000);

      const loginButtons = await page.$$('div[role="button"]');
      for (const button of loginButtons) {
        const text = await button.evaluate(el => el.textContent?.trim());
        if (text === 'Log in') {
          await button.click();
          break;
        }
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      this.logger.info('Login successful');
    } catch (error) {
      this.logger.error('Login failed:', error);
      throw new Error('Failed to login to Twitter. Please check credentials or login manually first.');
    }
  }

  private async performPostPostActions(page: Page): Promise<void> {
    this.logger.info('Performing post-posting actions to appear natural...');

    try {
      await this.randomDelay(2000, 4000);

      this.logger.info('Scrolling timeline...');
      await page.evaluate('window.scrollBy(0, 300)');
      await this.randomDelay(1500, 2500);

      await page.evaluate('window.scrollBy(0, 400)');
      await this.randomDelay(1000, 2000);

      await page.evaluate('window.scrollBy(0, -200)');
      await this.randomDelay(1500, 2500);

      this.logger.info('Checking notifications...');
      const notificationsBell = await page.$('a[aria-label="Notifications"]');
      if (notificationsBell) {
        await notificationsBell.click();
        await this.randomDelay(2000, 3000);

        await page.goBack();
        await this.randomDelay(1500, 2500);
      }

      this.logger.info('Viewing home timeline...');
      await page.evaluate('window.scrollBy(0, 500)');
      await this.randomDelay(2000, 3000);

      this.logger.info('Waiting before closing browser...');
      await this.randomDelay(3000, 5000);

    } catch (error) {
      this.logger.warn('Some post-actions failed, but continuing:', error);
    }
  }

  private async createPost(page: Page, text: string, imagePath?: string): Promise<void> {
    this.logger.info('Creating new tweet...');

    try {
      await page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });
      await this.randomDelay();

      const tweetBox = await page.waitForSelector('div[data-testid="tweetTextarea_0"]', {
        visible: true,
        timeout: 10000
      });

      if (!tweetBox) {
        throw new Error('Could not find tweet compose box');
      }

      await tweetBox.click();
      await this.delay(500);

      const textSelector = 'div[data-testid="tweetTextarea_0"]';
      await page.click(textSelector);
      await this.delay(300);

      for (const char of text) {
        await page.keyboard.type(char);
        await this.delay(30 + Math.random() * 70);
      }

      await this.randomDelay(1000, 2000);

      if (imagePath && fs.existsSync(imagePath)) {
        this.logger.info('Uploading image...');

        const fileInput = await page.$('input[data-testid="fileInput"]');
        if (fileInput) {
          await fileInput.uploadFile(path.resolve(imagePath));
          await this.randomDelay(2000, 4000);
          this.logger.info('Image uploaded successfully');
        } else {
          this.logger.warn('File input not found, posting without image');
        }
      }

      await this.randomDelay(2000, 4000);

      console.log('postButton searching');
      const postButton = await page.waitForSelector('button[data-testid="tweetButtonInline"]', {
        visible: true,
        timeout: 5000
      });

      
      if (!postButton) {
        throw new Error('Could not find Post button');
      }

      this.logger.info('Clicking Post button...');
      await postButton.click();

      await this.delay(3000);

      this.logger.info('Tweet posted successfully!');
    } catch (error) {
      this.logger.error('Error creating tweet:', error);
      throw error;
    }
  }
}

