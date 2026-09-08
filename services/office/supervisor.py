"""Narrow Unix-socket supervisor. Run as the dedicated, unprivileged Office user."""
import base64
from http.server import BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import re
import socketserver
import subprocess
import tempfile
import threading

SOCKET = os.environ['OFFICE_RENDERER_SOCKET']
IMAGE = os.environ['OFFICE_RENDERER_IMAGE']
if not re.fullmatch(r'(?:[\w./:-]+@)?sha256:[a-f0-9]{64}', IMAGE):
    raise RuntimeError('pinned_office_image_required')
GATE = threading.BoundedSemaphore(1)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        if self.path not in ('/v1/workbook', '/v1/source'):
            self.send_error(404)
            return
        try:
            size = int(self.headers.get('content-length', '0'))
            if not 0 < size <= (140 if self.path == '/v1/source' else 64)*1024*1024:
                raise ValueError('input_limit')
            request = json.loads(self.rfile.read(size))
            if not isinstance(request, dict):
                raise ValueError('input_contract')
            operation=request.get('operation')
            if self.path == '/v1/source':
                if operation != 'inspect_source' or set(request) != {'operation','input','source'} or set(request['input']) != {'mode','family'} or request['input']['mode'] not in ('scan','parse') or request['input']['family'] not in ('xlsx','pptx','docx','pdf','csv'):
                    raise ValueError('input_contract')
            elif operation in ('build_analysis_workbook','build_auction_control_workbook','build_teaser_presentation'):
                if set(request) != {'operation','input'} or size > 250000:
                    raise ValueError('input_limit')
            elif operation in ('inspect_analysis_workbook','inspect_auction_control_workbook','inspect_teaser_presentation'):
                if set(request) != {'operation','input','native','reader'}:
                    raise ValueError('input_contract')
            else:
                raise ValueError('unsupported_operation')
        except (ValueError, TypeError, KeyError):
            self.send_error(400)
            return
        if not GATE.acquire(blocking=False):
            self.send_error(429)
            return
        try:
            with tempfile.TemporaryDirectory(prefix='workbook-', dir=os.environ.get('OFFICE_WORK_ROOT')) as directory:
                root = Path(directory)
                (root/'input').mkdir(mode=0o700)
                (root/'output').mkdir(mode=0o700)
                (root/'input'/'input.json').write_text(json.dumps(request['input']))
                if operation == 'inspect_source':
                    content = base64.b64decode(request['source'],validate=True)
                    if len(content) > 100*1024*1024:
                        raise ValueError('source_byte_limit')
                    (root/'input'/'source.bin').write_bytes(content)
                if operation in ('inspect_analysis_workbook','inspect_auction_control_workbook','inspect_teaser_presentation'):
                    native_suffix = 'pptx' if operation == 'inspect_teaser_presentation' else 'xlsx'
                    for kind,suffix in [('native',native_suffix),('reader','pdf')]:
                        content=base64.b64decode(request[kind],validate=True)
                        if len(content)>32*1024*1024:
                            raise ValueError('artifact_byte_limit')
                        (root/'input'/f'artifact.{suffix}').write_bytes(content)
                container_name = 'ib-office-' + root.name
                command = ['podman','run','--name',container_name,'--timeout=175','--rm','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges',
                    '--memory=' + ('2g' if operation == 'inspect_source' else '1g'),'--cpus=1','--pids-limit=128','--userns=keep-id:uid=1000,gid=1000','--user=1000:1000',
                    '--tmpfs=/tmp:rw,size=256m','-e','XDG_CACHE_HOME=/tmp/fontcache',
                    '-v',f'{root}/input:/input:ro','-v',f'{root}/output:/output:rw']
                license_path = os.environ.get('ASPOSE_LICENSE_PATH')
                if license_path and Path(license_path).is_file():
                    command += ['-v',f'{license_path}:/run/secrets/aspose-license:ro']
                if operation == 'inspect_source':
                    signatures = os.environ.get('SOURCE_SIGNATURE_ROOT')
                    if not signatures or not Path(signatures).is_dir():
                        raise ValueError('malware_signatures_unavailable')
                    command += ['-v',f'{signatures}:/signatures:ro']
                    arguments=['/app/services/office/process_source.py']
                elif operation in ('build_analysis_workbook','build_auction_control_workbook','build_teaser_presentation'):
                    arguments=['/app/services/office/run_workbook.py','/input/input.json','/output']
                else:
                    arguments=['/app/services/office/inspect_workbook.py' if operation == 'inspect_analysis_workbook' else '/app/services/office/inspect_auction_workbook.py' if operation == 'inspect_auction_control_workbook' else '/app/services/office/inspect_teaser_presentation.py','/input/input.json',f'/input/artifact.{native_suffix}' if operation == 'inspect_teaser_presentation' else '/input/artifact.xlsx','/input/artifact.pdf','/output/inspection-report.json']
                command += ['--entrypoint','python',IMAGE,*arguments]
                try:
                    result = subprocess.run(command, capture_output=True, timeout=180)
                finally:
                    # Kill only this render's container, including when the Podman client times out.
                    subprocess.run(['podman','rm','--force','--ignore',container_name], capture_output=True, timeout=15)
                if result.returncode:
                    self.send_error(502, 'Office renderer failed')
                    return
                if operation == 'inspect_source':
                    report = json.loads((root/'output'/'source-report.json').read_text())
                    report['container_digest'] = IMAGE
                    payload = json.dumps(report).encode()
                    if len(payload) > 16*1024*1024:
                        raise ValueError('source_output_limit')
                    self.send_response(200)
                    self.send_header('Content-Type','application/json')
                    self.send_header('Content-Length',str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return
                report = json.loads((root/'output'/'render-report.json').read_text()) if operation in ('build_analysis_workbook','build_auction_control_workbook','build_teaser_presentation') else {'revision_id':request['input']['revision_id']}
                inspection = json.loads((root/'output'/'inspection-report.json').read_text())
                report['container_digest']=IMAGE
                if operation in ('build_analysis_workbook','build_auction_control_workbook','build_teaser_presentation'):
                    (root/'output'/'render-report.json').write_text(json.dumps(report,indent=2))
                files = []
                for file in sorted((root/'output').iterdir()):
                    if file.name == 'inspection-report.json':
                        continue
                    if file.is_symlink() or not re.fullmatch(r'(analysis-valuation\.(xlsx|pdf)|auction-control\.(xlsx|pdf)|teaser\.(pptx|pdf)|render-report\.json|(native|reader)-page-[1-9]\d{0,2}\.png)', file.name):
                        raise ValueError('output_path_invalid')
                    files.append({'path':file.name,'content':base64.b64encode(file.read_bytes()).decode()})
                payload = json.dumps({'report':report,'checks':inspection['checks'],'files':files}).encode()
                if len(payload) > 96*1024*1024:
                    raise ValueError('output_limit')
                self.send_response(200)
                self.send_header('Content-Type','application/json')
                self.send_header('Content-Length',str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
        except (subprocess.TimeoutExpired, ValueError, OSError):
            self.send_error(502, 'Office renderer failed')
        finally:
            GATE.release()


class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True


if Path(SOCKET).exists():
    Path(SOCKET).unlink()
with Server(SOCKET, Handler) as server:
    os.chmod(SOCKET, 0o660)
    server.serve_forever()
