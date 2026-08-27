"""Upload the local Python data.json records to Supabase REST."""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).parent
DATA_FILE = ROOT / "data.json"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://thugdizbphittwuqifcj.supabase.co").rstrip("/")
SUPABASE_URL = SUPABASE_URL.removesuffix("/rest/v1")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()


def request(method, table, rows):
    payload = json.dumps(rows).encode("utf-8")
    conflict_column = "p_id" if table == "products" else "sales_id"
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict_column}"
    req = urllib.request.Request(url, data=payload, method=method)
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=representation")
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read() or b"[]")


def main():
    if not SUPABASE_KEY:
        print("SUPABASE_KEY is not configured.", file=sys.stderr)
        return 1
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    for table in ("products", "sales"):
        rows = data.get(table, [])
        if table == "products":
            rows = [{**row, "p_id": row.get("p_id", row.get("id"))} for row in rows]
            for row in rows:
                row.pop("id", None)
        else:
            rows = [{**row, "sales_id": row.get("sales_id", row.get("id"))} for row in rows]
            for row in rows:
                row.pop("id", None)
        if rows:
            try:
                migrated = request("POST", table, rows)
            except urllib.error.HTTPError as error:
                detail = error.read().decode("utf-8", errors="replace")
                print(f"{table}: Supabase HTTP {error.code}: {detail[:240]}", file=sys.stderr)
                return 1
            print(f"{table}: migrated {len(migrated)} row(s)")
        else:
            print(f"{table}: no local rows to migrate")
    print("Migration complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
