import { Page } from 'puppeteer';
import { BrowserService } from './services/BrowserService';
import { Logger, LogLevel } from './utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

export interface InstagramPostConfig {
  username: string;
  password: string;
  imagePath: string;
  caption: string;
  headless?: boolean;
  useBrave?: boolean;
  braveUserDataDir?: string;
  executablePath?: string;
}

export class InstagramPoster {
  private browserService: BrowserService;
  private logger: Logger;

  constructor(config?: Partial<InstagramPostConfig>) {
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

  private async typeWithDelay(page: Page, selector: string, text: string): Promise<void> {
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);
    await this.delay(500);

    for (const char of text) {
      await page.type(selector, char);
      await this.delay(50 + Math.random() * 150);
    }
  }

  public async post(config: InstagramPostConfig): Promise<void> {
    const browser = await this.browserService.launch();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });

      this.logger.info('Navigating to Instagram...');
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
      await this.randomDelay();

      const isLoggedIn = await page.$('svg[aria-label="New post"]') !== null ||
        await page.$('svg[aria-label="Create"]') !== null ||
        await page.$('a[href="/create/select/"]') !== null;

      if (!isLoggedIn) {
        if (!config.username || !config.password) {
          throw new Error('Not logged in and no credentials provided. Please log in manually first or provide credentials.');
        }
        await this.login(page, config.username, config.password);
      } else {
        this.logger.info('Already logged in - using existing session');
      }

      await this.createPost(page, config.imagePath, config.caption);

      this.logger.info('Post created successfully!');

    } catch (error) {
      this.logger.error('Error posting to Instagram:', error);
      throw error;
    } finally {
      await this.browserService.close();
    }
  }

  private async login(page: Page, username: string, password: string): Promise<void> {
    this.logger.info('Logging in to Instagram...');

    const loginButton = await page.$('button:has-text("Log in")');
    if (loginButton) {
      await loginButton.click();
      await this.randomDelay();
    }

    await this.typeWithDelay(page, 'input[name="username"]', username);
    await this.randomDelay(500, 1000);

    await this.typeWithDelay(page, 'input[name="password"]', password);
    await this.randomDelay(500, 1000);

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    try {
      await page.waitForSelector('button:has-text("Not Now")', { timeout: 5000 });
      await page.click('button:has-text("Not Now")');
      await this.randomDelay();
    } catch (e) {
      // Popup didn't appear, continue
    }

    try {
      await page.waitForSelector('button:has-text("Not Now")', { timeout: 5000 });
      await page.click('button:has-text("Not Now")');
      await this.randomDelay();
    } catch (e) {
      // Popup didn't appear, continue
    }

    this.logger.info('Login successful');
  }

  private async createPost(page: Page, imagePath: string, caption: string): Promise<void> {
    this.logger.info('Creating new post...');

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    let newPostButton = await page.$('svg[aria-label="New post"]');
    if (!newPostButton) {
      newPostButton = await page.$('svg[aria-label="Create"]');
    }
    if (!newPostButton) {
      newPostButton = await page.$('a[href="#"]');
    }

    if (!newPostButton) {
      throw new Error('Could not find new post button');
    }

    await newPostButton.click();
    await this.randomDelay();

    // Handle "Post" vs "AI" popup that appears after clicking Create
    try {
      this.logger.info('Looking for Post option in popup...');
      const postOption = await page.waitForSelector('a[aria-label="Post"], svg[aria-label="Post"]', { timeout: 5000 });
      if (postOption) {
        // Click the parent link if we found the SVG
        const link = await page.evaluateHandle((el) => {
          return el.closest('a') || el;
        }, postOption);
        await link.asElement()?.click();
        await this.randomDelay();
        this.logger.info('Clicked Post option');
      }
    } catch (e) {
      // Popup might not appear, continue
      this.logger.info('Post popup not found, continuing...');
    }

    const fileInput = await page.waitForSelector('input[type="file"]', { visible: false });
    if (!fileInput) {
      throw new Error('Could not find file input');
    }

    await fileInput.uploadFile(path.resolve(imagePath));
    await this.randomDelay(2000, 4000);

    await this.clickButton(page, 'Next');
    await this.randomDelay();

    await this.clickButton(page, 'Next');
    await this.randomDelay();

    const captionInput = await page.waitForSelector('div[aria-label="Write a caption..."][contenteditable="true"]');
    if (captionInput) {
      await captionInput.click();
      await this.delay(500);

      for (const char of caption) {
        await page.keyboard.type(char);
        await this.delay(30 + Math.random() * 70);
      }
    }

    await this.randomDelay();
    
    await this.clickShareButton(page);
    
    await this.delay(5000);

    this.logger.info('Post created successfully!');
  }

  private async clickShareButton(page: Page): Promise<void> {
    this.logger.info('Looking for Share button in Create new post dialog...');
    
    try {
      // Find the "Create new post" dialog first
      const dialog = await page.waitForSelector('div[aria-label="Create new post"][role="dialog"]', { timeout: 5000 });
      
      if (dialog) {
        // Within the dialog, find all buttons and divs with role="button"
        const buttons = await page.$$('div[aria-label="Create new post"][role="dialog"] div[role="button"], div[aria-label="Create new post"][role="dialog"] button');
        
        for (const button of buttons) {
          const text = await button.evaluate(el => el.textContent?.trim());
          if (text === 'Share') {
            this.logger.info('Found Share button in dialog, clicking...');
            await button.click();
            return;
          }
        }
      }
    } catch (e) {
      this.logger.info('Dialog method failed, trying alternative...');
    }
    
    // Fallback: Use XPath to find Share button
    try {
      const [shareButton] = await page.$x("//div[@aria-label='Create new post']//div[@role='button'][contains(text(), 'Share')]");
      if (shareButton) {
        this.logger.info('Found Share button via XPath, clicking...');
        await shareButton.click();
        return;
      }
    } catch (e) {
      // Continue to final fallback
    }
    
    // Final fallback
    await this.clickButton(page, 'Share');
  }

  private async clickButton(page: Page, buttonText: string, selectors?: string[]): Promise<void> {
    let selectorsToUse = selectors || [
      `button:has-text("${buttonText}")`,
      `div[role="button"]:has-text("${buttonText}")`,
      `button >> text="${buttonText}"`,
    ];

    for (const selector of selectorsToUse) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          return;
        }
      } catch (e) {
        // Try next selector
      }
    }

    const buttons = await page.$$('button, div[role="button"]');
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent?.trim());
      if (text === buttonText) {
        await button.click();
        return;
      }
    }

    throw new Error(`Could not find button with text: ${buttonText}`);
  }
}
