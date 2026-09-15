import json
import os
import secrets
import socket
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).parents[1] / ".env")
PORT = int(os.getenv("PORT", "8000"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/").removesuffix("/rest/v1")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SESSIONS: dict[str, dict] = {}


class ApiError(RuntimeError):
    pass


def supabase(method: str, table: str, payload=None, query: str = ""):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ApiError("Supabase is not configured. Copy .env.example to .env and add SUPABASE_KEY.")
    body = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}{query}", data=body, method=method)
    request.add_header("apikey", SUPABASE_KEY)
    request.add_header("Authorization", "Bearer " + SUPABASE_KEY)
    request.add_header("Content-Type", "application/json")
    request.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            content = response.read()
            return json.loads(content) if content else []
    except (urllib.error.HTTPError, urllib.error.URLError) as error:
        detail = error.read().decode(errors="replace") if isinstance(error, urllib.error.HTTPError) else str(error)
        raise ApiError(f"Supabase request failed: {detail[:300]}") from error


def optional_supabase(method: str, table: str, payload=None, query: str = ""):
    try:
        return supabase(method, table, payload, query)
    except ApiError:
        return []


def state():
    return {
        "products": supabase("GET", "products", query="?select=product_id,category_id,sku,barcode,product_name,description,base_price,tax_rate,image_url,is_active,is_composite,created_at,updated_at,categories(category_name)&order=product_name.asc"),
        "categories": supabase("GET", "categories", query="?select=category_id,category_name&order=category_name.asc"),
        "ingredients": supabase("GET", "raw_ingredients", query="?select=ingredient_id,supplier_id,ingredient_name,stock_quantity,unit_of_measure,reorder_level,reorder_quantity,cost_per_unit,updated_at&order=ingredient_name.asc"),
        "variants": supabase("GET", "product_variants", query="?select=variant_id,product_id,variant_name,price_delta,sku,is_active&order=variant_name.asc"),
        "recipes": supabase("GET", "product_recipes", query="?select=recipe_id,product_id,variant_id,ingredient_id,quantity_required&order=product_id.asc"),
        "modifier_groups": supabase("GET", "modifier_groups", query="?select=group_id,group_name,min_selection,max_selection&order=group_name.asc"),
        "product_modifier_groups": supabase("GET", "product_modifier_groups", query="?select=product_id,group_id"),
        "modifiers": supabase("GET", "modifiers", query="?select=modifier_id,group_id,ingredient_id,modifier_name,price,ingredient_deduction&order=modifier_name.asc"),
        "orders": optional_supabase("GET", "pos_orders", query="?select=order_id,order_number,customer_name,subtotal,tax_amount,total_amount,status,created_at&order=created_at.desc&limit=20"),
    }


def product_fields(payload):
    product_name = str(payload.get("product_name", "")).strip()
    sku = str(payload.get("sku", "")).strip()
    if not product_name or not sku:
        raise ValueError("Product name and SKU are required")
    return {
        "product_name": product_name,
        "category_id": payload.get("category_id") or None,
        "sku": sku,
        "barcode": str(payload.get("barcode", "")).strip() or None,
        "description": str(payload.get("description", "")).strip() or None,
        "base_price": max(0, float(payload.get("base_price", 0))),
        "tax_rate": max(0, float(payload.get("tax_rate", 0))),
        "image_url": str(payload.get("image_url", "")).strip() or None,
        "is_active": bool(payload.get("is_active", True)),
        "is_composite": bool(payload.get("is_composite", True)),
    }


def resolve_user_by_identifier(identifier: str):
    value = str(identifier or "").strip()
    if not value:
        return None
    if "@" in value:
        query = f"?select=user_id,username,email,pin_code,first_name,last_name,is_active,roles(role_name)&email=eq.{quote(value, safe='')}&is_active=eq.true"
    else:
        query = f"?select=user_id,username,email,pin_code,first_name,last_name,is_active,roles(role_name)&username=eq.{quote(value, safe='')}&is_active=eq.true"
    users = supabase("GET", "users", query=query)
    return users[0] if users else None


def supabase_auth_login(email: str, password: str):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ApiError("Supabase is not configured. Copy .env.example to .env and add SUPABASE_KEY.")
    request = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        method="POST",
    )
    request.add_header("apikey", SUPABASE_KEY)
    request.add_header("Authorization", "Bearer " + SUPABASE_KEY)
    request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            content = response.read()
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise ApiError(f"Supabase Auth failed: {detail[:300]}") from error
    except urllib.error.URLError as error:
        raise ApiError(f"Supabase Auth request failed: {str(error)[:300]}") from error


