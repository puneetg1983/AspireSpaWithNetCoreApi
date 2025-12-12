var builder = WebApplication.CreateBuilder(args);

// Add service defaults (health checks, OpenTelemetry, etc.)
builder.AddServiceDefaults();

// Add controllers for API endpoints (e.g., ConfigController)
builder.Services.AddControllers();

// Add CORS for local Angular development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "https://localhost:4200",  // Angular dev server
                "http://localhost:4200"    // Angular dev server (HTTP)
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Map service default endpoints (health, alive)
app.MapDefaultEndpoints();

// Enable CORS
app.UseCors();

// Map API controllers (e.g., /api/config)
app.MapControllers();

// In development, the SpaProxy middleware will forward requests to the Angular dev server
// In production, serve static files from wwwroot (where Angular dist files are copied during publish)
app.UseDefaultFiles();
app.UseStaticFiles();

// For SPA routing: fallback to index.html for any unmatched routes
// This ensures Angular's client-side routing works properly
app.MapFallbackToFile("index.html");

app.Run();
