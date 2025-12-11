# Create React SPA with ASP.NET Core API using Microsoft Aspire 13 & MISE

## Project Overview
Create a complete authentication solution demonstrating:
- **React SPA** with MSAL React (Authorization Code Flow with PKCE)
- **ASP.NET Core API** with Microsoft.Identity.ServiceEssentials (MISE) for JWT Bearer authentication
- **ASP.NET Core Backend Service** demonstrating token forwarding between services
- **Microsoft Aspire 13** for service orchestration and service discovery
- **Single Microsoft Entra ID App Registration** (no client secrets, public client)

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐         ┌──────────────────────────┐
│   React SPA         │         │  ASP.NET Core API    │         │  Backend Protected       │
│   (Port 4200)       │         │  (Dynamic Port)      │         │  Service (Port 7002)     │
│                     │         │                      │         │                          │
│  - MSAL React       │────────▶│  - MISE Auth         │────────▶│  - MISE Auth             │
│  - PKCE Flow        │  Bearer │  - Token Forwarding  │  Bearer │  - [Authorize] Endpoints │
│  - Auto Token Mgmt  │  Token  │  - [Authorize]       │  Token  │  - Protected Data        │
└─────────────────────┘         └──────────────────────┘         └──────────────────────────┘
         │                               │                                  │
         └───────────────────────────────┼──────────────────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Microsoft Entra ID │
                              │  App Registration   │
                              │                     │
                              │  Token Version: v2  │
                              │  idtyp claim: ✓     │
                              │  Scope:             │
                              │  access_as_user     │
                              └─────────────────────┘
```

## Prerequisites

1. **.NET 10 SDK** or later
2. **Node.js 18+** and npm
3. **Aspire CLI** - Install via:
   ```powershell
   dotnet workload install aspire
   ```
4. **Microsoft Entra ID App Registration** with:
   - Single app registration (public client, no secrets)
   - Redirect URI: `http://localhost:3000` (or your React dev server port)
   - Exposed API scope: `api://<ClientId>/access_as_user`
   - **Access Token Version: v2.0** (CRITICAL for MISE)
   - **Optional Claim: `idtyp` with `include_user_token` additional property** (CRITICAL for MISE)

## Project Structure

Create the following solution structure:

```
AuthReactSpa/
├── AuthReactSpa.sln                          # Solution file
│
├── AuthReactSpa.AppHost/                     # Aspire orchestration host
│   ├── AuthReactSpa.AppHost.csproj
│   ├── AppHost.cs                            # Service orchestration
│   ├── appsettings.json
│   └── Properties/
│       └── launchSettings.json
│
├── AuthReactSpa.ServiceDefaults/             # Shared Aspire configuration
│   ├── AuthReactSpa.ServiceDefaults.csproj
│   └── Extensions.cs                         # OpenTelemetry, health checks
│
├── AuthReactSpa.ApiService/                  # ASP.NET Core Web API
│   ├── AuthReactSpa.ApiService.csproj
│   ├── Program.cs                            # MISE authentication setup
│   ├── appsettings.json                      # Azure AD configuration
│   ├── appsettings.Development.json
│   └── Properties/
│       └── launchSettings.json
│
├── AuthReactSpa.BackendProtectedService/     # Backend protected service
│   ├── AuthReactSpa.BackendProtectedService.csproj
│   ├── Program.cs                            # MISE authentication setup
│   ├── appsettings.json                      # Azure AD configuration
│   ├── appsettings.Development.json
│   ├── Controllers/
│   │   └── DataController.cs                 # Protected endpoint
│   └── Properties/
│       └── launchSettings.json
│
├── AuthReactSpa.React/                       # React SPA
│   ├── package.json                          # Dependencies
│   ├── vite.config.ts                        # Vite configuration
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx                          # Entry point
│       ├── App.tsx                           # Main component
│       ├── App.css
│       ├── authConfig.ts                     # MSAL configuration
│       └── components/
│           ├── SignInButton.tsx
│           ├── SignOutButton.tsx
│           └── ProfileContent.tsx
│
├── README.md                                 # Comprehensive documentation
├── ENTRA_ID_SETUP.md                         # App registration guide
├── AUTHENTICATION_FLOW.md                    # Detailed auth flow
├── OAUTH_SCOPES_EXPLAINED.md                 # Scope selection guide
├── MISE_FIX.md                               # Troubleshooting MISE
├── BACKEND_SERVICE_ARCHITECTURE.md           # Token forwarding guide
├── QUICKSTART.md                             # Quick start guide
└── .gitignore                                # Git ignore file
```

