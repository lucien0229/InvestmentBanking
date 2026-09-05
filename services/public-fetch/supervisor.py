"""Credential-free host coordinator; each public URL runs in disposable rootless Podman."""
from http.server import BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import re
import socketserver
import subprocess
import threading
import uuid

SOCKET = os.environ['PUBLIC_FETCH_SOCKET']
IMAGE = os.environ['PUBLIC_FETCH_IMAGE']
WORKER = Path(__file__).with_name('server.mjs').resolve()
if os.geteuid() == 0 or not re.fullmatch(r'sha256:[a-f0-9]{64}', IMAGE):
    raise RuntimeError('unprivileged_coordinator_and_pinned_image_required')
GATE = threading.BoundedSemaphore(2)


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *_):
        pass

    def do_POST(self):
        if self.path != '/v1/public-observation':
            self.send_error(404)
            return
        try:
            size = int(self.headers.get('content-length', '0'))
            if not 0 < size <= 4096:
                raise ValueError('input_limit')
            payload = self.rfile.read(size)
            request = json.loads(payload)
            if not isinstance(request, dict) or set(request) != {'url'} or not isinstance(request['url'], str) or len(request['url']) > 2048:
                raise ValueError('input_contract')
        except (ValueError, OSError):
            self.send_error(400)
            return
        if not GATE.acquire(blocking=False):
            self.send_error(429)
            return
        name = 'ib-public-fetch-' + str(uuid.uuid4())
        try:
            command = ['podman', 'run', '--name', name, '--rm', '--timeout=25', '--interactive',
                '--network=slirp4netns:allow_host_loopback=false', '--read-only', '--cap-drop=ALL',
                '--security-opt=no-new-privileges', '--memory=128m', '--cpus=0.5', '--pids-limit=32',
                '--user=1000:1000', '--tmpfs=/tmp:rw,size=16m',
                '-v', f'{WORKER}:/worker.mjs:ro', '--entrypoint=node', IMAGE, '/worker.mjs']
            result = subprocess.run(command, input=payload, capture_output=True, timeout=30)
            if result.returncode or len(result.stdout) > 15*1024*1024:
                raise ValueError('public_retrieval_failed')
            json.loads(result.stdout)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(result.stdout)))
            self.end_headers()
            self.wfile.write(result.stdout)
        except (subprocess.TimeoutExpired, ValueError, OSError):
            self.send_error(502, 'Public retrieval failed')
        finally:
            try:
                subprocess.run(['podman', 'rm', '--force', '--ignore', name], capture_output=True, timeout=10)
            finally:
                GATE.release()


class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True


if Path(SOCKET).exists():
    Path(SOCKET).unlink()
with Server(SOCKET, Handler) as server:
    os.chmod(SOCKET, 0o660)
    server.serve_forever()
