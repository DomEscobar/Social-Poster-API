export interface BrowserConfig {
  executablePath: string;
  userDataDir: string;
  useBrave: boolean;
}

class ConfigManager {
  private config: BrowserConfig | null = null;

  public setConfig(config: BrowserConfig): void {
    this.config = config;
  }

  public getConfig(): BrowserConfig | null {
    return this.config;
  }

  public hasConfig(): boolean {
    return this.config !== null;
  }

  public clearConfig(): void {
    this.config = null;
  }
}

export const configManager = new ConfigManager();

