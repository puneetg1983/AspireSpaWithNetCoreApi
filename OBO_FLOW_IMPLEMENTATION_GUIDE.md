# On-Behalf-Of (OBO) Flow Implementation Guide

## Overview

This document provides a comprehensive guide for implementing the **On-Behalf-Of (OBO)** authentication flow in a multi-tier application using:

- **Frontend**: Angular SPA with MSAL.js
- **Middle-tier API**: ASP.NET Core with MISE (Microsoft Identity Service Essentials)
- **Backend Service**: ASP.NET Core with MISE
- **Orchestration**: .NET Aspire
- **Identity Provider**: Microsoft Entra ID (Azure AD)

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────────────┐
│   Angular SPA   │────▶│   ApiService    │────▶│ BackendServiceAcceptingToken │
│                 │     │                 │     │                              │
│ ClientId: 1d... │     │ ClientId: 1d... │     │ ClientId: 626c...            │
│                 │     │                 │     │                              │
│ Token Audience: │     │ Receives user   │     │ Receives OBO token           │
│ 1d922779-...    │     │ token, exchanges│     │ with audience: 626cfb4f-...  │
│                 │     │ for OBO token   │     │                              │
└─────────────────┘     └─────────────────┘     └──────────────────────────────┘
        │                       │                           │
        │                       │                           │
        ▼                       ▼                           ▼
   User Token              OBO Exchange              OBO Token
   (audience: 1d...)       via Azure AD             (audience: 626c...)
```

### Key Concept

The OBO flow allows a middle-tier service to:
1. Receive a user's access token (issued for its own audience)
2. Exchange that token with Azure AD for a NEW token targeting a different downstream API
3. Call the downstream API with the new token while preserving the user's identity

---

## 1. Microsoft Entra ID Configuration

### App Registrations Required

You need **TWO** app registrations:

| App Registration | Purpose | ClientId (Example) |
|------------------|---------|-------------------|
| **App 1: SPA & ApiService** | Used by Angular SPA and ApiService (same audience) | `1d922779-2742-4cf2-8c82-425cf2c60aa8` |
| **App 2: BackendServiceAcceptingToken** | Downstream API with different audience | `626cfb4f-3edb-4ec4-9cd0-64126cfaea3b` |

### App 1: SPA & ApiService Configuration

#### Manifest Settings
```json
{
  "accessTokenAcceptedVersion": 2,
  "signInAudience": "AzureADMyOrg"
}
```

#### API Permissions (Expose an API)
- **Application ID URI**: `api://1d922779-2742-4cf2-8c82-425cf2c60aa8`
- **Scope**: `access_as_user`

#### SPA Platform Configuration
- **Redirect URIs**: 
  - `http://localhost:4200`
  - `https://your-angular-app.azurecontainerapps.io`

#### Certificates & Secrets
For OBO flow, ApiService needs credentials. Options:
1. **Client Secret** (not recommended for production)
2. **Certificate**
3. **Federated Identity Credential** with Managed Identity (recommended for Azure)

#### API Permissions (Required for OBO)
Add permission to call the downstream API:
- **API**: `api://626cfb4f-3edb-4ec4-9cd0-64126cfaea3b`
- **Permission**: `access_as_user` (Delegated)
- **Admin Consent**: Grant admin consent

### App 2: BackendServiceAcceptingToken Configuration

#### Manifest Settings
```json
{
  "accessTokenAcceptedVersion": 2,
  "signInAudience": "AzureADMyOrg"
}
```

> ⚠️ **CRITICAL**: `accessTokenAcceptedVersion` MUST be `2`. If set to `null` or `1`, the `idtyp` claim will NOT be included in tokens, causing MISE authentication to fail.

#### API Permissions (Expose an API)
- **Application ID URI**: `api://626cfb4f-3edb-4ec4-9cd0-64126cfaea3b`
- **Scope**: `access_as_user`

#### Optional Claims Configuration
Add `idtyp` as an optional claim for access tokens:

1. Go to **Token configuration** → **Add optional claim**
2. Select **Access** token type
3. Check **idtyp**
4. Save

This ensures MISE can identify whether the token is an "app" or "user" token.

#### Authorized Client Applications
Add ApiService's ClientId as an authorized client:
- **Client ID**: `1d922779-2742-4cf2-8c82-425cf2c60aa8`
- **Authorized scopes**: Select `access_as_user`

---

## 2. .NET Aspire Configuration

### AppHost.cs