## Implementation Steps

### Step 1: Create Entra ID App Registration

#### 1.1 Create App Registration
1. Navigate to Azure Portal → Entra ID → App Registrations
2. Click **New registration**
3. Name: `AuthReactSpa` (or your preferred name)
4. Supported account types: **Accounts in this organizational directory only** (or multitenant if needed)
5. Redirect URI: 
   - Platform: **Single-page application (SPA)**
   - URI: `http://localhost:3000`
6. Click **Register**
7. Note the **Application (client) ID** and **Directory (tenant) ID**

#### 1.2 Expose API Scope
1. Go to **Expose an API**
2. Click **Add a scope**
3. Accept the default Application ID URI: `api://<ClientId>`
4. Add scope:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: Access API as user
   - **Admin consent description**: Allows the app to access the API on behalf of the signed-in user
   - **User consent display name**: Access API as you
   - **User consent description**: Allows the app to access the API on your behalf
   - **State**: Enabled
5. Click **Add scope**

#### 1.3 Configure Authentication
1. Go to **Authentication**
2. Under **Single-page application**, verify redirect URI: `http://localhost:3000`
3. Under **Implicit grant and hybrid flows**:
   - ❌ Do NOT enable Access tokens or ID tokens (PKCE doesn't need these)
4. Under **Advanced settings**:
   - **Allow public client flows**: Yes

#### 1.4 API Permissions
1. Go to **API Permissions**
2. Click **Add a permission**
3. Select **My APIs**
4. Select your app
5. Select **Delegated permissions**
6. Check ✅ `access_as_user`
7. Click **Add permissions**
8. (Optional) Click **Grant admin consent** for faster testing

#### 1.5 Token Configuration (CRITICAL for MISE)
1. Go to **Token configuration**
2. Click **+ Add optional claim**
3. Token type: **Access**
4. Check ✅ **`idtyp`** claim
5. Click **Add**
6. If prompted about Microsoft Graph permissions, click **Add**

#### 1.6 Manifest Configuration (CRITICAL for MISE)
1. Go to **Manifest**
2. Find `accessTokenAcceptedVersion` and set to `2`:
   ```json
   "accessTokenAcceptedVersion": 2,
   ```
3. Find `optionalClaims` section and ensure it includes:
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
   },
   ```
   **IMPORTANT**: The `additionalProperties: ["include_user_token"]` is required for MISE to work properly!
4. Click **Save**

**⚠️ CRITICAL**: Without v2.0 tokens and the `idtyp` claim with `include_user_token`, MISE will fail with:
```
MISE12021: The 'idtyp' claim is required but was not present in the token
```

### Step 2: Create .NET Solution and Projects

```powershell
# Create Aspire starter app (creates solution, AppHost, and ServiceDefaults)
aspire new AuthReactSpa

cd AuthReactSpa

# Create API Service
dotnet new webapi -n AuthReactSpa.ApiService
dotnet sln add AuthReactSpa.ApiService

# Create Backend Protected Service
dotnet new webapi -n AuthReactSpa.BackendProtectedService
dotnet sln add AuthReactSpa.BackendProtectedService

# Add project references
cd AuthReactSpa.ApiService
dotnet add reference ../AuthReactSpa.ServiceDefaults/AuthReactSpa.ServiceDefaults.csproj
cd ..

cd AuthReactSpa.BackendProtectedService
dotnet add reference ../AuthReactSpa.ServiceDefaults/AuthReactSpa.ServiceDefaults.csproj
cd ..

cd AuthReactSpa.AppHost
dotnet add reference ../AuthReactSpa.ApiService/AuthReactSpa.ApiService.csproj
dotnet add reference ../AuthReactSpa.BackendProtectedService/AuthReactSpa.BackendProtectedService.csproj
cd ..
```

### Step 3: Add MISE NuGet Packages

```powershell
# Add MISE to ApiService
cd AuthReactSpa.ApiService
dotnet add package Microsoft.Identity.ServiceEssentials --version 2.0.0-rc.3
cd ..

