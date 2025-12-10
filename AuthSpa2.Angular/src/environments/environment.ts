// Environment configuration for Angular app
// In production, these values will be injected by Aspire
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000', // Default API URL, will be overridden by Aspire
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