```csharp
using Aspire.Hosting.Azure;

var builder = DistributedApplication.CreateBuilder(args);

// Create a user-assigned managed identity for OBO authentication
var oboManagedIdentity = builder.AddAzureUserAssignedIdentity("obo-managed-identity");

// Backend service that accepts OBO tokens (different Entra App)
var backendServiceAcceptingToken = builder.AddProject<Projects.AuthSpa2_BackendServiceAcceptingToken>("backendserviceacceptingtoken")
    .WithHttpHealthCheck("/health");

// Backend protected service (same Entra App as ApiService)
var backendProtectedService = builder.AddProject<Projects.AuthSpa2_BackendProtectedService>("backendprotectedservice")
    .WithHttpHealthCheck("/health");

// API Service - the middle tier that performs OBO
var apiService = builder.AddProject<Projects.AuthSpa2_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints()  // Make externally accessible
    .WithReference(backendProtectedService)
    .WithReference(backendServiceAcceptingToken)
    .WithAzureUserAssignedIdentity(oboManagedIdentity);  // Assign managed identity

// Angular SPA
var angularSpa = builder.AddDockerfile("angular-spa", "../AuthSpa2.Angular")
    .WithHttpEndpoint(port: 80, targetPort: 80, name: "http")
    .WithExternalHttpEndpoints()
    .WithReference(apiService);

builder.Build().Run();
```

### Key Aspire Concepts

1. **`WithAzureUserAssignedIdentity`**: Assigns a managed identity to the ApiService, enabling it to authenticate with Azure AD for OBO token exchange without storing secrets.

2. **`WithReference`**: Enables Aspire service discovery so ApiService can call backend services using URLs like `https+http://backendserviceacceptingtoken`.

3. **`WithExternalHttpEndpoints`**: Exposes the service externally (required for Angular SPA to call ApiService directly).

---

## 3. ApiService Configuration (Middle-Tier)

### appsettings.json

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "Domain": "yourdomain.onmicrosoft.com",
    "TenantId": "72f988bf-86f1-41af-91ab-2d7cd011db47",
    "ClientId": "1d922779-2742-4cf2-8c82-425cf2c60aa8",
    "Audience": "1d922779-2742-4cf2-8c82-425cf2c60aa8",
    "ClientCredentials": [
      {
        "SourceType": "SignedAssertionFromManagedIdentity",
        "ManagedIdentityClientId": "YOUR-MANAGED-IDENTITY-CLIENT-ID",
        "TokenExchangeUrl": "api://AzureADTokenExchange"
      }
    ]
  },
  "DownstreamApi": {
    "Scopes": [ "api://626cfb4f-3edb-4ec4-9cd0-64126cfaea3b/access_as_user" ],
    "BaseUrl": "https+http://backendserviceacceptingtoken"
  }
}
```

> ⚠️ **IMPORTANT**: For OBO scopes, use the specific scope (e.g., `access_as_user`), NOT `.default`. Using `.default` can cause issues with the `idtyp` claim.

### Program.cs

```csharp
using Microsoft.Identity.ServiceEssentials;
using Microsoft.Identity.Web;
using Microsoft.Identity.Abstractions;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

// Add Aspire service defaults
builder.AddServiceDefaults();

// Add MISE authentication for incoming requests
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);

// Add Microsoft Identity Web for OBO token acquisition
builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration)
    .EnableTokenAcquisitionToCallDownstreamApi()
    .AddDownstreamApi("BackendServiceAcceptingToken", builder.Configuration.GetSection("DownstreamApi"))
    .AddInMemoryTokenCaches();

builder.Services.AddAuthorization();

// Add HttpClient for calling BackendServiceAcceptingToken
builder.Services.AddHttpClient("BackendServiceAcceptingToken", client =>
{
    client.BaseAddress = new Uri("https+http://backendserviceacceptingtoken");
});

// Add CORS
builder.Services.AddCors();

var app = builder.Build();

app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
app.UseAuthentication();
app.UseAuthorization();

