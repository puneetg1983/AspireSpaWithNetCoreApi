using Microsoft.Identity.ServiceEssentials;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations
builder.AddServiceDefaults();

// Add MISE authentication (using different Entra App: 626cfb4f-3edb-4ec4-9cd0-64126cfaea3b)
builder.Services.AddAuthentication(MiseAuthenticationDefaults.AuthenticationScheme)
    .AddMiseWithDefaultModules(builder.Configuration);

builder.Services.AddAuthorization();

// Add CORS services
builder.Services.AddCors();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// Enable CORS for development
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

app.MapControllers();
app.MapDefaultEndpoints();

app.Run();
