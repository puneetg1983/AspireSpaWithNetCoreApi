# 🚀 Quick Start Guide

## Prerequisites Check
- [ ] .NET 10 SDK installed
- [ ] Node.js 18+ installed
- [ ] Aspire CLI installed (`dotnet workload install aspire`)
- [ ] Entra ID App configured (ClientId: 1d922779-2742-4cf2-8c82-425cf2c60aa8)

## 5-Minute Setup

### 1. Install Dependencies

```powershell
# Navigate to project root
cd c:\source\aspire\AuthSpa2

# Install Angular dependencies
cd AuthSpa2.Angular
npm install
cd ..
```

### 2. Run the Application

```powershell
# From project root
aspire run
```

This single command will:
- ✅ Start the Aspire Dashboard
- ✅ Launch the API service
- ✅ Start the Angular development server
- ✅ Configure service discovery

### 3. Access the Application

Open your browser to:
- **Angular SPA**: http://localhost:4200
- **Aspire Dashboard**: http://localhost:15000 (check console for actual port)
- **API Service**: Dynamic port (shown in Aspire Dashboard)

### 4. Test Authentication

1. Click **"Sign In with Microsoft"**
2. Login with your Microsoft account
3. Click **"Call Protected API"**
4. View weather data with your user information

## Troubleshooting Quick Fixes

### Issue: Aspire command not found
```powershell
dotnet workload install aspire
```

### Issue: npm install fails
```powershell
cd AuthSpa2.Angular
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Issue: Port 4200 already in use
```powershell
# Find and kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 4200).OwningProcess | Stop-Process
```

### Issue: Authentication fails
1. Verify redirect URI in Entra ID: http://localhost:4200
2. Check ClientId matches: 1d922779-2742-4cf2-8c82-425cf2c60aa8
3. Ensure API scope is exposed: api://1d922779-2742-4cf2-8c82-425cf2c60aa8/access_as_user

## Project Structure

```
AuthSpa2/
├── 📄 README.md                    # Full documentation
├── 📄 ENTRA_ID_SETUP.md            # App registration guide
├── 📄 AUTHENTICATION_FLOW.md       # Detailed flow diagrams
├── 📄 QUICKSTART.md                # This file
│
├── 🗂️ AuthSpa2.AppHost/            # Aspire orchestration
│   └── AppHost.cs                  # Service configuration
│
├── 🗂️ AuthSpa2.ApiService/         # Backend API
│   ├── Program.cs                  # API with JWT auth
│   └── appsettings.json            # Azure AD config
│
├── 🗂️ AuthSpa2.Angular/            # Frontend SPA with MSAL.js
│   ├── src/app/
│   │   ├── app.config.ts          # MSAL configuration
│   │   ├── app.ts                  # Auth logic
│   │   ├── app.html                # UI
│   │   └── app.css                 # Styling
│   └── package.json                # Dependencies
│
└── 🗂️ AuthSpa2.ServiceDefaults/    # Shared Aspire config
```

## Key Files to Review

| File | Purpose |
|------|---------|
| `AuthSpa2.Angular/src/app/app.config.ts` | MSAL.js configuration with PKCE |
| `AuthSpa2.Angular/src/app/app.ts` | Login, token acquisition, API calls |
| `AuthSpa2.ApiService/Program.cs` | JWT validation and protected endpoints |
| `AuthSpa2.AppHost/AppHost.cs` | Aspire service orchestration |

## Common Commands

```powershell
# Run with Aspire (recommended)
aspire run

# Build solution
dotnet build

# Run API only
cd AuthSpa2.ApiService
dotnet run

# Run Angular only
cd AuthSpa2.Angular
npm start

# Clean and rebuild
dotnet clean
dotnet build

# View Aspire dashboard
# Automatically opens when running aspire run
```

## What's Configured

✅ **Single Entra ID App** - No secrets, PKCE flow
✅ **MSAL.js** - Automatic token management
✅ **JWT Bearer Auth** - Token validation in API
✅ **CORS** - Configured for local development
✅ **Service Discovery** - Aspire wiring between services
✅ **Protected Endpoints** - [Authorize] attribute on API
✅ **User Context** - Claims extracted from JWT

## Next Steps

1. **Test the flow**: Follow the testing steps in README.md
2. **Review configuration**: Check ENTRA_ID_SETUP.md for app registration
3. **Understand authentication**: Read AUTHENTICATION_FLOW.md
4. **Customize**: Modify app.ts and Program.cs for your needs

## Production Checklist

Before deploying to production:
- [ ] Update redirect URIs to production URLs
- [ ] Enable HTTPS everywhere
- [ ] Restrict CORS to specific origins
- [ ] Add rate limiting
- [ ] Configure Application Insights
- [ ] Set up CI/CD pipeline
- [ ] Test with production Entra ID app
- [ ] Review security best practices

## Getting Help

- **Entra ID Issues**: Check ENTRA_ID_SETUP.md
- **Authentication Flow**: Read AUTHENTICATION_FLOW.md
- **General Questions**: Review README.md
- **API Errors**: Check Aspire Dashboard logs
- **Token Issues**: Use "View Token" button in UI

## URLs Reference

| Service | URL | Description |
|---------|-----|-------------|
| Angular SPA | http://localhost:4200 | Frontend application |
| Aspire Dashboard | http://localhost:15000 | Service management |
| API Service | Dynamic | Check Aspire Dashboard |
| Microsoft Login | login.microsoftonline.com | Authentication endpoint |

---

**Need more details?** See [README.md](README.md) for comprehensive documentation.
