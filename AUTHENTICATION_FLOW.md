# Authentication Flow Documentation

## Complete Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          User Opens Application                              │
│                       http://localhost:4200                                  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Angular App Loads                                                           │
│  - MSAL.js initializes                                                       │
│  - Checks localStorage for existing tokens                                   │
│  - Handles redirect callback if returning from login                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
    ┌──────────────────┐              ┌──────────────────────┐
    │ No Tokens Found  │              │ Tokens Found         │
    │ Show Login Button│              │ User is Authenticated│
    └──────────────────┘              └──────────────────────┘
                │                                 │
                │                                 │
                │                                 │
┌───────────────▼─────────────────────────────────────────────────────────────┐
│                          LOGIN FLOW (PKCE)                                   │
└──────────────────────────────────────────────────────────────────────────────┘

Step 1: User clicks "Sign In with Microsoft"
┌──────────────────────────────────────────────────────────────────────────────┐
│  Angular Component                                                            │
│  - authService.loginRedirect() called                                         │
│  - Requests scopes: openid, profile, access_as_user                          │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 2: MSAL.js prepares authorization request
┌──────────────────────────────────────────────────────────────────────────────┐
│  MSAL.js Library                                                              │
│  - Generates code_verifier (random string)                                    │
│  - Creates code_challenge = SHA256(code_verifier)                            │
│  - Stores code_verifier in localStorage                                       │
│  - Builds authorization URL with:                                             │
│    • client_id: 1d922779-2742-4cf2-8c82-425cf2c60aa8                         │
│    • response_type: code                                                      │
│    • redirect_uri: http://localhost:4200                                     │
│    • scope: openid profile api://1d922779-.../access_as_user                 │
│    • code_challenge: [hash]                                                   │
│    • code_challenge_method: S256                                              │
│  - Redirects browser to Microsoft login                                       │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 3: User authenticates with Microsoft
┌──────────────────────────────────────────────────────────────────────────────┐
│  Microsoft Entra ID (login.microsoftonline.com)                              │
│  - Shows login page                                                           │
│  - User enters credentials                                                    │
│  - MFA if required                                                            │
│  - User consents to permissions (if first time)                              │
│  - Generates authorization_code                                               │
│  - Stores code_challenge for validation                                       │
│  - Redirects back to: http://localhost:4200?code=AUTH_CODE                   │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 4: MSAL.js exchanges code for tokens
┌──────────────────────────────────────────────────────────────────────────────┐
│  MSAL.js handles redirect                                                     │
│  - Extracts authorization_code from URL                                       │
│  - Retrieves code_verifier from localStorage                                  │
│  - Makes POST to token endpoint with:                                         │
│    • grant_type: authorization_code                                           │
│    • client_id: 1d922779-2742-4cf2-8c82-425cf2c60aa8                         │
│    • code: AUTH_CODE                                                          │
│    • code_verifier: [original random string]                                  │
│    • redirect_uri: http://localhost:4200                                     │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 5: Microsoft validates and returns tokens
┌──────────────────────────────────────────────────────────────────────────────┐
│  Microsoft Entra ID Token Endpoint                                           │
│  - Validates authorization_code                                               │
│  - Verifies: SHA256(code_verifier) == stored code_challenge                  │
│  - Issues tokens:                                                             │
│    • access_token (JWT) - for API access                                     │
│    • id_token (JWT) - for user identity                                      │
│    • refresh_token - for renewing access                                     │
│  - Returns JSON response                                                      │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 6: MSAL.js stores tokens
┌──────────────────────────────────────────────────────────────────────────────┐
│  MSAL.js Token Cache                                                          │
│  - Stores tokens in localStorage under msal.* keys                           │
│  - Stores account information                                                 │
│  - Fires authentication state change event                                    │
│  - Angular component detects authentication                                   │
│  - UI updates to show "Authenticated" state                                   │
└──────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                          API CALL FLOW                                         │
└───────────────────────────────────────────────────────────────────────────────┘

