# AuthSpa2 - Angular SPA with ASP.NET Core API using Microsoft Aspire 13 & MISE

This project demonstrates a complete authentication flow using:
- **Angular SPA** with MSAL.js (Authorization Code Flow with PKCE)
- **ASP.NET Core API** with Microsoft.Identity.ServiceEssentials (MISE) for JWT Bearer authentication
- **Microsoft Aspire 13** for service orchestration
- **Single Microsoft Entra ID App Registration** (no client secrets)

## Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────┐
│   Angular SPA       │         │  ASP.NET Core API    │
│   (Port 4200)       │         │  (Dynamic Port)      │
│                     │         │                      │
│  - MSAL.js (PKCE)   │────────▶│  - MISE Auth         │
│  - Auto Token       │  Bearer │  - [Authorize]       │
│    Acquisition      │  Token  │    Endpoints         │
└─────────────────────┘         └──────────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
              ┌──────────▼──────────┐
              │  Microsoft Entra ID │
              │  App Registration   │
              │                     │
              │  ClientId:          │
              │  1d922779-...       │
              │  Token Version: v2  │
              │  idtyp claim: ✓     │
              └─────────────────────┘
```

## Prerequisites

1. **.NET 10 SDK** or later
2. **Node.js 18+** and npm
3. **Aspire CLI** - Install via:
   ```powershell
   dotnet workload install aspire
   ```
4. **Microsoft Entra ID App Registration** configured with:
   - ClientId: `1d922779-2742-4cf2-8c82-425cf2c60aa8`
   - Redirect URI: `http://localhost:4200`
   - Exposed API scope: `api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user`
   - **Access Token Version: v2.0** (REQUIRED for MISE)
   - **Optional Claim: `idtyp`** (REQUIRED for MISE)
   - No client secret (public client / SPA)

## Microsoft Entra ID App Registration Setup

### Step 1: Expose API Scope
1. Navigate to Azure Portal → Entra ID → App Registrations
2. Select your app (ClientId: 1d922779-2742-4cf2-8c82-425cf2c60aa8)
3. Go to **Expose an API**
4. Add a scope:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: Access API as user
   - **Admin consent description**: Allows the app to access the API on behalf of the signed-in user
   - **User consent display name**: Access API as you
   - **User consent description**: Allows the app to access the API on your behalf
   - **State**: Enabled

### Step 2: Configure Authentication
1. Go to **Authentication**
2. Add a platform → **Single-page application**
3. Add Redirect URI: `http://localhost:4200`
4. Enable **Access tokens** and **ID tokens**
5. Set **Allow public client flows**: Yes

### Step 3: API Permissions
1. Go to **API Permissions**
2. Add permission → **My APIs** → Select your app
3. Add delegated permission: `access_as_user`
4. (Optional) Grant admin consent

### Step 4: Supported Account Types
- Set to **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)**
- Or restrict to your tenant as needed

### Step 5: Token Configuration (CRITICAL for MISE)
1. Go to **Token configuration**
2. Click **+ Add optional claim**
3. Select **Access** token type
4. Check ✅ **`idtyp`** (REQUIRED by MISE)
5. Click **Add**

### Step 6: Manifest Configuration (CRITICAL for MISE)
1. Go to **Manifest**
2. Find `accessTokenAcceptedVersion` and set to `2`:
   ```json
   "accessTokenAcceptedVersion": 2
   ```
3. Verify `optionalClaims` includes:
   ```json
   "optionalClaims": {
     "idToken": [],
     "accessToken": [
       {
         "name": "idtyp",
         "source": null,
         "essential": false,
         "additionalProperties": [
           "include_user_token"
         ]
       }
     ],
     "saml2Token": []
   }
   ```
4. Click **Save**

**⚠️ IMPORTANT**: Without v2.0 tokens and the `idtyp` claim, MISE authentication will fail with:
```
MISE12021: The 'idtyp' claim is required but was not present in the token
```

## Project Structure

