using LLMInferenceService;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var connectionString = "Data Source=localhost:1521/FREE;User Id=C##MKA;Password=2001;";
builder.Services.AddDbContext<AppDbContext>(options => options.UseOracle(connectionString));

builder.Services.AddControllers();
builder.Services.AddRazorPages();
var app = builder.Build();

// configure the http request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllers();
app.MapRazorPages();

app.UseCors("AllowAll");
app.MapControllers();
app.Run();
