# Backend Service Architecture - Token Forwarding

## Overview
This solution now demonstrates a multi-tier architecture with token forwarding:

```
Angular SPA (MSAL.js)
    ↓ Bearer Token
ApiService (MISE Auth)
    ↓ Forward Same Token
BackendProtectedService (MISE Auth)
```

## Components

### 1. BackendProtectedService
- **Location**: `AuthSpa2.BackendProtectedService/`
- **Port**: HTTPS 7002, HTTP 5002
- **Authentication**: MISE (Microsoft Identity Service Essentials)
- **Endpoint**: `/api/data` (GET)
- **Returns**: Sample data with user information

**Controller**: `Controllers/DataController.cs`
- Validates incoming JWT token with MISE
- Extracts user identity from claims
- Returns static JSON data with user context

### 2. ApiService (Updated)
- **New Endpoint**: `/backenddata` (GET)
- **Purpose**: Acts as a gateway to BackendProtectedService
- **Token Forwarding**: Automatically forwards the Bearer token from the incoming request

**How Token Forwarding Works**:
```csharp
// Extract Authorization header from incoming request
var authHeader = httpContext.Request.Headers["Authorization"].ToString();

// Create HttpClient for backend service
var httpClient = httpClientFactory.CreateClient("BackendProtectedService");

// Forward the bearer token
httpClient.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(authHeader);

// Call backend service with forwarded token
var response = await httpClient.GetAsync("/api/data");
```

### 3. Angular App (Updated)
- **New Button**: "Call Backend Service"
- **New Method**: `callBackendService()`
- **Endpoint Called**: `https://apiservice.dev.localhost:7001/backenddata`

**User Flow**:
1. User clicks "Call Backend Service" button
2. MSAL interceptor attaches access token to request → ApiService
3. ApiService validates token with MISE
4. ApiService forwards same token → BackendProtectedService
5. BackendProtectedService validates token with MISE
6. BackendProtectedService returns data
7. ApiService wraps response and returns to Angular
8. Angular displays the data

### 4. Aspire AppHost (Updated)
Now orchestrates three services:
- `backendprotectedservice` - Backend tier with MISE
- `apiservice` - Middle tier with MISE (references backend)
- `angular-spa` - Frontend with MSAL.js (references API)

## Authentication Flow

### Initial Login (MSAL.js → Entra ID)
```
User → Login → MSAL.js → Entra ID
                ↓
        Access Token (JWT)
                ↓
    Stored in localStorage
```

### Token Forwarding Flow
```
1. Angular makes request to ApiService
   Authorization: Bearer <token>
   
2. ApiService receives request
   - MISE validates token
   - Extracts Authorization header
   
3. ApiService calls BackendProtectedService
   Authorization: Bearer <token> (same token)
   
4. BackendProtectedService receives request
   - MISE validates token
   - Processes request
   - Returns data
   
5. ApiService returns wrapped response to Angular
```

## Key Features

### Token Reuse
- Same access token flows through all tiers
- No token exchange needed
- All services validate against same Entra ID app
- Single scope: `api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user`

### Security
- ✅ All services require valid JWT tokens
- ✅ MISE validates tokens at each tier
- ✅ User identity preserved across all services
- ✅ No token modification or re-issuance

### Service Discovery
Aspire handles service discovery automatically:
```csharp
// In ApiService configuration
builder.Services.AddHttpClient("BackendProtectedService", client =>
{
    // Aspire resolves this to actual backend service URL
    client.BaseAddress = new Uri("https+http://backendprotectedservice");
});
```

## Testing

### 1. Start the Application
```powershell
cd c:\source\aspire\AuthSpa2
aspire run
```

### 2. Navigate to Angular App
Open: `http://localhost:4200`

### 3. Sign In
Click "Sign In with Microsoft"

### 4. Test Direct API Call
Click "Call Protected API" → Shows weather forecast

### 5. Test Backend Service Call
Click "Call Backend Service" → Shows backend data with token forwarding

### Expected Response
```json
{
  "message": "Data retrieved from BackendProtectedService via ApiService",
  "calledBy": "Puneet Gupta",
  "backendResponse": {
    "message": "This is protected data from BackendProtectedService",
    "requestedBy": "Puneet Gupta",
    "userId": "...",
    "timestamp": "2025-12-10T...",
    "data": [
      { "id": 1, "name": "Sample Item 1", "value": "Backend Value 1" },
      { "id": 2, "name": "Sample Item 2", "value": "Backend Value 2" },
      { "id": 3, "name": "Sample Item 3", "value": "Backend Value 3" }
    ]
  }
}
```

## Troubleshooting

### Issue: 401 Unauthorized on Backend Call
**Solution**: Ensure token forwarding is working:
- Check ApiService logs for Authorization header
- Verify BackendProtectedService receives the token
- Confirm both services use same AzureAd configuration

### Issue: Service Discovery Fails
**Solution**: Ensure Aspire references are correct:
- ApiService references BackendProtectedService in AppHost
- HttpClient uses service name: "backendprotectedservice"

### Issue: MISE Validation Fails
**Solution**: Both services need:
- v2.0 access tokens (`accessTokenAcceptedVersion: 2`)
- `idtyp` claim with `include_user_token`
- Same ClientId and TenantId in appsettings.json

## Architecture Benefits

1. **Separation of Concerns**: Frontend → Gateway API → Backend Service
2. **Token Reuse**: Single token flows through all tiers
3. **Consistent Authentication**: MISE validates at each tier
4. **Service Discovery**: Aspire handles inter-service communication
5. **Scalability**: Each service can scale independently
6. **Security**: Every tier validates the token independently