Step 1: User clicks "Call Protected API"
┌──────────────────────────────────────────────────────────────────────────────┐
│  Angular Component                                                            │
│  - http.get('http://localhost:5000/weatherforecast') called                  │
│  - HttpClient prepares request                                                │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 2: MSAL Interceptor acquires token
┌──────────────────────────────────────────────────────────────────────────────┐
│  MsalInterceptor                                                              │
│  - Intercepts HTTP request                                                    │
│  - Checks protected resource map                                              │
│  - Matches URL pattern → needs access_as_user scope                          │
│  - Calls acquireTokenSilent():                                                │
│    • Checks cache for valid token                                             │
│    • If token exists and not expired → use cached token                      │
│    • If expired → use refresh_token to get new access_token                  │
│    • If refresh fails → trigger interactive login                            │
│  - Retrieves access_token                                                     │
│  - Adds header: Authorization: Bearer eyJ0eXAiOiJKV1QiLCJ...                 │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 3: Request sent to API
┌──────────────────────────────────────────────────────────────────────────────┐
│  HTTP Request to API                                                          │
│  GET /weatherforecast HTTP/1.1                                                │
│  Host: localhost:5000                                                         │
│  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6...      │
│  Accept: application/json                                                     │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 4: API validates JWT token
┌──────────────────────────────────────────────────────────────────────────────┐
│  ASP.NET Core JWT Bearer Middleware                                          │
│  - Extracts token from Authorization header                                   │
│  - Decodes JWT header to get kid (key ID)                                     │
│  - Fetches Microsoft public keys from:                                        │
│    https://login.microsoftonline.com/common/discovery/v2.0/keys              │
│  - Validates JWT signature using public key                                   │
│  - Validates claims:                                                          │
│    ✓ aud (audience): 1d922779-2742-4cf2-8c82-425cf2c60aa8                   │
│    ✓ iss (issuer): https://login.microsoftonline.com/{tenant}/v2.0          │
│    ✓ exp (expiration): token not expired                                     │
│    ✓ nbf (not before): token is valid now                                    │
│    ✓ scp (scope): contains "access_as_user"                                  │
│  - If all valid → creates ClaimsPrincipal                                     │
│  - Sets HttpContext.User                                                      │
│  - Allows request to proceed to controller                                    │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 5: Controller processes request
┌──────────────────────────────────────────────────────────────────────────────┐
│  WeatherForecast Endpoint                                                     │
│  - [Authorize] attribute checks HttpContext.User.Identity.IsAuthenticated    │
│  - If true → execute method                                                   │
│  - Extract user info from claims:                                             │
│    • Name: HttpContext.User.Identity.Name                                    │
│    • User ID (oid): HttpContext.User.FindFirst("oid").Value                  │
│  - Generate weather data                                                      │
│  - Return JSON response                                                       │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
Step 6: Response returns to Angular
┌──────────────────────────────────────────────────────────────────────────────┐
│  HTTP Response                                                                │
│  {                                                                             │
│    "user": "John Doe",                                                        │
│    "userId": "a1b2c3d4-...",                                                  │
│    "forecast": [                                                              │
│      { "date": "2025-12-10", "temperatureC": 15, "summary": "Cool" },        │
│      ...                                                                      │
│    ]                                                                          │
│  }                                                                            │
│  - Angular receives response                                                  │
│  - Updates UI with data                                                       │
│  - Displays weather forecast table                                            │
└──────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                      TOKEN STRUCTURE                                           │
└───────────────────────────────────────────────────────────────────────────────┘

Access Token (JWT) - Used for API calls:
┌──────────────────────────────────────────────────────────────────────────────┐
│  Header:                                                                      │
│  {                                                                            │
│    "typ": "JWT",                                                              │
│    "alg": "RS256",                                                            │
│    "kid": "key-identifier"                                                    │
│  }                                                                            │
│                                                                               │
│  Payload:                                                                     │
│  {                                                                            │
│    "aud": "1d922779-2742-4cf2-8c82-425cf2c60aa8",  // Audience (ClientId)   │
│    "iss": "https://login.microsoftonline.com/{tenant}/v2.0",  // Issuer      │
│    "iat": 1670600000,  // Issued at                                          │
│    "nbf": 1670600000,  // Not before                                         │
│    "exp": 1670603600,  // Expiration (1 hour)                                │
│    "scp": "access_as_user",  // Scopes granted                               │
│    "sub": "user-subject-id",                                                  │
│    "oid": "object-id",  // User's object ID                                  │
│    "preferred_username": "user@domain.com",                                   │
│    "name": "John Doe",                                                        │
│    "tid": "tenant-id"                                                         │
│  }                                                                            │
│                                                                               │
│  Signature:                                                                   │
│  RSASHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload),         │
│             microsoft_private_key)                                            │
└──────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY NOTES                                            │
└───────────────────────────────────────────────────────────────────────────────┘

✓ No Client Secret: PKCE ensures security without secrets in SPA
✓ Code Challenge: Prevents authorization code interception attacks
✓ Token Validation: API validates every request independently
✓ Short-lived Tokens: Access tokens expire in 1 hour
✓ Refresh Tokens: Automatically renewed by MSAL.js
✓ HTTPS Required: Production must use HTTPS to prevent token theft
✓ CORS Protection: API validates origin of requests
✓ Audience Validation: Token can only be used for intended API
