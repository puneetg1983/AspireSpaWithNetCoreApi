var builder = DistributedApplication.CreateBuilder(args);

// Backend API Service with JWT Authentication
var apiService = builder.AddProject<Projects.AuthSpa2_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

// Angular SPA with MSAL.js authentication
// Use npm to serve the Angular application with HTTPS
var angularApp = builder.AddNpmApp("angular-spa", "../AuthSpa2.Angular", "start")
    .WithHttpsEndpoint(port: 4200, env: "PORT")
    .WithExternalHttpEndpoints()
    .WithEnvironment("BROWSER", "none") // Disable auto-opening browser
    .WithReference(apiService);

builder.Build().Run();
