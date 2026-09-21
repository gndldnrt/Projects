from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv(Path(__file__).resolve().parents[1] / "supabase.env", override=False)

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "https://supabase.co",
).rstrip("/")
for suffix in ("/rest/v1", "/rest/v1/"):
    if SUPABASE_URL.endswith(suffix.rstrip("/")):
        SUPABASE_URL = SUPABASE_URL[: -len(suffix.rstrip("/"))].rstrip("/")
        break

SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "sb_publishable_VVtP7ffWvziomjJLdCMypQ_IthkgHpm",
)

class _RestResponse:
    def __init__(self, data: Any):
        self.data = data


class _RestTable:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.filters: list[tuple[str, str, str]] = []
        self.operation = "select"
        self.select_columns = "*"
        self.payload: Any = None

    def select(self, columns: str):
        self.operation = "select"
        self.select_columns = columns
        return self

    def insert(self, payload: Any):
        self.operation = "insert"
        self.payload = payload
        return self

    def gte(self, column: str, value: Any):
        self.filters.append((column, "gte", str(value)))
        return self

    def lte(self, column: str, value: Any):
        self.filters.append((column, "lte", str(value)))
        return self

    def neq(self, column: str, value: Any):
        self.filters.append((column, "neq", str(value)))
        return self

    def execute(self):
        url = f"{SUPABASE_URL}/rest/v1/{self.table_name}"
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        params = [("select", self.select_columns)]
        params.extend((column, f"{operator}.{value}") for column, operator, value in self.filters)
        with httpx.Client(timeout=20) as client:
            if self.operation == "insert":
                response = client.post(url, headers=headers, params=params, json=self.payload)
            else:
                response = client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return _RestResponse(response.json())


class _RestClient:
    def table(self, table_name: str):
        return _RestTable(table_name)


@lru_cache(maxsize=1)
def get_supabase() -> Client | _RestClient:
    if re.match(r"^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$", SUPABASE_ANON_KEY):
        return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _RestClient()
