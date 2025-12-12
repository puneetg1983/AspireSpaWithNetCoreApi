// Environment configuration for Angular app
// NOTE: API URL is now loaded dynamically from /api/config endpoint at runtime
// This file is kept for reference and as a fallback for MSAL configuration
export const environment = {
  production: false,
  // API URL is now dynamically loaded via ConfigService from the backend
  // The backend uses Aspire service discovery in development
  // and ServiceUrls configuration in production
  msalConfig: {
    clientId: '1d922779-2742-4cf2-8c82-425cf2c60aa8',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: 'http://localhost:4200',
    scopes: [
      'openid',
      'profile',
      'api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'
    ]
  }
};
