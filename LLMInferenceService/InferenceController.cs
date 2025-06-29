using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace LLMInferenceService;

// User model for Identity
public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}

public enum UserRole
{
    Admin,
    Agent,
    Customer
}

public enum TicketStatus
{
    Open,
    InProgress,
    Solved,
    Closed
}

// Enhanced CustomerProblem model (now called Ticket)
public class Ticket
{
    public int Id { get; set; }
    public string CustomerMessage { get; set; }
    public string ProblemCategory { get; set; }
    public DateTime CreatedAt { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public string? AssignedToUserId { get; set; }
    public ApplicationUser? AssignedToUser { get; set; }
    public string? AdminNotes { get; set; }
    public DateTime? SolvedAt { get; set; }
    public string? SolvedByUserId { get; set; }
    public ApplicationUser? SolvedByUser { get; set; }
    public bool RequiresAdminApproval { get; set; } = false;
}

public class ChatMessage
{
    [Key]
    public int Id { get; set; }
    public string Role { get; set; }
    public string Content { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public string? SessionId { get; set; } // For anonymous users
}

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<Ticket> Tickets { get; set; }
    public DbSet<ApplicationUser> Users { get; set; }
    
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<ChatMessage>().Property(c => c.Id).ValueGeneratedOnAdd();
        
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.AssignedToUser)
            .WithMany()
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);
            
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.SolvedByUser)
            .WithMany()
            .HasForeignKey(t => t.SolvedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

// DTOs
public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}

public class RegisterRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public UserRole Role { get; set; } = UserRole.Agent;
}

public class AssignTicketRequest
{
    public int TicketId { get; set; }
    public string AssignedToUserId { get; set; }
    public string? AdminNotes { get; set; }
}

public class UpdateTicketStatusRequest
{
    public int TicketId { get; set; }
    public TicketStatus Status { get; set; }
    public string? Notes { get; set; }
}

// Page Models
public class IndexModel : PageModel
{
    public void OnGet() { }
}

[Authorize(Roles = "Admin,Agent")]
public class DashboardModel : PageModel
{
    private readonly AppDbContext _dbcontext;
    private readonly UserManager<ApplicationUser> _userManager;

    public DashboardModel(AppDbContext dbcontext, UserManager<ApplicationUser> userManager)
    {
        _dbcontext = dbcontext;
        _userManager = userManager;
    }

    public void OnGet() { } // page will load data via javascript fetch
}

