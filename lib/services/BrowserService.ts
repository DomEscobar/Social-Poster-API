import puppeteer, { Browser, LaunchOptions } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Logger } from '../utils/Logger';

export interface BrowserServiceConfig {
  headless?: boolean;
  devtools?: boolean;
  slowMo?: number;
  args?: string[];
  timeout?: number;
  userDataDir?: string;
  executablePath?: string;
}

export class BrowserService {
  private browser: Browser | null = null;
  private readonly logger = new Logger();
  private readonly defaultConfig: BrowserServiceConfig = {
    headless: true,
    devtools: false,
    slowMo: 0,
    userDataDir: './userData',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
    ],
    timeout: 60000,
  };

  constructor(private config: BrowserServiceConfig = {}) {
    this.setupPuppeteerExtra();
  }

  private setupPuppeteerExtra(): void {
    puppeteerExtra.use(StealthPlugin());
  }

  public async launch(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    const finalConfig = { ...this.defaultConfig, ...this.config };
    
    try {
      this.logger.info('Launching browser with configuration:', finalConfig);
      
      const launchOptions = {
        headless: finalConfig.headless ? 'new' : false,
        devtools: finalConfig.devtools,
        slowMo: finalConfig.slowMo,
        args: finalConfig.args,
        timeout: finalConfig.timeout,
        userDataDir: finalConfig.userDataDir,
        executablePath: finalConfig.executablePath,
        ignoreDefaultArgs: ['--enable-automation'],
      } as LaunchOptions;

      this.browser = await puppeteerExtra.launch(launchOptions);
      
      this.logger.info('Browser launched successfully');
      return this.browser;
      
    } catch (error) {
      this.logger.error('Failed to launch browser:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('TimeoutError') || error.name === 'TimeoutError') {
          throw new Error(`Browser launch timed out after ${finalConfig.timeout}ms. Make sure no other browser instance is using the same profile directory: ${finalConfig.userDataDir}`);
        }
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          throw new Error(`Browser executable not found at: ${finalConfig.executablePath || 'default path'}. Please check the executable path.`);
        }
        throw new Error(`Browser launch failed: ${error.message}`);
      }
      
      throw new Error(`Browser launch failed: Unknown error`);
    }
  }

  public async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.logger.info('Browser closed successfully');
      } catch (error) {
        this.logger.error('Error closing browser:', error);
        throw new Error(`Browser close failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  public getBrowser(): Browser | null {
    return this.browser;
  }

  public isLaunched(): boolean {
    return this.browser !== null;
  }
}
