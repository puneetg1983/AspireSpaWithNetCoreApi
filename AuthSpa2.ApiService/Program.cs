using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.ServiceEssentials;
using Microsoft.Identity.Web;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add MISE authentication
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);

builder.Services.AddAuthorization();

// Add HttpClient for calling BackendProtectedService
builder.Services.AddHttpClient("BackendProtectedService", client =>
{
    // This will be configured by Aspire service discovery
    client.BaseAddress = new Uri("https+http://backendprotectedservice");
});

// Add CORS services
builder.Services.AddCors();

// Add services to the container.
builder.Services.AddProblemDetails();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// Enable CORS for Angular SPA (all origins in development)
app.UseCors(policy =>
{
    policy.AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader();
});

// Enable authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

string[] summaries = ["Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"];

app.MapGet("/", () => "API service is running. Navigate to /weatherforecast to see sample data.");

// Protected endpoint - requires authentication
app.MapGet("/weatherforecast", (HttpContext httpContext) =>
{
    // Get user identity from the JWT token
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
.RequireAuthorization(); // This endpoint requires a valid JWT token

// Protected endpoint that calls BackendProtectedService with token forwarding
app.MapGet("/backenddata", async (HttpContext httpContext, IHttpClientFactory httpClientFactory) =>
{
    try
    {
        // Get the authorization header from the incoming request
        var authHeader = httpContext.Request.Headers["Authorization"].ToString();
        
        if (string.IsNullOrEmpty(authHeader))
        {
            return Results.Unauthorized();
        }

        var userIdentity = httpContext.User.FindFirst("name")?.Value
            ?? httpContext.User.FindFirst("preferred_username")?.Value
            ?? httpContext.User.Identity?.Name
            ?? "Anonymous";

        // Create HttpClient for BackendProtectedService
        var httpClient = httpClientFactory.CreateClient("BackendProtectedService");
        
        // Forward the bearer token to the backend service
        httpClient.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(authHeader);

        // Call the backend service
        var response = await httpClient.GetAsync("/api/data");
        
        if (!response.IsSuccessStatusCode)
        {
            return Results.Problem(
                statusCode: (int)response.StatusCode,
                title: "Backend service call failed",
                detail: await response.Content.ReadAsStringAsync()
            );
        }

        var backendData = await response.Content.ReadAsStringAsync();
        
        return Results.Ok(new
        {
            Message = "Data retrieved from BackendProtectedService via ApiService",
            CalledBy = userIdentity,
            BackendResponse = System.Text.Json.JsonDocument.Parse(backendData).RootElement
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            statusCode: 500,
            title: "Error calling backend service",
            detail: ex.Message
        );
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
