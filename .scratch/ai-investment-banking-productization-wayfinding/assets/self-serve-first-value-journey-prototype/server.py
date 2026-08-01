#!/usr/bin/env python3
"""PROTOTYPE / THROWAWAY static server. No production behavior lives here."""

from __future__ import annotations

import argparse
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class PrototypeHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Prototype", "throwaway-ticket-9")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Ticket 9 throwaway UI prototype")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), PrototypeHandler)
    print(f"PROTOTYPE / THROWAWAY: http://127.0.0.1:{args.port}/?variant=A")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
