using Microsoft.AspNetCore.Mvc;

namespace AuthSpa2.Web.Controllers;

/// <summary>
/// Controller to expose environment configuration to the Angular SPA.
/// Uses Aspire's service discovery to resolve backend service URLs.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ConfigController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ConfigController> _logger;

    public ConfigController(IConfiguration configuration, ILogger<ConfigController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Returns the application configuration needed by the Angular SPA.
    /// In development, uses Aspire service discovery to resolve URLs.
    /// In production, uses configured URLs from environment variables.
    /// </summary>
    [HttpGet]
    public ActionResult<AppConfig> GetConfig()
    {
        // Aspire injects service URLs via configuration using the format:
        // services__<service-name>__https__0 or services__<service-name>__http__0
        // This is the recommended way to get service URLs in Aspire projects.
        
        var apiServiceUrl = GetServiceUrl("apiservice");
        
        _logger.LogInformation("Returning config with API URL: {ApiUrl}", apiServiceUrl);
        
        return Ok(new AppConfig
        {
            ApiUrl = apiServiceUrl
        });
    }

    /// <summary>
    /// Gets the URL for a service using Aspire's service discovery pattern.
    /// Falls back to appsettings configuration if service discovery URL is not available.
    /// </summary>
    private string GetServiceUrl(string serviceName)
    {
        // Try HTTPS first (Aspire service discovery pattern)
        var httpsUrl = _configuration[$"services:{serviceName}:https:0"];
        if (!string.IsNullOrEmpty(httpsUrl))
        {
            _logger.LogDebug("Found HTTPS URL for {Service} via service discovery: {Url}", serviceName, httpsUrl);
            return httpsUrl;
        }

        // Try HTTP (Aspire service discovery pattern)
        var httpUrl = _configuration[$"services:{serviceName}:http:0"];
        if (!string.IsNullOrEmpty(httpUrl))
        {
            _logger.LogDebug("Found HTTP URL for {Service} via service discovery: {Url}", serviceName, httpUrl);
            return httpUrl;
        }

        // Fallback to explicit configuration (for production scenarios)
        var configuredUrl = _configuration[$"ServiceUrls:{serviceName}"];
        if (!string.IsNullOrEmpty(configuredUrl))
        {
            _logger.LogDebug("Found URL for {Service} via ServiceUrls config: {Url}", serviceName, configuredUrl);
            return configuredUrl;
        }

        _logger.LogWarning("No URL found for service: {Service}", serviceName);
        return string.Empty;
    }
}

/// <summary>
/// Application configuration DTO returned to the Angular SPA.
/// </summary>
public class AppConfig
{
    /// <summary>
    /// The URL of the backend API service that Angular should call.
    /// </summary>
    public string ApiUrl { get; set; } = string.Empty;
}