# Add MISE to BackendProtectedService
cd AuthReactSpa.BackendProtectedService
dotnet add package Microsoft.Identity.ServiceEssentials --version 2.0.0-rc.3
cd ..
```

### Step 4: Configure ApiService

#### 4.1 Update `appsettings.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<YOUR_TENANT_ID>",
    "ClientId": "<YOUR_CLIENT_ID>",
    "Audience": "api://<YOUR_CLIENT_ID>"
  }
}
```

#### 4.2 Update `Program.cs`

```csharp
using Microsoft.Identity.ServiceEssentials;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations
builder.AddServiceDefaults();

// Add MISE authentication
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);

builder.Services.AddAuthorization();

// Add HttpClient for calling BackendProtectedService with service discovery
builder.Services.AddHttpClient("BackendProtectedService", client =>
{
    // Aspire service discovery will resolve this
    client.BaseAddress = new Uri("https+http://backendprotectedservice");
});

// Add CORS for React SPA
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

// Enable CORS before authentication
app.UseCors();

// Enable authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

string[] summaries = ["Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"];

app.MapGet("/", () => "API service is running. Navigate to /weatherforecast");

// Protected endpoint
app.MapGet("/weatherforecast", (HttpContext httpContext) =>
{
    var userIdentity = httpContext.User.FindFirst("name")?.Value
        ?? httpContext.User.FindFirst("preferred_username")?.Value
        ?? httpContext.User.Identity?.Name 
        ?? "Anonymous";
    
    var userId = httpContext.User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value 
        ?? httpContext.User.FindFirst("oid")?.Value 
        ?? "Unknown";
    
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    
    return new
    {
        User = userIdentity,
        UserId = userId,
        Forecast = forecast
    };
})
.WithName("GetWeatherForecast")
.RequireAuthorization();

// Protected endpoint with token forwarding to BackendProtectedService
app.MapGet("/backenddata", async (HttpContext httpContext, IHttpClientFactory httpClientFactory) =>
{
    try
    {
        // Extract Authorization header from incoming request
        var authHeader = httpContext.Request.Headers["Authorization"].ToString();
        
        if (string.IsNullOrEmpty(authHeader))
        {
            return Results.Unauthorized();
        }

        var userIdentity = httpContext.User.FindFirst("name")?.Value
            ?? httpContext.User.FindFirst("preferred_username")?.Value
            ?? "Unknown";

        // Create HttpClient and forward the token
        var httpClient = httpClientFactory.CreateClient("BackendProtectedService");
        httpClient.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(authHeader);

        // Call backend service
        var response = await httpClient.GetAsync("/api/data");

        if (!response.IsSuccessStatusCode)
        {
            return Results.Problem($"Backend service returned {response.StatusCode}");
        }

        var backendData = await response.Content.ReadFromJsonAsync<object>();

        return Results.Ok(new
        {
            Message = "Data retrieved from BackendProtectedService via ApiService",
            CalledBy = userIdentity,
            BackendResponse = backendData
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error calling backend service: {ex.Message}");
    }
})
.WithName("GetBackendData")
.RequireAuthorization();

app.MapDefaultEndpoints();

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
```

### Step 5: Configure BackendProtectedService

#### 5.1 Update `appsettings.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<YOUR_TENANT_ID>",
    "ClientId": "<YOUR_CLIENT_ID>",
    "Audience": "api://<YOUR_CLIENT_ID>"
  }
}
```

#### 5.2 Update `Program.cs`

```csharp
using Microsoft.Identity.ServiceEssentials;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations
builder.AddServiceDefaults();

// Add MISE authentication
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.MapDefaultEndpoints();

app.Run();
```

#### 5.3 Create `Controllers/DataController.cs`

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthReactSpa.BackendProtectedService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DataController : ControllerBase
{
    private readonly ILogger<DataController> _logger;

    public DataController(ILogger<DataController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public IActionResult GetData()
    {
        var userIdentity = User.FindFirst("name")?.Value
            ?? User.FindFirst("preferred_username")?.Value
            ?? User.Identity?.Name
            ?? "Anonymous";

        var userId = User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
            ?? User.FindFirst("oid")?.Value
            ?? "Unknown";

        _logger.LogInformation("BackendProtectedService: GetData called by {User} ({UserId})", userIdentity, userId);

        return Ok(new
        {
            Message = "This is protected data from BackendProtectedService",
            RequestedBy = userIdentity,
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Data = new[]
            {
                new { Id = 1, Name = "Sample Item 1", Value = "Backend Value 1" },
                new { Id = 2, Name = "Sample Item 2", Value = "Backend Value 2" },
                new { Id = 3, Name = "Sample Item 3", Value = "Backend Value 3" }
            }
        });
    }
}
```

