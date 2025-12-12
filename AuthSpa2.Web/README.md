# AuthSpa2.Web

This project serves as the .NET Core host for the Angular SPA application.

## Development vs Production

### Local Development

In development mode, this project uses **SpaProxy** to forward requests to the Angular development server running on `https://localhost:4200`. The Aspire AppHost orchestrates both:

1. The Angular dev server (via `AddNpmApp`) - runs `npm run dev` in the Angular project
2. This .NET Core host - runs with SpaProxy configured

When you navigate to the Web project's URL, requests for static files and routes are proxied to the Angular dev server, giving you:
- Hot Module Replacement (HMR)
- Live reload
- TypeScript debugging

### Production Deployment

When publishing for production:

1. The Angular app is built using `npm run build`
2. The production dist files are copied to `wwwroot/`
3. The .NET Core app serves these static files via `app.UseStaticFiles()`
4. SPA routing is handled via `app.MapFallbackToFile("index.html")`

## Publishing

To publish the application with the Angular dist files:

```bash
dotnet publish -c Release
```

This will:
1. Build the Angular app in production mode
2. Copy the dist files to `wwwroot/`
3. Create the .NET Core publish output

## Project Structure

- `Program.cs` - Main entry point with static file middleware configuration
- `wwwroot/` - Where Angular dist files are copied during publish
- `AuthSpa2.Web.csproj` - Project file with MSBuild targets for Angular build

## Configuration

The following MSBuild properties control the SPA integration:

| Property | Description |
|----------|-------------|
| `SpaRoot` | Path to the Angular project |
| `SpaProxyServerUrl` | URL of the Angular dev server |
| `SpaProxyLaunchCommand` | Command to start the Angular dev server |

## Health Checks

This project includes Aspire ServiceDefaults which provides:
- `/health` - Health check endpoint
- `/alive` - Liveness check endpoint
