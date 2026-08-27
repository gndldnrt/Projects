from mailbox import mbox
import os
import json
import mimetypes
import secrets
import threading
import urllib.error
import urllib.request

from dotenv import load_dotenv
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

load_dotenv()

ROOT = Path(__file__).parent
DATA_FILE = ROOT / "data.json"
FRONTEND_DIST = ROOT / "frontend" / "dist"

PORT = int(os.getenv("PORT", "8000"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/").removesuffix("/rest/v1")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_REQUIRED = os.getenv("SUPABASE_REQUIRED", "true").lower() not in {"0", "false", "no"}

LOGIN_USERNAME = os.getenv("POS_USERNAME", "geandell")
LOGIN_PASSWORD = os.getenv("POS_PASSWORD", "12345678")

TAX_RATE = 0.08875
LOCK = threading.Lock()
SESSIONS = set()
SUPABASE_LAST_ERROR = ""


class SupabaseError(RuntimeError):
    pass

def product_fields(payload, existing=None):
    existing = existing or {}
    name = str(payload.get("name", existing.get("name", "")) or "").strip()
    category = str(payload.get("category", existing.get("category", "Espresso")) or "Espresso").strip()
    emoji = str(payload.get("emoji", existing.get("emoji", "✦")) or "✦").strip() or "✦"
    if not name:
        raise ValueError("Product name is required")
    try:
        price = max(0, float(payload.get("price", existing.get("price", 0)) or 0))
        stock = max(0, int(payload.get("stock", existing.get("stock", 0)) or 0))
    except (TypeError, ValueError) as error:
        raise ValueError("Price must be a number and stock must be a whole number") from error
    return {"name": name, "category": category or "Espresso", "price": price, "stock": stock, "emoji": emoji}

def next_product_sku(products):
    sku_numbers = []
    for product in products:
        sku = str(product.get("sku", ""))
        try:
            sku_numbers.append(int(sku.rsplit("-", 1)[1]))
        except (IndexError, ValueError):
            continue
    return f"BRW-{max(sku_numbers, default=0) + 1:03d}"

def next_product_id(products):
    product_ids = []
    for product in products:
        try:
            product_ids.append(int(str(product.get("p_id", "0"))))
        except (TypeError, ValueError):
            continue
    return f"{max(product_ids, default=0) + 1:03d}"

def sales_id_value(sale):
    return str(sale.get("sales_id", sale.get("id", "")))

def save_state(state):
    temporary = DATA_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2), encoding="utf-8")
    temporary.replace(DATA_FILE)


def load_state():
    if not DATA_FILE.exists():
        state = {"products": [], "sales": []}
        save_state(state)
        return state
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def supabase_request(method, table, payload=None, query=""):
    global SUPABASE_LAST_ERROR
    if not SUPABASE_KEY:
        SUPABASE_LAST_ERROR = "SUPABASE_KEY is not configured"
        return None
    url = f"{SUPABASE_URL}/rest/v1/{table}{query}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, method=method)
    request.add_header("apikey", SUPABASE_KEY)
    request.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    request.add_header("Content-Type", "application/json")
    request.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            content = response.read()
            return json.loads(content) if content else []
    except urllib.error.HTTPError as error:
        response_body = error.read().decode("utf-8", errors="replace")
        SUPABASE_LAST_ERROR = f"Supabase HTTP {error.code}: {response_body[:240]}"
        return None
    except (urllib.error.URLError, json.JSONDecodeError) as error:
        SUPABASE_LAST_ERROR = f"Supabase request failed: {error}"
        return None


def load_database_state():
    products = supabase_request("GET", "products", query="?select=*&order=p_id.asc")
    sales = supabase_request("GET", "sales", query="?select=*&order=sales_id.desc")
    if sales is None:
        sales = supabase_request("GET", "sales", query="?select=*&order=id.desc")
        if sales is not None:
            sales = [{**sale, "sales_id": str(sale.get("id", ""))} for sale in sales]
    if products is None or sales is None:
        return None
    return {"products": products, "sales": sales}


def current_state():
    database_state = load_database_state()
    if database_state is None:
        if SUPABASE_REQUIRED:
            raise SupabaseError(SUPABASE_LAST_ERROR or "Supabase is unavailable")
        return load_state()
    return database_state


