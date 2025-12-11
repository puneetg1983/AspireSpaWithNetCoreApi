using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthSpa2.BackendServiceAcceptingToken.Controllers;

/// <summary>
/// Protected controller that requires OBO token from ApiService
/// This service uses a DIFFERENT Entra App (626cfb4f-3edb-4ec4-9cd0-64126cfaea3b)
/// </summary>
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

        var userId = User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
            ?? User.FindFirst("oid")?.Value
            ?? "Unknown";

        // Extract all claims
        var claims = User.Claims.Select(c => new { Type = c.Type, Value = c.Value }).ToList();
        
        // Extract roles
        var roles = User.Claims
            .Where(c => c.Type == "roles" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
            .Select(c => c.Value)
            .ToList();

        // Log that this service received an OBO token
        _logger.LogInformation(
            "BackendServiceAcceptingToken: OBO request received for user {User} ({UserId})", 
            userIdentity, 
            userId);

        return Ok(new
        {
            Service = "BackendServiceAcceptingToken",
            Message = "This data was retrieved using an OBO (On-Behalf-Of) token!",
            EntraAppId = "626cfb4f-3edb-4ec4-9cd0-64126cfaea3b",
            RequestedBy = userIdentity,
            UserId = userId,
            Roles = roles,
            Claims = claims,
            Timestamp = DateTime.UtcNow,
            TokenType = "OBO Token (different audience than original token)",
            Data = new[]
            {
                new { Id = 1, Name = "OBO Item 1", Description = "Retrieved via On-Behalf-Of flow" },
                new { Id = 2, Name = "OBO Item 2", Description = "Token was exchanged by ApiService" },
                new { Id = 3, Name = "OBO Item 3", Description = "User identity preserved across services" }
            }
        });
    }
}
