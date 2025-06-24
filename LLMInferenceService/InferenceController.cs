using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Collections.Generic;

namespace LLMInferenceService;

// IndexModel
public class IndexModel : PageModel
{
    public void OnGet(){}
}

// DashboardModel
public class DashboardModel : PageModel
{
    private readonly AppDbContext _dbcontext;

    public DashboardModel(AppDbContext dbcontext)
    {
        _dbcontext = dbcontext;
    }
    public void OnGet(){} // page will load data via javascript fetch
}

// add new model for customer problems
public class CustomerProblem
{
    public int Id {get; set;}
    public string CustomerMessage {get; set;}
    public string ProblemCategory {get; set;}
    public DateTime CreatedAt {get; set;}
    public string Status { get; set; } = "Open";
}

public class ChatMessage
{
    [Key]
    public int Id { get; set; }
    public string Role { get; set; }
    public string Content { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class AppDbContext : DbContext
{
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<CustomerProblem> CustomerProblems { get; set; }
    
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ChatMessage>().Property(c => c.Id).ValueGeneratedOnAdd();
    }
}

public class InferenceRequest
{
    public string Prompt { get; set; }
}

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
        // save user message
        var userMessage = new ChatMessage { Role = "user", Content = request.Prompt };
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

        // call llm api
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
            
            // parse the llm response to extract category and response
            var (category, responseText) = await ParseLLMResponse(generatedText);
            
            // if a category was identified, save the problem and response
            if (!string.IsNullOrEmpty(category) && category != "General Inquiries")
            {
                var customerProblem = new CustomerProblem
                {
                    CustomerMessage = request.Prompt,
                    ProblemCategory = category,
                    CreatedAt = DateTime.UtcNow,
                    Status = "Open"
                };
                _dbContext.CustomerProblems.Add(customerProblem);
            }
            
            // save assistant message
            var assistantMessage = new ChatMessage {Role = "assistant", Content = generatedText};
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
            return StatusCode(500, new {error = ex.Message});
        }
    }
    
    // add endpoint to the problem statistics
    [HttpGet("problems/stats")]
    public async Task<IActionResult> GetProblemStats()
    {
        var stats = await _dbContext.CustomerProblems
            .GroupBy(p => p.ProblemCategory)
            .Select(g => new
            {
                Category = g.Key,
                Count = g.Count(),
                OpenIssues = g.Count(p => p.Status == "Open")
            }).ToListAsync();

        return Ok(stats);
    }
    
    // add endpoint to the recent problems
    [HttpGet("problems/recent")]
    public async Task<IActionResult> GetRecentProblems([FromQuery] int limit = 10)
    {
        var recentProblems = await _dbContext.CustomerProblems
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync();
        
        return Ok(recentProblems);
    }
}