// OBO Endpoint
app.MapGet("/obodata", async (
    HttpContext httpContext, 
    IHttpClientFactory httpClientFactory, 
    ITokenAcquisition tokenAcquisition, 
    IConfiguration configuration) =>
{
    try
    {
        var userIdentity = httpContext.User.FindFirst("name")?.Value
            ?? httpContext.User.FindFirst("preferred_username")?.Value
            ?? "Anonymous";

        // Get scopes for the downstream API
        var scopes = configuration.GetSection("DownstreamApi:Scopes").Get<string[]>() 
            ?? new[] { "api://626cfb4f-3edb-4ec4-9cd0-64126cfaea3b/access_as_user" };

        // *** THIS IS THE OBO TOKEN EXCHANGE ***
        // Exchange the user's token for a new token targeting the downstream API
        string oboToken = await tokenAcquisition.GetAccessTokenForUserAsync(scopes);

        // Create HttpClient and attach the OBO token
        var httpClient = httpClientFactory.CreateClient("BackendServiceAcceptingToken");
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", oboToken);

        // Call the downstream service with the OBO token
        var response = await httpClient.GetAsync("/api/obodata");
        
        if (!response.IsSuccessStatusCode)
        {
            return Results.Problem(
                statusCode: (int)response.StatusCode,
                title: "OBO backend service call failed",
                detail: await response.Content.ReadAsStringAsync()
            );
        }

        var backendData = await response.Content.ReadAsStringAsync();
        
        return Results.Ok(new
        {
            Message = "Data retrieved via OBO flow",
            CalledBy = userIdentity,
            OboFlowInfo = "Token was exchanged using On-Behalf-Of flow",
            BackendResponse = System.Text.Json.JsonDocument.Parse(backendData).RootElement
        });
    }
    catch (MicrosoftIdentityWebChallengeUserException ex)
    {
        return Results.Problem(
            statusCode: 401,
            title: "Token acquisition failed - consent required",
            detail: ex.Message
        );
    }
    catch (Exception ex)
    {
        return Results.Problem(
            statusCode: 500,
            title: "Error in OBO flow",
            detail: ex.Message
        );
    }
})
.RequireAuthorization();

app.Run();
```

### Required NuGet Packages (ApiService)

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.Identity.ServiceEssentials.AspNetCore" Version="2.0.0-rc.3" />
  <PackageReference Include="Microsoft.Identity.Web" Version="3.8.2" />
  <PackageReference Include="Microsoft.Identity.Web.DownstreamApi" Version="3.8.2" />
</ItemGroup>
```

---

## 4. BackendServiceAcceptingToken Configuration

### appsettings.json

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "72f988bf-86f1-41af-91ab-2d7cd011db47",
    "ClientId": "626cfb4f-3edb-4ec4-9cd0-64126cfaea3b",
    "Audience": "626cfb4f-3edb-4ec4-9cd0-64126cfaea3b"
  }
}
```

### Program.cs

```csharp
using Microsoft.Identity.ServiceEssentials;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add MISE authentication (validates OBO tokens)
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);

builder.Services.AddAuthorization();
builder.Services.AddControllers();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### OboDataController.cs

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthSpa2.BackendServiceAcceptingToken.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OboDataController : ControllerBase
{
    private readonly ILogger<OboDataController> _logger;

    public OboDataController(ILogger<OboDataController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public IActionResult GetOboData()
    {
        // Extract user identity from the OBO token
        var userIdentity = User.FindFirst("name")?.Value
            ?? User.FindFirst("preferred_username")?.Value
            ?? User.Identity?.Name
            ?? "Anonymous";

        var userId = User.FindFirst("oid")?.Value ?? "Unknown";

        // Extract all claims from the OBO token
        var claims = User.Claims.Select(c => new { Type = c.Type, Value = c.Value }).ToList();
        
        // Extract roles
        var roles = User.Claims
            .Where(c => c.Type == "roles")
            .Select(c => c.Value)
            .ToList();

        _logger.LogInformation("OBO request received for user {User} ({UserId})", userIdentity, userId);

        return Ok(new
        {
            Service = "BackendServiceAcceptingToken",
            Message = "This data was retrieved using an OBO token!",
            EntraAppId = "626cfb4f-3edb-4ec4-9cd0-64126cfaea3b",
            RequestedBy = userIdentity,
            UserId = userId,
            Roles = roles,
            Claims = claims,
            Timestamp = DateTime.UtcNow,
            TokenType = "OBO Token (different audience than original token)"
        });
    }
}
```

### Required NuGet Packages (BackendServiceAcceptingToken)

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.Identity.ServiceEssentials.AspNetCore" Version="2.0.0-rc.3" />
</ItemGroup>
```

---

## 5. Angular SPA Configuration

### environment.ts

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://apiservice.yourdomain.azurecontainerapps.io',
  msalConfig: {
    auth: {
      clientId: '1d922779-2742-4cf2-8c82-425cf2c60aa8',
      authority: 'https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47',
      redirectUri: '/',
    },
    scopes: ['api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'],
  },
};
```

### app.config.ts (MSAL Configuration)

```typescript
import { MsalInterceptorConfiguration, MsalGuardConfiguration } from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';
import { environment } from '../environments/environment';

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  
  // Protect calls to ApiService
  protectedResourceMap.set(`${environment.apiUrl}/*`, [
    'api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user'
  ]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}
