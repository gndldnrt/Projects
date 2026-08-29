using Stockroom.Controllers;
using Stockroom.Services;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://localhost:{Environment.GetEnvironmentVariable("PORT") ?? "5000"}");
builder.Services.AddControllers();
builder.Services.AddSingleton<PosStore>();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");
app.Run();