#### 5.4 Update `Properties/launchSettings.json`

```json
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  "profiles": {
    "https": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "applicationUrl": "https://localhost:7002;http://localhost:5002",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

### Step 6: Configure Aspire AppHost

#### 6.1 Update `AppHost.cs`

```csharp
var builder = DistributedApplication.CreateBuilder(args);

// Add backend protected service
var backendprotectedservice = builder.AddProject<Projects.AuthReactSpa_BackendProtectedService>("backendprotectedservice");

// Add API service with reference to backend
var apiservice = builder.AddProject<Projects.AuthReactSpa_ApiService>("apiservice")
    .WithReference(backendprotectedservice);

// Add React SPA (npm project)
var reactSpa = builder.AddNpmApp("react-spa", "../AuthReactSpa.React", "dev")
    .WithReference(apiservice)
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

builder.Build().Run();
```

### Step 7: Create React Application

#### 7.1 Initialize React with Vite

```powershell
# From solution root
npm create vite@latest AuthReactSpa.React -- --template react-ts
cd AuthReactSpa.React
npm install
```

#### 7.2 Install MSAL React

```powershell
npm install @azure/msal-browser @azure/msal-react
```

#### 7.3 Create `src/authConfig.ts`

```typescript
import { Configuration, PopupRequest } from "@azure/msal-browser";

// MSAL Configuration
export const msalConfig: Configuration = {
    auth: {
        clientId: "<YOUR_CLIENT_ID>",
        authority: "https://login.microsoftonline.com/<YOUR_TENANT_ID>",
        redirectUri: "http://localhost:3000",
        postLogoutRedirectUri: "http://localhost:3000"
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case 0:
                        console.error(message);
                        return;
                    case 1:
                        console.info(message);
                        return;
                    case 2:
                        console.debug(message);
                        return;
                    case 3:
                        console.warn(message);
                        return;
                }
            }
        }
    }
};

// Scopes for login
export const loginRequest: PopupRequest = {
    scopes: [
        "openid",
        "profile",
        "api://<YOUR_CLIENT_ID>/access_as_user"
    ]
};

// API endpoint
export const apiConfig = {
    weatherForecastEndpoint: "https://apiservice.dev.localhost:7001/weatherforecast",
    backendDataEndpoint: "https://apiservice.dev.localhost:7001/backenddata"
};
```

#### 7.4 Update `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import App from './App';
import { msalConfig } from './authConfig';
import './index.css';

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
await msalInstance.initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>,
);
```

#### 7.5 Create `src/components/SignInButton.tsx`

```typescript
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export const SignInButton = () => {
    const { instance } = useMsal();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch(e => {
            console.error(e);
        });
    };

    return (
        <button onClick={handleLogin} className="btn btn-primary">
            Sign In with Microsoft
        </button>
    );
};
```

#### 7.6 Create `src/components/SignOutButton.tsx`

```typescript
import { useMsal } from "@azure/msal-react";

export const SignOutButton = () => {
    const { instance } = useMsal();

    const handleLogout = () => {
        instance.logoutRedirect({
            postLogoutRedirectUri: "http://localhost:3000",
        });
    };

    return (
        <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
        </button>
    );
};
```

#### 7.7 Create `src/components/ProfileContent.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest, apiConfig } from '../authConfig';

