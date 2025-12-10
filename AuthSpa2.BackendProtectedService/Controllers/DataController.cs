using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthSpa2.BackendProtectedService.Controllers;

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
