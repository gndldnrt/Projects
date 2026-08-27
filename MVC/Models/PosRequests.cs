namespace Stockroom.Models;

public sealed record LoginRequest(string Username, string Password);
public sealed record ProductRequest(string Name, decimal Price, int Stock, string? Category, string? Emoji);
public sealed record CheckoutRequest(List<CheckoutItem> Items);
public sealed record CheckoutItem(int ProductId, int Quantity);
public sealed record PosState(List<Product> Products, List<Sale> Sales);
