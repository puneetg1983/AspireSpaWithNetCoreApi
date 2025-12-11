import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
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
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  
  // Add the backend API endpoint with required scopes
  // Local development URLs (Aspire)
  protectedResourceMap.set('https://apiservice.dev.localhost:7001/*', [
    'api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'
  ]);
  
  protectedResourceMap.set('http://apiservice.dev.localhost:5001/*', [
    'api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'
  ]);

  // Azure Container Apps URL (production)
  protectedResourceMap.set('https://apiservice.agreeablemeadow-c2511ce0.eastus2.azurecontainerapps.io/*', [
    'api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'
  ]);
  
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
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
