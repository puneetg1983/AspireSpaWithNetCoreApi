using Aspire.Hosting.Azure;

var builder = DistributedApplication.CreateBuilder(args);

// Add Azure Container App Environment to support managed identities
var containerAppEnv = builder.AddAzureContainerAppEnvironment("cae");

// Create a User-Assigned Managed Identity for OBO flow
// This will be used by ApiService to authenticate when acquiring OBO tokens
var oboManagedIdentity = builder.AddAzureUserAssignedIdentity("obo-managed-identity");

// Backend Protected Service with MISE Authentication (same token forwarding)
var backendProtectedService = builder.AddProject<Projects.AuthSpa2_BackendProtectedService>("backendprotectedservice")
    .WithHttpHealthCheck("/health");

// Backend Service Accepting Token with MISE Authentication (OBO flow - different Entra App)
var backendServiceAcceptingToken = builder.AddProject<Projects.AuthSpa2_BackendServiceAcceptingToken>("backendserviceacceptingtoken")
    .WithHttpHealthCheck("/health");

// Backend API Service with JWT Authentication
// Assign the Managed Identity for OBO token acquisition
// External endpoints so Angular SPA can call it directly from browser
var apiService = builder.AddProject<Projects.AuthSpa2_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints()
    .WithReference(backendProtectedService)
    .WithReference(backendServiceAcceptingToken)
    .WithAzureUserAssignedIdentity(oboManagedIdentity);

// Angular SPA with MSAL.js authentication
// Containerized for deployment to Azure Container Apps
var angularApp = builder.AddDockerfile("angular-spa", "../AuthSpa2.Angular")
    .WithHttpEndpoint(targetPort: 80)
    .WithExternalHttpEndpoints()
    .WithReference(apiService)
    .WithEnvironment("API_URL", apiService.GetEndpoint("http"));

builder.Build().Run();