def database_status():
    database_state = load_database_state()
    if database_state is None:
        return {"connected": False, "error": SUPABASE_LAST_ERROR or "Supabase is unavailable"}
    return {"connected": True, "products": len(database_state["products"]), "sales": len(database_state["sales"])}


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length) or b"{}")

    def is_authenticated(self):
        cookie = self.headers.get("Cookie", "")
        token = next((part.split("=", 1)[1] for part in cookie.split("; ") if part.startswith("stockroom_session=")), "")
        return token in SESSIONS

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/session":
            self.send_json(200, {"authenticated": self.is_authenticated()})
            return
        if path == "/api/database":
            if not self.is_authenticated():
                self.send_json(401, {"error": "Authentication required"})
                return
            status = database_status()
            self.send_json(200 if status["connected"] else 503, status)
            return
        if path.startswith("/api/") and not self.is_authenticated():
            self.send_json(401, {"error": "Authentication required"})
            return
        if path == "/api/state":
            with LOCK:
                self.send_json(200, current_state())
            return
        if path == "/" or path == "/index.html" or path.startswith("/assets/"):
            requested_file = FRONTEND_DIST / ("index.html" if path in {"/", "/index.html"} else path.lstrip("/"))
            if not requested_file.is_file():
                requested_file = ROOT / "index.html"
            body = requested_file.read_bytes()
            self.send_response(200)
            content_type = mimetypes.guess_type(str(requested_file))[0] or "application/octet-stream"
            self.send_header("Content-Type", f"{content_type}; charset=utf-8" if content_type.startswith("text/") else content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            payload = self.read_json()
            if path == "/api/login":
                if payload.get("username") != LOGIN_USERNAME or payload.get("password") != LOGIN_PASSWORD:
                    self.send_json(401, {"error": "Incorrect username or password"})
                    return
                token = secrets.token_urlsafe(32)
                SESSIONS.add(token)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Set-Cookie", f"stockroom_session={token}; HttpOnly; SameSite=Lax; Path=/")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"authenticated": True, "username": LOGIN_USERNAME}).encode("utf-8"))
                return
            if path == "/api/logout":
                cookie = self.headers.get("Cookie", "")
                token = next((part.split("=", 1)[1] for part in cookie.split("; ") if part.startswith("stockroom_session=")), "")
                SESSIONS.discard(token)
                self.send_json(200, {"authenticated": False})
                return
            if path.startswith("/api/") and not self.is_authenticated():
                self.send_json(401, {"error": "Authentication required"})
                return
            with LOCK:
                state = current_state()
                if path == "/api/products":
                    products = state["products"]
                    product = {"p_id": next_product_id(products),
                               "sku": next_product_sku(products),
                               **product_fields(payload)}
                    database_product = supabase_request("POST", "products", product)
                    if database_product is None:
                        if SUPABASE_REQUIRED:
                            raise SupabaseError(SUPABASE_LAST_ERROR or "Supabase could not create the product")
                        products.append(product)
                        save_state(state)
                    elif not database_product:
                        raise SupabaseError("Supabase did not return the created product")
                    else:
                        product = database_product[0]
                        state["products"].append(product)
                    self.send_json(201, {"product": product, "state": state})
                    return
                if path == "/api/checkout":
                    items = payload.get("items", [])
                    if not items:
                        raise ValueError("Cart is empty")
                    products_by_id = {str(p["p_id"]): p for p in state["products"]}
                    subtotal = 0
                    total_items = 0
                    for item in items:
                        product = products_by_id.get(str(item["productId"]))
                        quantity = int(item["quantity"])
                        if not product or quantity < 1 or product["stock"] < quantity:
                            raise ValueError("A product is out of stock or has insufficient inventory")
                        subtotal += product["price"] * quantity
                        total_items += quantity
                    for item in items:
                        product = products_by_id[str(item["productId"])]
                        product["stock"] -= int(item["quantity"])
                        if SUPABASE_KEY:
                            stock_update = supabase_request("PATCH", "products", {"stock": product["stock"]}, f"?p_id=eq.{product['p_id']}")
                            if stock_update is None and SUPABASE_REQUIRED:
                                raise SupabaseError(SUPABASE_LAST_ERROR or "Supabase could not update stock")
                    next_order = max(
                        (int(sales_id_value(s).lstrip("#")) for s in state["sales"]),
                        default=1048,
                    ) + 1
                    total = round(subtotal * (1 + TAX_RATE), 2)
                    order = {"sales_id": f"#{next_order}",
                                              "date": datetime.now().strftime("%b %d, %Y · %I:%M %p"),
                                              "customer": "Walk-in customer", "items": total_items,
                                              "total": total, "status": "completed"}
                    database_sale = supabase_request("POST", "sales", order)
                    if database_sale is None and "sales_id" in SUPABASE_LAST_ERROR and "column" in SUPABASE_LAST_ERROR:
                        legacy_order = {"id": order["sales_id"], **{key: value for key, value in order.items() if key != "sales_id"}}
                        database_sale = supabase_request("POST", "sales", legacy_order)
                        if database_sale:
                            database_sale = [{**sale, "sales_id": str(sale.get("id", order["sales_id"]))} for sale in database_sale]
                    if database_sale is None:
                        if SUPABASE_REQUIRED:
                            for item in items:
                                product = products_by_id[str(item["productId"])]
                                product["stock"] += int(item["quantity"])
                                supabase_request("PATCH", "products", {"stock": product["stock"]}, f"?p_id=eq.{product['p_id']}")
                            raise SupabaseError(SUPABASE_LAST_ERROR or "Supabase could not save the sale")
                        state["sales"].insert(0, order)
                        save_state(state)
                    else:
                        order = database_sale[0] if database_sale else order
                        state["sales"].insert(0, order)
                    self.send_json(201, {"state": state, "order": state["sales"][0]})
                    return
                self.send_json(404, {"error": "Not found"})
        except SupabaseError as error:
            self.send_json(503, {"error": str(error)})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})

    def do_PUT(self):
        self.update_product()

    def update_product(self):
        if not self.is_authenticated():
            self.send_json(401, {"error": "Authentication required"})
            return
        try:
            product_id = urlparse(self.path).path.rsplit("/", 1)[1]
            payload = self.read_json()
            with LOCK:
                state = current_state()
                product = next((item for item in state["products"] if str(item["p_id"]) == product_id), None)
                if not product:
                    self.send_json(404, {"error": "Product not found"})
                    return
                name = str(payload.get("name", "")).strip()
                if not name:
                    raise ValueError("Product name is required")
                fields = product_fields(payload, product)
                product.update(fields)
                database_product = supabase_request("PATCH", "products", fields, f"?p_id=eq.{product_id}")
                if database_product is None:
                    if SUPABASE_REQUIRED:
                        raise SupabaseError(SUPABASE_LAST_ERROR or "Supabase could not update the product")
                    save_state(state)
                elif not database_product:
                    raise SupabaseError("Supabase did not return the updated product")
                else:
                    product = database_product[0]
                    product_index = next(index for index, item in enumerate(state["products"]) if str(item["p_id"]) == product_id)
                    state["products"][product_index] = product
                self.send_json(200, {"product": product, "state": state})
                # self.send_json(401, {"message": f"Product '{product['name']}' has been updated successfully."})
                # mbox.showinfo("Product Updated", f"Product '{product['name']}' has been updated successfully.")
        except SupabaseError as error:
            self.send_json(503, {"error": str(error)})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError, IndexError) as error:
            self.send_json(400, {"error": str(error)})

    def do_DELETE(self):
        if not self.is_authenticated():
            self.send_json(401, {"error": "Authentication required"})
            return
        try:
            product_id = urlparse(self.path).path.rsplit("/", 1)[1]
            with LOCK:
                state = current_state()
                original_count = len(state["products"])
                database_product = supabase_request("DELETE", "products", query=f"?p_id=eq.{product_id}")
                if database_product is not None:
                    if not database_product:
                        self.send_json(404, {"error": "Product not found"})
                        return
                    state["products"] = [item for item in state["products"] if str(item["p_id"]) != product_id]
                    self.send_json(200, {"state": state})
                    return
                if SUPABASE_REQUIRED:
                    raise SupabaseError(SUPABASE_LAST_ERROR or "Supabase could not delete the product")
                state["products"] = [item for item in state["products"] if str(item["p_id"]) != product_id]
                if len(state["products"]) == original_count:
                    self.send_json(404, {"error": "Product not found"})
                    return
                save_state(state)
                self.send_json(200, {"state": state})
        except SupabaseError as error:
            self.send_json(503, {"error": str(error)})
        except (ValueError, IndexError) as error:
            self.send_json(400, {"error": str(error)})


if __name__ == "__main__":
    try:
        server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    except OSError as error:
        if error.errno == 48:
            raise SystemExit(
                f"Port {PORT} is already in use. Stop the existing server or run with PORT=8001."
            )
        raise
    print(f"Brew & Co. POS running at http://localhost:{PORT}")
    server.serve_forever()