class Handler(BaseHTTPRequestHandler):
    def json(self, status, payload, headers=None):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def session_user(self):
        cookie = self.headers.get("Cookie", "")
        token = next((part.split("=", 1)[1] for part in cookie.split("; ") if part.startswith("brewline_session=")), "")
        return SESSIONS.get(token)

    def require_session(self):
        if not self.session_user():
            self.json(401, {"error": "Authentication required"})
            return False
        return True

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        try:
            path = urlparse(self.path).path
            if path == "/api/health":
                self.json(200, {"ok": True, "database": bool(SUPABASE_URL and SUPABASE_KEY)})
            elif path == "/api/session":
                self.json(200, {"authenticated": bool(self.session_user()), "user": self.session_user()})
            elif path == "/api/state":
                if not self.require_session():
                    return
                self.json(200, state())
            elif path.startswith("/api/products/barcode/"):
                if not self.require_session():
                    return
                barcode = quote(unquote(path.rsplit("/", 1)[-1]), safe="")
                products = supabase("GET", "products", query=f"?select=product_id,category_id,sku,barcode,product_name,description,base_price,tax_rate,image_url,is_active,is_composite,categories(category_name)&barcode=eq.{barcode}&is_active=eq.true")
                if not products:
                    self.json(404, {"error": "No active product found for that barcode"})
                else:
                    self.json(200, products[0])
            else:
                self.json(404, {"error": "Route not found"})
        except ApiError as error:
            self.json(503, {"error": str(error)})

    def do_POST(self):
        try:
            path = urlparse(self.path).path
            if path == "/api/login":
                payload = self.read_body()
                username = str(payload.get("username", "")).strip()
                email = str(payload.get("email", "")).strip()
                password = str(payload.get("password", ""))
                identifier = email or username
                if not identifier or not password:
                    raise ValueError("Username/email and password are required")

                user_profile = resolve_user_by_identifier(identifier)
                auth_payload = None
                if user_profile and user_profile.get("email"):
                    try:
                        auth_payload = supabase_auth_login(user_profile["email"], password)
                    except ApiError:
                        auth_payload = None

                if auth_payload:
                    auth_user = auth_payload.get("user") or {}
                    user = user_profile or {
                        "user_id": auth_user.get("id"),
                        "username": (auth_user.get("email") or "").split("@", 1)[0],
                        "first_name": "",
                        "last_name": "",
                    }
                    token = secrets.token_urlsafe(32)
                    SESSIONS[token] = {
                        "user_id": user.get("user_id") or auth_user.get("id"),
                        "username": user.get("username") or (auth_user.get("email") or "").split("@", 1)[0],
                        "first_name": user.get("first_name") or "",
                        "last_name": user.get("last_name") or "",
                        "role": (user.get("roles") or {}).get("role_name") if isinstance(user.get("roles"), dict) else None,
                    }
                    self.json(200, {"authenticated": True, "user": SESSIONS[token]}, {
                        "Set-Cookie": f"brewline_session={token}; HttpOnly; SameSite=Lax; Path=/",
                    })
                    return

                if not user_profile:
                    self.json(401, {"error": "Incorrect username or password"})
                    return
                if not secrets.compare_digest(password, str(user_profile.get("pin_code") or "")):
                    self.json(401, {"error": "Incorrect username or password"})
                    return
                user = user_profile
                token = secrets.token_urlsafe(32)
                SESSIONS[token] = {
                    "user_id": user["user_id"],
                    "username": user["username"],
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "role": (user.get("roles") or {}).get("role_name"),
                }
                self.json(200, {"authenticated": True, "user": SESSIONS[token]}, {
                    "Set-Cookie": f"brewline_session={token}; HttpOnly; SameSite=Lax; Path=/",
                })
                return
            if path == "/api/logout":
                cookie = self.headers.get("Cookie", "")
                token = next((part.split("=", 1)[1] for part in cookie.split("; ") if part.startswith("brewline_session=")), "")
                SESSIONS.pop(token, None)
                self.json(200, {"authenticated": False})
                return
            if path == "/api/checkout":
                if not self.require_session():
                    return
                payload = self.read_body()
                items = payload.get("items", [])
                if not items:
                    raise ValueError("The cart is empty")
                result = supabase("POST", "rpc/complete_pos_order", {
                    "p_user_id": self.session_user()["user_id"],
                    "p_customer_name": str(payload.get("customer_name", "Walk-in customer")).strip() or "Walk-in customer",
                    "p_items": items,
                    "p_payment_method": str(payload.get("payment_method", "cash")).strip() or "cash",
                })
                self.json(201, result)
                return
            if path != "/api/products":
                self.json(404, {"error": "Route not found"})
                return
            if not self.require_session():
                return
            payload = self.read_body()
            product = supabase("POST", "products", product_fields(payload))[0]
            self.json(201, product)
        except (ApiError, ValueError, TypeError, KeyError) as error:
            status = 503 if isinstance(error, ApiError) else 400
            self.json(status, {"error": str(error)})

    def do_PATCH(self):
        try:
            if not self.require_session():
                return
            product_id = unquote(urlparse(self.path).path.rsplit("/", 1)[-1])
            updated = supabase("PATCH", "products", product_fields(self.read_body()), f"?product_id=eq.{quote(product_id, safe='')}")
            if not updated:
                self.json(404, {"error": "Product not found"})
                return
            self.json(200, updated[0])
        except (ApiError, ValueError, TypeError, KeyError) as error:
            self.json(503 if isinstance(error, ApiError) else 400, {"error": str(error)})

    def do_DELETE(self):
        try:
            if not self.require_session():
                return
            product_id = unquote(urlparse(self.path).path.rsplit("/", 1)[-1])
            deleted = supabase("DELETE", "products", query=f"?product_id=eq.{quote(product_id, safe='')}")
            if not deleted:
                self.json(404, {"error": "Product not found"})
                return
            self.json(200, {"deleted": deleted[0]})
        except ApiError as error:
            self.json(503, {"error": str(error)})


def find_available_port(start_port: int, max_tries: int = 20) -> int:
    for port in range(start_port, start_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("0.0.0.0", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found starting from {start_port}")


if __name__ == "__main__":
    try:
        port = PORT
        if port != find_available_port(PORT):
            port = find_available_port(PORT)
            print(f"Port {PORT} is in use, using {port} instead.")
        else:
            port = PORT
        print(f"Brewline API listening on http://localhost:{port}")
        ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
    except OSError as error:
        raise SystemExit(f"Unable to start Brewline API on port {PORT}: {error}") from error
    except RuntimeError as error:
        raise SystemExit(str(error)) from error
