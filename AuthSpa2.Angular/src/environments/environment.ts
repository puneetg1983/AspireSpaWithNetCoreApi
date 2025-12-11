// Environment configuration for Angular app
// For Azure deployment, set the production API URL here
export const environment = {
  production: false,
  // API URL - change this for Azure deployment
  // Local: '/api' (uses proxy or Aspire service discovery)
  // Azure: 'https://apiservice.<your-env>.eastus2.azurecontainerapps.io'
  apiUrl: 'https://apiservice.agreeablemeadow-c2511ce0.eastus2.azurecontainerapps.io',
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
