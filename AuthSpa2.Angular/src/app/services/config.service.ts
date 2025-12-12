import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Application configuration loaded from the backend.
 * This is fetched from /api/config endpoint served by the Web project.
 */
export interface AppConfig {
  apiUrl: string;
}

/**
 * Default fallback configuration for local development.
 * Used when the config endpoint is not available or returns empty values.
 */
const DEFAULT_DEV_CONFIG: AppConfig = {
  // Default Aspire development URL for the API service
  // Uses localhost with port 7001 (standard Aspire HTTPS port for first service)
  apiUrl: 'https://localhost:7001'
};

/**
 * Service to load and provide application configuration.
 * Uses HttpBackend to bypass MSAL interceptor for the config endpoint.
 * 
 * Configuration is loaded from:
 * - Development: The Web project's ConfigController uses Aspire service discovery
 * - Production: The Web project reads from environment variables/appsettings
 * - Fallback: Uses DEFAULT_DEV_CONFIG if config endpoint fails or returns empty
 */
@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;
  private http: HttpClient;

  constructor(handler: HttpBackend) {
    // Use HttpBackend to create an HttpClient that bypasses interceptors
    // This is needed because MSAL interceptor would try to add a token
    // to the config endpoint which doesn't require authentication
    this.http = new HttpClient(handler);
  }

  /**
   * Load configuration from the backend.
   * This should be called during app initialization.
   */
  async loadConfig(): Promise<void> {
    try {
      // The /api/config endpoint is served by the Web project
      // In development: Angular dev server proxies to the Web project
      // In production: Angular is served from the Web project, same origin
      const configUrl = this.getConfigUrl();
      console.log('Loading config from:', configUrl);
      
      const loadedConfig = await firstValueFrom(
        this.http.get<AppConfig>(configUrl)
      );
      
      console.log('Config loaded from backend:', loadedConfig);
      
      // Validate the loaded config - use fallback if apiUrl is empty
      if (loadedConfig && loadedConfig.apiUrl && loadedConfig.apiUrl.trim() !== '') {
        this.config = loadedConfig;
      } else {
        console.warn('Backend returned empty apiUrl, using fallback config');
        this.config = DEFAULT_DEV_CONFIG;
      }
      
      console.log('Active config:', this.config);
    } catch (error) {
      console.warn('Failed to load config from backend, using fallback:', error);
      // Fallback to default dev config if backend config fails
      // This can happen during initial Angular development setup
      // or when running Angular outside of Aspire
      this.config = DEFAULT_DEV_CONFIG;
      console.log('Using fallback config:', this.config);
    }
  }

  /**
   * Get the config URL based on the current environment.
   * In development, Angular runs on a different port, so we need to call the Web project.
   * In production, Angular is served from the Web project, so we use relative URL.
   */
  private getConfigUrl(): string {
    // Check if we're running on the Angular dev server (port 4200)
    if (window.location.port === '4200') {
      // In development, the Web project is typically on port 5000/5001 or via Aspire
      // We'll use the proxy configuration in angular.json to handle this
      // The proxy will forward /api/* to the Web project
      return '/api/config';
    }
    // In production, same origin - use relative URL
    return '/api/config';
  }

  /**
   * Get the API URL for the backend service.
   * Throws if config hasn't been loaded yet.
   */
  get apiUrl(): string {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config.apiUrl;
  }

  /**
   * Check if config has been loaded.
   */
  get isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Get the full configuration object.
   */
  getConfig(): AppConfig | null {
    return this.config;
  }
}