```
AuthSpa2/
├── AuthSpa2.AppHost/          # Aspire orchestration host
│   └── AppHost.cs             # Defines Angular + API services
├── AuthSpa2.ApiService/       # ASP.NET Core Web API
│   ├── Program.cs             # JWT authentication setup
│   └── appsettings.json       # Azure AD configuration
├── AuthSpa2.Angular/          # Angular SPA with MSAL.js
│   └── src/
│       └── app/
│           ├── app.config.ts  # MSAL configuration
│           ├── app.ts         # Main component with auth logic
│           ├── app.html       # UI template
│           └── app.css        # Styling
└── AuthSpa2.ServiceDefaults/  # Shared Aspire defaults
```

## Authentication Flow

### 1. Login Flow (PKCE)
```
User clicks "Sign In"
   │
   ├─▶ Angular calls authService.loginRedirect()
   │
   ├─▶ MSAL.js redirects to login.microsoftonline.com
   │   └─▶ Generates code_challenge (PKCE)
   │
   ├─▶ User authenticates with Microsoft
   │
   ├─▶ Microsoft redirects back with authorization code
   │
   ├─▶ MSAL.js exchanges code for tokens (using code_verifier)
   │
   └─▶ Tokens stored in localStorage
```

### 2. API Call Flow
```
User clicks "Call Protected API"
   │
   ├─▶ Angular HttpClient makes GET request
   │
   ├─▶ MsalInterceptor intercepts request
   │   └─▶ Calls acquireTokenSilent() for API scope
   │   └─▶ Adds Authorization: Bearer <token> header
   │
   ├─▶ Request sent to API
   │
   ├─▶ API validates JWT token
   │   ├─▶ Checks signature (Microsoft public keys)
   │   ├─▶ Validates audience (ClientId)
   │   ├─▶ Validates issuer (Microsoft)
   │   └─▶ Checks expiration
   │
   └─▶ API returns data to Angular
```

## Running the Application

### Using Aspire CLI (Recommended)

```powershell
cd c:\source\aspire\AuthSpa2
aspire run
```

