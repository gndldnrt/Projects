namespace Stockroom.Models;

public sealed class Sale
{
    public string Id { get; set; } = "";
    public string Date { get; set; } = "";
    public string Customer { get; set; } = "";
    public int Items { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "completed";
}
