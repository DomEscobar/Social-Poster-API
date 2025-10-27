import fs from 'fs';
import path from 'path';

export interface BrowserConfig {
  executablePath: string;
  userDataDir: string;
  useBrave: boolean;
}

const CONFIG_FILE = path.join(process.cwd(), 'browser-config.json');

class ConfigManager {
  private config: BrowserConfig | null = null;

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
        console.log('✓ Loaded browser configuration from file');
      }
    } catch (error) {
      console.warn('⚠ Could not load browser config:', error);
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
      console.log('✓ Browser configuration saved to file');
    } catch (error) {
      console.error('✗ Failed to save browser config:', error);
    }
  }

  public setConfig(config: BrowserConfig): void {
    this.config = config;
    this.saveToFile();
  }

  public getConfig(): BrowserConfig | null {
    return this.config;
  }

  public hasConfig(): boolean {
    return this.config !== null;
  }

  public clearConfig(): void {
    this.config = null;
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        fs.unlinkSync(CONFIG_FILE);
        console.log('✓ Browser configuration file deleted');
      }
    } catch (error) {
      console.error('✗ Failed to delete config file:', error);
    }
  }
}

export const configManager = new ConfigManager();