export const ProfileContent = () => {
    const { instance, accounts } = useMsal();
    const [weatherData, setWeatherData] = useState<any>(null);
    const [backendData, setBackendData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [loadingBackend, setLoadingBackend] = useState(false);
    const [error, setError] = useState('');
    const [backendError, setBackendError] = useState('');

    const name = accounts[0]?.name || accounts[0]?.username || 'User';

    const callWeatherApi = async () => {
        setLoading(true);
        setError('');
        
        try {
            // Acquire token silently
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0]
            });

            // Call API with Bearer token
            const apiResponse = await fetch(apiConfig.weatherForecastEndpoint, {
                headers: {
                    'Authorization': `Bearer ${response.accessToken}`
                }
            });

            if (!apiResponse.ok) {
                throw new Error(`API returned ${apiResponse.status}`);
            }

            const data = await apiResponse.json();
            setWeatherData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to call API');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const callBackendService = async () => {
        setLoadingBackend(true);
        setBackendError('');
        
        try {
            // Acquire token silently
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0]
            });

            // Call backend API with Bearer token
            const apiResponse = await fetch(apiConfig.backendDataEndpoint, {
                headers: {
                    'Authorization': `Bearer ${response.accessToken}`
                }
            });

            if (!apiResponse.ok) {
                throw new Error(`API returned ${apiResponse.status}`);
            }

            const data = await apiResponse.json();
            setBackendData(data);
        } catch (err: any) {
            setBackendError(err.message || 'Failed to call backend service');
            console.error(err);
        } finally {
            setLoadingBackend(false);
        }
    };

    return (
        <div className="profile-content">
            <h2>Welcome, {name}!</h2>
            <p>You are successfully authenticated.</p>

            <div className="api-section">
                <h3>Protected API Call</h3>
                <button 
                    onClick={callWeatherApi} 
                    disabled={loading}
                    className="btn btn-primary"
                >
                    {loading ? 'Loading...' : 'Call Weather API'}
                </button>

                {error && <div className="error">{error}</div>}

                {weatherData && (
                    <div className="api-response">
                        <h4>Weather Forecast</h4>
                        <p><strong>User:</strong> {weatherData.user}</p>
                        <p><strong>User ID:</strong> {weatherData.userId}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Temp. (C)</th>
                                    <th>Temp. (F)</th>
                                    <th>Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weatherData.forecast.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td>{item.date}</td>
                                        <td>{item.temperatureC}</td>
                                        <td>{item.temperatureF}</td>
                                        <td>{item.summary}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="api-section">
                <h3>Backend Service Call (Token Forwarding)</h3>
                <button 
                    onClick={callBackendService} 
                    disabled={loadingBackend}
                    className="btn btn-primary"
                >
                    {loadingBackend ? 'Loading...' : 'Call Backend Service'}
                </button>

                {backendError && <div className="error">{backendError}</div>}

                {backendData && (
                    <div className="api-response">
                        <h4>Backend Service Response</h4>
                        <p><strong>Message:</strong> {backendData.message}</p>
                        <p><strong>Called By:</strong> {backendData.calledBy}</p>
                        <h5>Backend Response:</h5>
                        <p><strong>Message:</strong> {backendData.backendResponse.message}</p>
                        <p><strong>Requested By:</strong> {backendData.backendResponse.requestedBy}</p>
                        <p><strong>User ID:</strong> {backendData.backendResponse.userId}</p>
                        <p><strong>Timestamp:</strong> {backendData.backendResponse.timestamp}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backendData.backendResponse.data.map((item: any) => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td>{item.name}</td>
                                        <td>{item.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
```

#### 7.8 Update `src/App.tsx`

```typescript
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { SignInButton } from './components/SignInButton';
import { SignOutButton } from './components/SignOutButton';
import { ProfileContent } from './components/ProfileContent';
import './App.css';

function App() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <div className="App">
      <header className="App-header">
        <h1>React SPA with MSAL & ASP.NET Core API</h1>
        <p>Powered by Microsoft Aspire 13 & MISE</p>
        {isAuthenticated ? <SignOutButton /> : <SignInButton />}
      </header>
      <main>
        {isAuthenticated ? (
          <ProfileContent />
        ) : (
          <div className="welcome">
            <h2>Welcome!</h2>
            <p>Please sign in to access protected API resources.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

#### 7.9 Update `src/App.css`

```css
.App {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.App-header {
  text-align: center;
  padding: 20px;
  background-color: #0078d4;
  color: white;
  border-radius: 8px;
  margin-bottom: 30px;
}

.App-header h1 {
  margin: 0 0 10px 0;
}

.App-header p {
  margin: 0 0 20px 0;
}

.btn {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 5px;
}

.btn-primary {
  background-color: #0078d4;
  color: white;
}

.btn-primary:hover {
  background-color: #106ebe;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.welcome {
  text-align: center;
  padding: 40px;
}

.profile-content {
  padding: 20px;
}

.api-section {
  margin: 30px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.api-section h3 {
  margin-top: 0;
}

.api-response {
  margin-top: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.error {
  color: red;
  margin: 10px 0;
  padding: 10px;
  background-color: #ffe6e6;
  border-radius: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

table th,
table td {
  padding: 10px;
  text-align: left;
  border: 1px solid #ddd;
}

table th {
  background-color: #0078d4;
  color: white;
}

table tr:nth-child(even) {
  background-color: #f2f2f2;
}
```

#### 7.10 Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    cors: true
  }
});
```

#### 7.11 Update `package.json`

Add scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### Step 8: Create Documentation Files

#### 8.1 Create `.gitignore`

```
## .NET Artifacts
bin/
obj/
*.dll
*.pdb
*.user
*.suo
.vs/
.vscode/
packages/

## React Artifacts
node_modules/
dist/
build/
.vite/
*.log

## OS Files
.DS_Store
Thumbs.db
```

#### 8.2 Create `README.md`

Include comprehensive documentation covering:
- Project overview and architecture
- Prerequisites
- Entra ID setup steps (with v2.0 tokens and idtyp claim)
- Running the application
- Authentication flow diagrams
- API endpoint documentation
- Troubleshooting section (especially MISE authentication)
- Token claims explanation

#### 8.3 Create `ENTRA_ID_SETUP.md`

Detailed step-by-step guide for:
- Creating app registration
- Exposing API scopes
- Configuring authentication
- Adding API permissions
- **Token configuration with idtyp claim**
- **Manifest configuration with v2.0 tokens and include_user_token**

#### 8.4 Create `MISE_FIX.md`

Troubleshooting guide for common MISE errors:
- MISE12021: idtyp claim required
- Steps to fix: accessTokenAcceptedVersion = 2
- Adding idtyp optional claim with include_user_token
- Geneva telemetry warnings (non-fatal)

#### 8.5 Create `OAUTH_SCOPES_EXPLAINED.md`

Comprehensive guide explaining:
- Why `api://<ClientId>/access_as_user` vs `.default`
- Delegated permissions vs application permissions
- Custom scopes for SPAs
- When to use each scope format
- ID token vs Access token (MSAL generates BOTH)
- Token flow diagram
- Claims comparison

#### 8.6 Create `BACKEND_SERVICE_ARCHITECTURE.md`

Token forwarding documentation:
- Multi-tier architecture overview
- How token forwarding works
- Service discovery with Aspire
- Testing steps
- Security considerations

#### 8.7 Create `QUICKSTART.md`

Quick start guide:
- 5-minute setup
- Prerequisites check
- Installation steps
- Running the application
- Common commands

## Key Implementation Details

### MISE Authentication Setup

**Critical Points**:
1. Use `MiseAuthenticationDefaults.AuthenticationScheme` (NOT JwtBearerDefaults)
2. Use `.AddMiseWithDefaultModules(builder.Configuration)` for setup
3. MISE requires v2.0 tokens with `idtyp` claim
4. The `include_user_token` additional property is REQUIRED in optionalClaims

**Example**:
```csharp
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);
```

### OAuth Scopes Configuration

**Use custom scope for delegated permissions**:
```typescript
scopes: [
    "openid",                                    // OIDC: ID token
    "profile",                                   // OIDC: Profile claims
    "api://<ClientId>/access_as_user"           // Custom API scope
]
```

**DO NOT use `.default` scope** - that's for daemon/service apps with client credentials flow.

### Token Forwarding Pattern

Extract Authorization header from incoming request and forward to backend service:

```csharp
var authHeader = httpContext.Request.Headers["Authorization"].ToString();
var httpClient = httpClientFactory.CreateClient("BackendProtectedService");
httpClient.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(authHeader);
var response = await httpClient.GetAsync("/api/data");
```

### MSAL React vs MSAL Angular

**Key Differences**:
- React uses `useMsal()` hook instead of injecting `MsalService`
- React uses `<MsalProvider>` wrapper component
- React uses `acquireTokenSilent()` for API calls
- React has separate components for SignIn/SignOut buttons

### Aspire Service Discovery

Backend service resolution:
```csharp
client.BaseAddress = new Uri("https+http://backendprotectedservice");
```

Aspire automatically resolves `backendprotectedservice` to the actual URL.

## Testing Steps

1. **Start the application**:
   ```powershell
   cd AuthReactSpa
   dotnet build
   cd AuthReactSpa.AppHost
   dotnet run
   ```

2. **Open React app**: Navigate to `http://localhost:3000`

3. **Sign in**: Click "Sign In with Microsoft"

4. **Test direct API**: Click "Call Weather API" → Should show weather forecast with user info

5. **Test token forwarding**: Click "Call Backend Service" → Should show backend data

6. **Verify tokens**:
   - Open browser DevTools → Network tab
   - Click API buttons
   - Check Authorization headers contain Bearer token
   - Verify both services respond with 200 OK

7. **Check Aspire Dashboard**: 
   - Open dashboard (usually http://localhost:15000)
   - Verify all three services are running
   - Check logs for authentication success

## Expected Behavior

### Successful Authentication
- User redirects to Microsoft login
- After consent, redirects back to React app
- Access token stored in localStorage
- User name displayed in UI

### Protected API Calls
- MSAL automatically attaches Bearer token
- ApiService validates token with MISE
- Returns data with user context
- No 401 Unauthorized errors

### Token Forwarding
- ApiService receives token from React
- Forwards same token to BackendProtectedService
- BackendProtectedService validates token with MISE
- Returns data with user context
- All services see same user identity

## Common Issues and Solutions

### Issue: MISE12021 Error
**Problem**: `The 'idtyp' claim is required but was not present in the token`

**Solution**:
1. Set `accessTokenAcceptedVersion: 2` in manifest
2. Add `idtyp` optional claim for Access tokens
3. Ensure `include_user_token` in additionalProperties
4. Clear browser cache and re-authenticate

### Issue: Geneva Telemetry Errors
**Problem**: `Failed to instantiate AuditLogger`

**Solution**: These are non-fatal. Suppress in appsettings.Development.json:
```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.Identity.ServiceEssentials": "Warning",
      "OpenTelemetry.Exporter.Geneva": "None"
    }
  }
}
```

### Issue: CORS Errors
**Problem**: `Access-Control-Allow-Origin` errors

**Solution**: 
1. Verify CORS configured in ApiService before UseAuthentication
2. Check React app URL matches CORS policy
3. Ensure preflight OPTIONS requests are handled

### Issue: Token Not Attached to Requests
**Problem**: API returns 401 Unauthorized

**Solution**:
1. Verify API endpoint matches protectedResourceMap in authConfig
2. Check acquireTokenSilent() is called before fetch
3. Verify Authorization header is set correctly

## Additional Notes

### Why MISE over Microsoft.Identity.Web?

MISE (Microsoft Identity Service Essentials) is the modern replacement for Microsoft.Identity.Web:
- Lighter weight
- Better performance
- Built for cloud-native scenarios
- Requires v2.0 tokens (best practice)
- Enforces idtyp claim (better security)

### Token Lifetime

Access tokens expire after 1 hour by default. MSAL automatically handles token refresh using the refresh token stored in cache. Use `acquireTokenSilent()` for automatic refresh.

### Security Best Practices

1. ✅ Use PKCE flow (no client secrets in SPA)
2. ✅ Use v2.0 tokens with idtyp claim
3. ✅ Validate tokens at every service tier
4. ✅ Use HTTPS in production
5. ✅ Implement proper CORS policies
6. ✅ Never log tokens or sensitive claims
7. ✅ Use scoped API permissions (not .default)

### Deployment Considerations

For production deployment:
1. Update redirect URIs to production URLs
2. Configure production API endpoints
3. Use environment-specific appsettings
4. Enable SSL/TLS certificates
5. Configure proper CORS origins
6. Set up Application Insights for monitoring
7. Use Azure Key Vault for secrets (if any)

## Success Criteria

You will know the implementation is successful when:

✅ User can sign in with Microsoft account  
✅ User name displays in React UI  
✅ "Call Weather API" returns data with user context  
✅ "Call Backend Service" returns data via token forwarding  
✅ All three services appear in Aspire Dashboard  
✅ No MISE12021 errors in logs  
✅ Tokens contain `idtyp: "user"` and `ver: "2.0"`  
✅ API endpoints require valid Bearer token  
✅ Same user identity appears in all service logs  
✅ Service discovery resolves backend service correctly  

## End of Prompt

This comprehensive prompt incorporates all learnings from the Angular implementation, including:
- MISE authentication setup with v2.0 tokens
- idtyp claim requirement with include_user_token
- Token forwarding architecture
- OAuth scope selection (access_as_user vs .default)
- Service discovery with Aspire
- Proper CORS configuration
- ID token vs Access token distinction
- Multi-tier architecture with three services
- Comprehensive documentation structure

Use this prompt to create a complete React SPA with the same capabilities as the Angular version, following all best practices and avoiding common pitfalls.
