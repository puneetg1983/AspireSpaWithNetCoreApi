import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * Bootstrap Angular application with MSAL authentication
 * MSAL will automatically handle redirect callbacks on page load
 */
bootstrapApplication(App, appConfig)
  .catch((err) => console.error('Application bootstrap error:', err));
