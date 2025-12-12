import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { 
  IPublicClientApplication, 
  PublicClientApplication, 
  InteractionType,
  BrowserCacheLocation,
  LogLevel
} from '@azure/msal-browser';
import { 
  MsalGuard, 
  MsalInterceptor, 
  MsalBroadcastService, 
  MsalService,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration
} from '@azure/msal-angular';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { ConfigService } from './services/config.service';

/**
 * MSAL Configuration for single Entra ID App Registration
 * ClientId: 1d922779-2742-4cf2-8c82-425cf2c60aa8
 * Uses PKCE / Authorization Code Flow (no client secret)
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  const msalInstance = new PublicClientApplication({
    auth: {
      clientId: '1d922779-2742-4cf2-8c82-425cf2c60aa8',
      authority: 'https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: false // Set to true for IE11 or Edge
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
          if (containsPii) {
            return;
          }
          switch (level) {
            case LogLevel.Error:
              console.error(message);
              return;
            case LogLevel.Info:
              console.info(message);
              return;
            case LogLevel.Verbose:
              console.debug(message);
              return;
            case LogLevel.Warning:
              console.warn(message);
              return;
          }
        },
        logLevel: LogLevel.Info
      }
    }
  });
  
  // Initialize MSAL before returning
  msalInstance.initialize();
  
  return msalInstance;
}

/**
 * MSAL Guard Configuration
 * Defines interaction type for login
 */
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: [
        'openid',
        'profile',
        'api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'
      ]
    }
  };
}

/**
 * MSAL Interceptor Configuration
 * Automatically attaches access tokens to API calls
 * 
 * We use multiple URL patterns to cover:
 * - Local development with Aspire (various localhost URLs)
 * - Production Azure Container Apps URLs
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  const scopes = ['api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'];
  
  // Local development URLs - specific ports used by Aspire
  // API Service ports
  protectedResourceMap.set('https://localhost:7001/*', scopes);
  protectedResourceMap.set('http://localhost:5001/*', scopes);
  
  // Additional common localhost ports for flexibility
  protectedResourceMap.set('https://localhost:7000/*', scopes);
  protectedResourceMap.set('https://localhost:7002/*', scopes);
  protectedResourceMap.set('https://localhost:5000/*', scopes);
  protectedResourceMap.set('https://localhost:5001/*', scopes);
  
  // Aspire dev proxy patterns (specific hostnames)
  protectedResourceMap.set('https://apiservice.dev.localhost:7001/*', scopes);
  protectedResourceMap.set('http://apiservice.dev.localhost:5001/*', scopes);

  // Azure Container Apps URLs (production)
  // This pattern covers any Azure Container Apps environment
  protectedResourceMap.set('https://apiservice.*.azurecontainerapps.io/*', scopes);
  
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

/**
 * Factory function to initialize the ConfigService before the app starts.
 * This ensures configuration is loaded before any components try to use it.
 */
export function initializeConfig(configService: ConfigService): () => Promise<void> {
  return () => configService.loadConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    // Initialize ConfigService before the app starts
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeConfig,
      deps: [ConfigService],
      multi: true
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService
  ]
};
