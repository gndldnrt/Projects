using System.Collections.Concurrent;
using Stockroom.Models;

namespace Stockroom.Services;

public sealed class PosStore
{
    public const decimal TaxRate = 0.08875m;
    public object SyncRoot { get; } = new();
    public List<Product> Products { get; } = [];
    public List<Sale> Sales { get; } = [];
    public ConcurrentDictionary<string, DateTimeOffset> Sessions { get; } = new();
}