// Authentication Controller
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user != null && await _userManager.CheckPasswordAsync(user, request.Password))
        {
            if (!user.IsActive)
            {
                return Unauthorized(new { message = "Account is deactivated" });
            }

            var token = await GenerateJwtToken(user);
            return Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role.ToString()
                }
            });
        }

        return Unauthorized(new { message = "Invalid credentials" });
    }

    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (result.Succeeded)
        {
            await _userManager.AddToRoleAsync(user, request.Role.ToString());
            return Ok(new { message = "User created successfully" });
        }

        return BadRequest(new { errors = result.Errors });
    }

    private async Task<string> GenerateJwtToken(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("firstName", user.FirstName),
            new Claim("lastName", user.LastName)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddDays(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// Enhanced Inference Controller (Chat can be accessed by anyone)
[ApiController]
[Route("api/inference")]
public class InferenceController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly HttpClient _httpClient = new HttpClient();
    private const string LLM_API_URL = "http://localhost:1234/v1/chat/completions";

    public InferenceController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private async Task<(string category, string response)> ParseLLMResponse(string generatedText)
    {
        var lines = generatedText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        string category = "";
        string response = "";

        foreach (var line in lines)
        {
            if (line.StartsWith("Category:", StringComparison.OrdinalIgnoreCase))
            {
                category = line.Substring("Category:".Length).Trim();
            }
            else if (line.StartsWith("Response:", StringComparison.OrdinalIgnoreCase))
            {
                response = line.Substring("Response:".Length).Trim();
            }
        }

        return (category, response);
    }

    [HttpPost]
    public async Task<IActionResult> GenerateText([FromBody] InferenceRequest request)
    {
        // Get current user ID if authenticated, otherwise use session ID
        string? userId = User.Identity.IsAuthenticated ? User.FindFirst(ClaimTypes.NameIdentifier)?.Value : null;
        string? sessionId = User.Identity.IsAuthenticated ? null : HttpContext.Session.Id;

        // Save user message
        var userMessage = new ChatMessage 
        { 
            Role = "user", 
            Content = request.Prompt,
            UserId = userId,
            SessionId = sessionId
        };
        _dbContext.ChatMessages.Add(userMessage);
        await _dbContext.SaveChangesAsync();

        // System prompt for customer service assistant
        string systemPrompt = @"You are a helpful customer service assistant. Your role is to:

1. First, categorize the customer's issue into one of these categories:
   - Payment Issues (e.g., failed payments, double charges, refund delays)
   - Order & Delivery (e.g., late delivery, wrong item, tracking issues)
   - Technical Support (e.g., login issues, app crashes, website errors)
   - Subscription Issues (e.g., cancellations, billing problems, upgrade requests)
   - Product Complaints (e.g., defective products, missing parts, poor service)
   - Return & Exchange (e.g., refund issues, exchange requests, rejected returns)
   - Promotions & Coupons (e.g., invalid coupons, incorrect discounts, campaign inquiries)
   - General Inquiries (e.g., warranty info, contact details, company policies)

2. Then provide a helpful, empathetic response that:
   - Acknowledges the customer's concern
   - Shows understanding of their frustration if applicable
   - Provides clear, step-by-step solutions
   - Explains what actions you'll take to help
   - Offers relevant additional information or alternatives
   - Maintains a professional yet friendly tone

3. Format your response as follows:
   Category: [identified category]
   Response: [your helpful response]

4. Important guidelines:
   - Always prioritize customer satisfaction
   - Be concise but thorough
   - Provide specific, actionable solutions
   - If you need more information, ask clear, specific questions
   - When appropriate, explain policies or procedures
   - Express genuine care for resolving their issue

Remember to stay within your role as a customer service assistant and escalate complex issues when necessary.";

        // Call LLM API
        var requestBody = new
        {
            model = "llama-3.2-3b-instruct",
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = request.Prompt },
            },
            max_tokens = 8192
        };

        var jsonRequest = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");

        try
        {
            HttpResponseMessage response = await _httpClient.PostAsync(LLM_API_URL, content);
            response.EnsureSuccessStatusCode();

            string jsonResponse = await response.Content.ReadAsStringAsync();
            var parsedResponse = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
            string? generatedText = parsedResponse.GetProperty("choices")[0].GetProperty("message")
                .GetProperty("content").GetString();

            // Parse the LLM response to extract category and response
            var (category, responseText) = await ParseLLMResponse(generatedText);

            // If a category was identified, save the problem as a ticket
            if (!string.IsNullOrEmpty(category) && category != "General Inquiries")
            {
                var ticket = new Ticket
                {
                    CustomerMessage = request.Prompt,
                    ProblemCategory = category,
                    CreatedAt = DateTime.UtcNow,
                    Status = TicketStatus.Open
                };
                _dbContext.Tickets.Add(ticket);
            }

            // Save assistant message
            var assistantMessage = new ChatMessage 
            { 
                Role = "assistant", 
                Content = generatedText,
                UserId = userId,
                SessionId = sessionId
            };
            _dbContext.ChatMessages.Add(assistantMessage);
            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                response = generatedText,
                category = category,
                tracked = !string.IsNullOrEmpty(category) && category != "General Inquiries"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

// Ticket Management Controller
[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;

    public TicketController(AppDbContext dbContext, UserManager<ApplicationUser> userManager)
    {
        _dbContext = dbContext;
        _userManager = userManager;
    }

    // Get all tickets (Admin only)
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllTickets([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var tickets = await _dbContext.Tickets
            .Include(t => t.AssignedToUser)
            .Include(t => t.SolvedByUser)
            .OrderByDescending(t => t.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return Ok(tickets);
    }

    // Get assigned tickets for current user
    [HttpGet("assigned")]
    [Authorize(Roles = "Agent")]
    public async Task<IActionResult> GetAssignedTickets()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var tickets = await _dbContext.Tickets
            .Include(t => t.AssignedToUser)
            .Where(t => t.AssignedToUserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(tickets);
    }

    // Assign ticket to user (Admin only)
    [HttpPost("assign")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignTicket([FromBody] AssignTicketRequest request)
    {
        var ticket = await _dbContext.Tickets.FindAsync(request.TicketId);
        if (ticket == null)
        {
            return NotFound(new { message = "Ticket not found" });
        }

        var user = await _userManager.FindByIdAsync(request.AssignedToUserId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        ticket.AssignedToUserId = request.AssignedToUserId;
        ticket.AdminNotes = request.AdminNotes;
        ticket.Status = TicketStatus.InProgress;

        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Ticket assigned successfully" });
    }

    // Update ticket status
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateTicketStatus(int id, [FromBody] UpdateTicketStatusRequest request)
{
    var ticket = await _dbContext.Tickets.FindAsync(id);
    if (ticket == null)
    {
        return NotFound(new { message = "Ticket not found" });
    }

    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

    // Check permissions - Admin can update any ticket, Agent can only update assigned tickets
    if (userRole != "Admin" && ticket.AssignedToUserId != userId)
    {
        return Forbid("You can only update tickets assigned to you");
    }

    // Update ticket status based on user role and status
    if (userRole == "Admin")
    {
        // Admin can set any status
        ticket.Status = request.Status;
        
        // If admin closes a ticket, remove admin approval requirement
        if (request.Status == TicketStatus.Closed)
        {
            ticket.RequiresAdminApproval = false;
        }
        
        // If admin sets to solved, mark solved details
        if (request.Status == TicketStatus.Solved && ticket.SolvedAt == null)
        {
            ticket.SolvedAt = DateTime.UtcNow;
            ticket.SolvedByUserId = userId;
        }
    }
    else if (userRole == "Agent")
    {
        // Agent restrictions
        switch (request.Status)
        {
            case TicketStatus.Open:
            case TicketStatus.InProgress:
                ticket.Status = request.Status;
                break;
                
            case TicketStatus.Solved:
                ticket.Status = TicketStatus.Solved;
                ticket.SolvedAt = DateTime.UtcNow;
                ticket.SolvedByUserId = userId;
                ticket.RequiresAdminApproval = true; // Require admin approval
                break;
                
            case TicketStatus.Closed:
                // Agents cannot directly close tickets
                return BadRequest(new { message = "Agents cannot directly close tickets. Please mark as solved for admin approval." });
                
            default:
                return BadRequest(new { message = "Invalid status" });
        }
    }

    // Add notes if provided
    if (!string.IsNullOrEmpty(request.Notes))
    {
        ticket.AdminNotes = string.IsNullOrEmpty(ticket.AdminNotes) 
            ? request.Notes 
            : $"{ticket.AdminNotes}\n---\n{request.Notes}";
    }

    await _dbContext.SaveChangesAsync();

    return Ok(new { 
        message = "Ticket status updated successfully",
        newStatus = ticket.Status.ToString(),
        requiresApproval = ticket.RequiresAdminApproval
    });
}

    // Get tickets requiring admin approval
    [HttpGet("pending-approval")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetTicketsPendingApproval()
    {
        var tickets = await _dbContext.Tickets
            .Include(t => t.AssignedToUser)
            .Include(t => t.SolvedByUser)
            .Where(t => t.RequiresAdminApproval && t.Status == TicketStatus.Solved)
            .OrderByDescending(t => t.SolvedAt)
            .ToListAsync();

        return Ok(tickets);
    }

    // Get ticket statistics
    [HttpGet("stats")]
    [Authorize(Roles = "Admin,Agent")]
    public async Task<IActionResult> GetTicketStats()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        IQueryable<Ticket> query = _dbContext.Tickets;

        // If not admin, filter by assigned tickets
        if (userRole != "Admin")
        {
            query = query.Where(t => t.AssignedToUserId == userId);
        }

        var stats = await query
            .GroupBy(t => t.ProblemCategory)
            .Select(g => new
            {
                Category = g.Key,
                Total = g.Count(),
                Open = g.Count(t => t.Status == TicketStatus.Open),
                InProgress = g.Count(t => t.Status == TicketStatus.InProgress),
                Solved = g.Count(t => t.Status == TicketStatus.Solved),
                Closed = g.Count(t => t.Status == TicketStatus.Closed)
            })
            .ToListAsync();

        return Ok(stats);
    }
}

// User Management Controller
[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UserController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UserController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userManager.Users
            .Where(u => u.Role != UserRole.Customer)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                Role = u.Role.ToString(),
                u.IsActive,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] bool isActive)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        user.IsActive = isActive;
        await _userManager.UpdateAsync(user);

        return Ok(new { message = "User status updated successfully" });
    }
}

public class InferenceRequest
{
    public string Prompt { get; set; }
}

public static class DatabaseSeeder
{
    public static async Task SeedUsers(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Create Admin user
        var adminEmail = "admin@company.com";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "Admin",
                LastName = "User",
                Role = UserRole.Admin,
                EmailConfirmed = true,
                IsActive = true
            };
            
            await userManager.CreateAsync(adminUser, "Admin123!"); // Password: Admin123!
        }

        // Create Agent users
        var agents = new[]
        {
            new { Email = "john.smith@company.com", FirstName = "John", LastName = "Smith", Password = "Agent123!" },
            new { Email = "sarah.johnson@company.com", FirstName = "Sarah", LastName = "Johnson", Password = "Agent123!" },
            new { Email = "mike.davis@company.com", FirstName = "Mike", LastName = "Davis", Password = "Agent123!" }
        };

        foreach (var agent in agents)
        {
            var existingUser = await userManager.FindByEmailAsync(agent.Email);
            if (existingUser == null)
            {
                var user = new ApplicationUser
                {
                    UserName = agent.Email,
                    Email = agent.Email,
                    FirstName = agent.FirstName,
                    LastName = agent.LastName,
                    Role = UserRole.Agent,
                    EmailConfirmed = true,
                    IsActive = true
                };
                
                await userManager.CreateAsync(user, agent.Password);
            }
        }

        // Create Customer users
        var customers = new[]
        {
            new { Email = "alice.brown@email.com", FirstName = "Alice", LastName = "Brown", Password = "Customer123!" },
            new { Email = "bob.wilson@email.com", FirstName = "Bob", LastName = "Wilson", Password = "Customer123!" },
            new { Email = "carol.taylor@email.com", FirstName = "Carol", LastName = "Taylor", Password = "Customer123!" },
            new { Email = "david.garcia@email.com", FirstName = "David", LastName = "Garcia", Password = "Customer123!" },
            new { Email = "emma.martinez@email.com", FirstName = "Emma", LastName = "Martinez", Password = "Customer123!" }
        };

        foreach (var customer in customers)
        {
            var existingUser = await userManager.FindByEmailAsync(customer.Email);
            if (existingUser == null)
            {
                var user = new ApplicationUser
                {
                    UserName = customer.Email,
                    Email = customer.Email,
                    FirstName = customer.FirstName,
                    LastName = customer.LastName,
                    Role = UserRole.Customer,
                    EmailConfirmed = true,
                    IsActive = true
                };
                
                await userManager.CreateAsync(user, customer.Password);
            }
        }
    }
}