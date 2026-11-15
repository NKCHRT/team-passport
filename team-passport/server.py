"""Паспорт команды — локальный сервер и CORS-прокси.

Запускается через «Открыть паспорт команды.bat».
Слушает только 127.0.0.1; проксирует только perm-volley.ru.
"""
from __future__ import annotations

import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8777
ROOT = os.path.dirname(os.path.abspath(__file__))
ALLOWED_HOST_SUFFIX = "perm-volley.ru"


def is_allowed(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    return host == ALLOWED_HOST_SUFFIX or host.endswith("." + ALLOWED_HOST_SUFFIX)


class Handler(BaseHTTPRequestHandler):
    server_version = "TeamPass/1.0"

    def log_message(self, fmt, *args):
        # Не засоряем консоль каждым файлом.
        pass

    def _send(self, status: int, body: bytes, content_type: str, extra=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Connection", "close")
        if extra:
            for key, value in extra.items():
                self.send_header(key, value)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, b"", "text/plain; charset=utf-8")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/api/proxy":
            self._proxy(parsed.query)
            return

        if path == "/":
            path = "/index.html"

        relative = path.lstrip("/").replace("/", os.sep)
        full = os.path.abspath(os.path.join(ROOT, relative))
        if not (full == ROOT or full.startswith(ROOT + os.sep)):
            self._send(403, "Forbidden".encode("utf-8"), "text/plain; charset=utf-8")
            return
        if not os.path.isfile(full):
            self._send(404, "Not found".encode("utf-8"), "text/plain; charset=utf-8")
            return

        content_type = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in (
            "application/javascript",
            "application/json",
            "image/svg+xml",
        ):
            content_type += "; charset=utf-8"
        with open(full, "rb") as handle:
            body = handle.read()
        self._send(200, body, content_type)

    def _proxy(self, query: str):
        params = urllib.parse.parse_qs(query)
        url = (params.get("url") or [""])[0]
        if not url or not is_allowed(url):
            self._send(400, "URL is not allowed".encode("utf-8"), "text/plain; charset=utf-8")
            return

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; TeamPass/1.0)",
                "Accept": "*/*",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                body = response.read()
                content_type = response.headers.get("Content-Type", "application/octet-stream")
            self._send(200, body, content_type)
        except urllib.error.HTTPError as exc:
            message = f"Remote HTTP {exc.code}".encode("utf-8")
            self._send(502, message, "text/plain; charset=utf-8")
        except Exception as exc:  # noqa: BLE001
            message = f"Не удалось загрузить страницу: {exc}".encode("utf-8")
            self._send(502, message, "text/plain; charset=utf-8")


def main():
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as exc:
        print(f"Не удалось запустить сервер на {HOST}:{PORT}: {exc}")
        print(f"Возможно, приложение уже запущено: http://{HOST}:{PORT}/")
        return 1

    print()
    print(f"  Паспорт команды запущен: http://{HOST}:{PORT}/")
    print("  Импорт с сайта ПГФВ работает через локальный прокси.")
    print("  Не закрывайте это окно, пока работаете с приложением.")
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
