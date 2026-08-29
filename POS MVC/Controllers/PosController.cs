using Microsoft.AspNetCore.Mvc;
using Stockroom.Models;
using Stockroom.Services;

namespace Stockroom.Controllers;

[ApiController]
[Route("api")]
public sealed class PosController(PosStore store) : ControllerBase
{
    private readonly string username = Environment.GetEnvironmentVariable("POS_USERNAME") ?? "geandell";
    private readonly string password = Environment.GetEnvironmentVariable("POS_PASSWORD") ?? "12345678";

    private bool IsAuthenticated()
    {
        return Request.Cookies.TryGetValue("stockroom_session", out var token)
            && token is not null
            && store.Sessions.ContainsKey(token);
    }

    private IActionResult? RequireAuthentication()
    {
        return IsAuthenticated() ? null : Unauthorized(new { error = "Authentication required" });
    }

    [HttpGet("session")]
    public IActionResult Session() => Ok(new { authenticated = IsAuthenticated() });

    [HttpPost("login")]
    public IActionResult Login(LoginRequest request)
    {
        if (request.Username != username || request.Password != password)
            return Unauthorized(new { error = "Incorrect username or password" });

        var token = Guid.NewGuid().ToString("N");
        store.Sessions[token] = DateTimeOffset.UtcNow;
        Response.Cookies.Append("stockroom_session", token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            IsEssential = true,
            Path = "/"
        });
        return Ok(new { authenticated = true, username });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        if (Request.Cookies.TryGetValue("stockroom_session", out var token) && token is not null)
            store.Sessions.TryRemove(token, out _);
        Response.Cookies.Delete("stockroom_session");
        return Ok(new { authenticated = false });
    }

    [HttpGet("state")]
    public IActionResult State()
    {
        var unauthorized = RequireAuthentication();
        if (unauthorized is not null) return unauthorized;
        lock (store.SyncRoot) return Ok(new PosState(store.Products, store.Sales));
    }

    [HttpPost("products")]
    public IActionResult AddProduct(ProductRequest request)
    {
        var unauthorized = RequireAuthentication();
        if (unauthorized is not null) return unauthorized;
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Product name is required" });

        lock (store.SyncRoot)
        {
            var product = new Product
            {
                Id = store.Products.Count == 0 ? 1 : store.Products.Max(item => item.Id) + 1,
                Name = request.Name.Trim(),
                Sku = $"BRW-{store.Products.Count + 1:000}",
                Category = string.IsNullOrWhiteSpace(request.Category) ? "New" : request.Category.Trim(),
                Price = Math.Max(0, request.Price),
                Stock = Math.Max(0, request.Stock),
                Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? "✦" : request.Emoji
            };
            store.Products.Add(product);
            return Created("/api/products", new { product, state = new PosState(store.Products, store.Sales) });
        }
    }

    [HttpPut("products/{id:int}")]
    public IActionResult EditProduct(int id, ProductRequest request)
    {
        var unauthorized = RequireAuthentication();
        if (unauthorized is not null) return unauthorized;
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Product name is required" });

        lock (store.SyncRoot)
        {
            var product = store.Products.FirstOrDefault(item => item.Id == id);
            if (product is null) return NotFound(new { error = "Product not found" });
            product.Name = request.Name.Trim();
            product.Category = string.IsNullOrWhiteSpace(request.Category) ? "New" : request.Category.Trim();
            product.Price = Math.Max(0, request.Price);
            product.Stock = Math.Max(0, request.Stock);
            product.Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? product.Emoji : request.Emoji;
            return Ok(new { product, state = new PosState(store.Products, store.Sales) });
        }
    }

    [HttpDelete("products/{id:int}")]
    public IActionResult DeleteProduct(int id)
    {
        var unauthorized = RequireAuthentication();
        if (unauthorized is not null) return unauthorized;
        lock (store.SyncRoot)
        {
            var product = store.Products.FirstOrDefault(item => item.Id == id);
            if (product is null) return NotFound(new { error = "Product not found" });
            store.Products.Remove(product);
            return Ok(new { state = new PosState(store.Products, store.Sales) });
        }
    }

    [HttpPost("checkout")]
    public IActionResult Checkout(CheckoutRequest request)
    {
        var unauthorized = RequireAuthentication();
        if (unauthorized is not null) return unauthorized;
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { error = "Cart is empty" });

        lock (store.SyncRoot)
        {
            var requestedItems = request.Items
                .GroupBy(item => item.ProductId)
                .Select(group => new { ProductId = group.Key, Quantity = group.Sum(item => item.Quantity) })
                .ToList();
            var matched = new List<(Product Product, int Quantity)>();

            foreach (var item in requestedItems)
            {
                var product = store.Products.FirstOrDefault(candidate => candidate.Id == item.ProductId);
                if (product is null || item.Quantity < 1 || product.Stock < item.Quantity)
                    return BadRequest(new { error = "A product is out of stock or has insufficient inventory" });
                matched.Add((product, item.Quantity));
            }

            var subtotal = matched.Sum(item => item.Product.Price * item.Quantity);
            foreach (var item in matched) item.Product.Stock -= item.Quantity;

            var nextId = store.Sales
                .Select(sale => int.Parse(sale.Id.TrimStart('#')))
                .DefaultIfEmpty(1048)
                .Max() + 1;
            var order = new Sale
            {
                Id = $"#{nextId}",
                Date = DateTime.Now.ToString("MMM dd, yyyy · hh:mm tt"),
                Customer = "Walk-in customer",
                Items = matched.Sum(item => item.Quantity),
                Total = Math.Round(subtotal * (1 + PosStore.TaxRate), 2),
                Status = "completed"
            };
            store.Sales.Insert(0, order);
            return Created("/api/checkout", new { order, state = new PosState(store.Products, store.Sales) });
        }
    }
}