```

### Calling the OBO Endpoint

```typescript
callOboService(): void {
  const apiUrl = `${environment.apiUrl}/obodata`;

  // MSAL Interceptor automatically attaches the user's token
  this.http.get<any>(apiUrl).subscribe({
    next: (data) => {
      console.log('OBO Service Response:', data);
      // data.backendResponse contains the response from BackendServiceAcceptingToken
    },
    error: (err) => {
      console.error('OBO service call failed:', err);
    }
  });
}
```

---

## 6. Token Flow Visualization

```
Step 1: User logs into Angular SPA
┌─────────────┐                    ┌─────────────┐
│ Angular SPA │───── Login ───────▶│  Azure AD   │
│             │◀── User Token ─────│             │
│             │   (aud: 1d922...)  │             │
└─────────────┘                    └─────────────┘

Step 2: Angular calls ApiService with user token
┌─────────────┐                    ┌─────────────┐
│ Angular SPA │── Bearer Token ───▶│ ApiService  │
│             │   (aud: 1d922...)  │             │
└─────────────┘                    └─────────────┘

Step 3: ApiService exchanges token via OBO
┌─────────────┐                    ┌─────────────┐
│ ApiService  │── OBO Request ────▶│  Azure AD   │
│             │   (user token +    │             │
│             │    client creds)   │             │
│             │◀── OBO Token ──────│             │
│             │   (aud: 626cfb...) │             │
└─────────────┘                    └─────────────┘

Step 4: ApiService calls downstream API with OBO token
┌─────────────┐                    ┌──────────────────────────────┐
│ ApiService  │── Bearer Token ───▶│ BackendServiceAcceptingToken │
│             │   (aud: 626cfb...) │                              │
│             │◀── Response ───────│  Validates OBO token         │
└─────────────┘                    └──────────────────────────────┘
```

---

## 7. Common Issues and Solutions

### Issue 1: `idtyp` claim is required but was not present

**Error:**
```
The 'idtyp' claim is required but was not present in the token
```

**Solution:**
1. Ensure `accessTokenAcceptedVersion` is set to `2` in the app manifest
2. Add `idtyp` as an optional claim in Token configuration
3. Use specific scope (e.g., `access_as_user`) instead of `.default`

### Issue 2: AADSTS65001 - Consent Required

**Error:**
```
The user or administrator has not consented to use the application
```

**Solution:**
1. Go to App 1 (ApiService) → API permissions
2. Add permission for App 2's scope (`api://626cfb.../access_as_user`)
3. Grant admin consent

### Issue 3: AADSTS700024 - Client assertion audience claim doesn't match

**Solution:**
Ensure the managed identity's federated credential has:
- **Issuer**: `https://login.microsoftonline.com/{tenant-id}/v2.0`
- **Subject**: The managed identity's client ID
- **Audience**: `api://AzureADTokenExchange`

### Issue 4: Token has wrong audience

**Solution:**
Verify that:
1. Angular requests token with scope `api://1d922779.../access_as_user`
2. ApiService requests OBO token with scope `api://626cfb4f.../access_as_user`
3. BackendServiceAcceptingToken validates audience `626cfb4f...`

---

## 8. Security Best Practices

1. **Use Managed Identity**: Instead of client secrets, use Azure Managed Identity for OBO token acquisition in ApiService.

2. **Minimize Scope**: Request only the specific scopes needed, not `.default`.

3. **Validate Claims**: Always validate relevant claims (aud, iss, oid, etc.) in your APIs.

4. **Token Caching**: Use `AddInMemoryTokenCaches()` or distributed caching to avoid excessive token requests.

5. **HTTPS Only**: Ensure all communication uses HTTPS in production.

6. **Authorized Clients**: Configure authorized client applications in Azure AD to restrict which apps can request OBO tokens.

---

## 9. Testing the Flow

### Local Development

1. Run Aspire AppHost:
   ```bash
   cd AuthSpa2.AppHost
   dotnet run
   ```

2. Navigate to the Angular SPA in the Aspire dashboard

3. Sign in and click "Call OBO Service"

4. Verify:
   - ApiService receives user token
   - OBO token is acquired
   - BackendServiceAcceptingToken receives OBO token with correct audience

### Azure Deployment

```bash
cd AuthSpa2.AppHost
aspire deploy
```

---

## 10. Summary

| Component | Configuration Key |
|-----------|-------------------|
| **App 1 (SPA + ApiService)** | ClientId: `1d922779-...`, accessTokenAcceptedVersion: 2 |
| **App 2 (BackendService)** | ClientId: `626cfb4f-...`, accessTokenAcceptedVersion: 2, idtyp claim |
| **ApiService** | MISE auth + Microsoft.Identity.Web for OBO |
| **BackendService** | MISE auth only |
| **OBO Scope** | `api://626cfb4f-.../access_as_user` (NOT `.default`) |
| **Managed Identity** | Assigned to ApiService via Aspire |

The OBO flow enables secure, delegated access across service boundaries while preserving user identity and enforcing proper authorization at each tier.