This will:
1. Start the Aspire Dashboard (usually at http://localhost:15000)
2. Launch the ASP.NET Core API
3. Start the Angular development server (port 4200)
4. Configure service discovery between components

### Manual Development Mode

**Terminal 1 - API:**
```powershell
cd AuthSpa2.ApiService
dotnet run
```

**Terminal 2 - Angular:**
```powershell
cd AuthSpa2.Angular
npm start
```

**Terminal 3 - Aspire Dashboard:**
```powershell
cd AuthSpa2.AppHost
dotnet run
```

## Testing the Application

1. Navigate to `http://localhost:4200` (or the port shown in Aspire Dashboard)
2. Click **"Sign In with Microsoft"**
3. Authenticate with your Microsoft account
4. After successful login, click **"Call Protected API"**
5. View the weather forecast data returned from the authenticated API
6. Click **"View Token (Console)"** to inspect the JWT token in browser console

## Key Components Explained

### Angular - MSAL Configuration (`app.config.ts`)

```typescript
// PKCE Configuration - No client secret needed
{
  clientId: '1d922779-2742-4cf2-8c82-425cf2c60aa8',
  authority: 'https://login.microsoftonline.com/common',
  redirectUri: 'http://localhost:4200'
}

// Scopes requested during login
scopes: [
  'openid',              // Basic user identity
  'profile',             // User profile information
  'api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'  // API access
]
```

### ASP.NET Core - MISE Authentication (`Program.cs`)

```csharp
// MISE (Microsoft Identity Service Essentials) authentication
// Validates tokens from Microsoft Entra ID with enhanced security
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);

builder.Services.AddAuthorization();

// Protected endpoint requires valid JWT with idtyp claim
app.MapGet("/weatherforecast", (HttpContext ctx) => {
    // Extract user identity from JWT claims
    var userIdentity = ctx.User.FindFirst("name")?.Value 
        ?? ctx.User.FindFirst("preferred_username")?.Value 
        ?? ctx.User.Identity?.Name 
        ?? "Anonymous";
    
    var userId = ctx.User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value 
        ?? ctx.User.FindFirst("oid")?.Value 
        ?? "Unknown";
    
    // Return weather data with user context
    return new { forecasts, requestedBy = userIdentity, userId };
})
.RequireAuthorization();
```

**MISE Requirements**:
- Access tokens must be **v2.0** (`accessTokenAcceptedVersion: 2` in app manifest)
- Tokens must include **`idtyp`** claim (configured in Token Configuration)
- Configuration in `appsettings.json` under `AzureAd` section

### Aspire AppHost Configuration (`AppHost.cs`)

```csharp
// Backend API
var apiService = builder.AddProject<Projects.AuthSpa2_ApiService>("apiservice");

// Angular SPA with service reference
var angularApp = builder.AddNpmApp("angular-spa", "../AuthSpa2.Angular")
    .WithNpmCommand("start")
    .WithHttpEndpoint(port: 4200)
    .WithReference(apiService);  // Enables service discovery
```

## Troubleshooting

### Issue: "AADSTS50011: The redirect URI specified in the request does not match"
**Solution**: Add `http://localhost:4200` to your app registration's redirect URIs

### Issue: "AADSTS700016: Application not found"
**Solution**: Verify the ClientId `1d922779-2742-4cf2-8c82-425cf2c60aa8` is correct

### Issue: API returns 401 Unauthorized
**Solutions**:
- Ensure the API scope is exposed: `api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user`
- Check that Angular is requesting the correct scope
- Verify the audience in API configuration matches ClientId
- Inspect the JWT token in browser console (click "View Token")

### Issue: User identity shows as "Anonymous"
**Solution**: Microsoft Entra ID JWT tokens use full URI claim types. The API checks multiple claim names in order:
- `name` - User's display name
- `preferred_username` - User's email/UPN
- `http://schemas.microsoft.com/identity/claims/objectidentifier` - User's unique ID
- `oid` - Alternative object identifier claim

### Issue: MISE authentication fails with "MISE12021: The 'idtyp' claim is required"
**Solution**: Your Entra ID app must be configured to issue v2.0 tokens with the `idtyp` claim:
1. Go to **App Registration → Manifest**
2. Set `"accessTokenAcceptedVersion": 2`
3. Go to **Token configuration** → Add optional claim → Access → Check `idtyp`
4. **Important**: After adding the claim via UI, go back to **Manifest** and manually add `"include_user_token"` to the `additionalProperties` array:
   ```json
   "optionalClaims": {
     "idToken": [],
     "accessToken": [
       {
         "name": "idtyp",
         "source": null,
         "essential": false,
         "additionalProperties": [
           "include_user_token"
         ]
       }
     ],
     "saml2Token": []
   }
   ```
5. Save and test again

Without these settings, MISE will reject all authentication requests.

### Issue: Geneva telemetry errors in logs
**Solution**: MISE includes Geneva telemetry which may fail in local development. These are non-fatal warnings and can be ignored in development. The authentication will still work once the `idtyp` claim issue is resolved.

### Issue: CORS errors
**Solution**: The API already has CORS configured for development. Ensure Angular is running on the expected port.

### Issue: Token not attached to requests
**Solution**: Verify the API URL pattern in `MSALInterceptorConfigFactory` matches your API endpoint

## Security Notes

✅ **PKCE Flow**: No client secrets - secure for SPAs
✅ **Token Validation**: API validates all tokens against Microsoft public keys
✅ **HTTPS Required**: In production, always use HTTPS
✅ **Token Storage**: Tokens stored in localStorage (consider sessionStorage for higher security)
✅ **Scope Isolation**: API only accepts tokens with the correct scope

## Production Considerations

1. **HTTPS Everywhere**: Configure SSL certificates for both Angular and API
2. **Token Refresh**: MSAL handles automatic token refresh
3. **Error Handling**: Implement proper error boundaries and user feedback
4. **Logging**: Enable Application Insights or similar for monitoring
5. **CORS**: Restrict CORS to specific origins in production
6. **Rate Limiting**: Implement rate limiting on API endpoints
7. **Redirect URIs**: Update to production URLs in Entra ID

## Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/azure/active-directory/develop/)
- [MSAL Angular Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular)
- [Microsoft.Identity.Web Documentation](https://github.com/AzureAD/microsoft-identity-web)
- [.NET Aspire Documentation](https://learn.microsoft.com/dotnet/aspire/)

## License

This is a sample project for demonstration purposes.
