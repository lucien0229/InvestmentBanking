"""Fixed Source inspection profile: no networking, macros, refresh or execution."""
import csv
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import time
import zipfile
import xml.etree.ElementTree as ET

MAX_BYTES = 100 * 1024 * 1024
MAX_EXPANDED = 256 * 1024 * 1024
MAX_FRAGMENTS = 10000
MAX_TEXT_BYTES = 8 * 1024 * 1024
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}


def inspect(path, family, mode, signature_root=Path('/signatures')):
    size = path.stat().st_size
    if not 0 < size <= MAX_BYTES:
        raise ValueError('source_byte_limit')
    signatures = [p for p in signature_root.glob('*') if p.suffix in ('.cvd', '.cld')]
    if not signatures or time.time() - max(p.stat().st_mtime for p in signatures) > 48 * 3600:
        raise ValueError('malware_signatures_stale')
    scan = subprocess.run(['clamscan', '--no-summary', '--stdout', '--database=' + str(signature_root), '--max-filesize=100M', '--max-scansize=256M', '--max-recursion=12', '--alert-exceeds-max=yes', str(path)], capture_output=True, timeout=60)
    if scan.returncode:
        raise ValueError('malware_detected' if scan.returncode == 1 else 'scan_incomplete')
    limitations, fragments = [], []
    text_bytes = 0

    def add(locator, text):
        nonlocal text_bytes
        text = text.strip()
        if not text:
            return
        text_bytes += len(text.encode('utf-8'))
        if len(fragments) >= MAX_FRAGMENTS or text_bytes > MAX_TEXT_BYTES or len(text) > 200000:
            raise ValueError('source_extraction_limit')
        fragments.append({'locator': locator, 'content_text': text, 'content_sha256': 'sha256:' + hashlib.sha256(text.encode()).hexdigest()})

    def xml(archive, name):
        payload = archive.read(name)
        if b'<!DOCTYPE' in payload.upper() or b'<!ENTITY' in payload.upper():
            raise ValueError('unsafe_xml_entity')
        return ET.fromstring(payload)

    if family in ('xlsx', 'docx', 'pptx'):
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            if len(entries) > 10000 or len({entry.filename for entry in entries}) != len(entries):
                raise ValueError('archive_entry_limit')
            total = 0
            for entry in entries:
                name = entry.filename
                parts = PurePosixPath(name).parts
                if name.startswith('/') or '\\' in name or any(part in ('..', '.') for part in parts) or re.match(r'^[a-zA-Z]:', name) or (entry.external_attr >> 16) & 0o170000 == 0o120000:
                    raise ValueError('unsafe_archive_path')
                total += entry.file_size
                if total > MAX_EXPANDED or entry.file_size > max(entry.compress_size, 1) * 100:
                    raise ValueError('archive_expansion_limit')
                if entry.flag_bits & 1:
                    raise ValueError('protected_file_not_supported')
                if re.search(r'vbaProject|/embeddings/|\.(exe|dll|scr|com|msi|js|vbs|ps1|bat|cmd|sh)$', name, re.I):
                    raise ValueError('executable_content')
                if re.search(r'externalLinks|connections\.xml|queryTables', name, re.I):
                    limitations.append('external_links_not_refreshed')
                # Validate every XML part before any substantive extraction.
                if name.endswith(('.xml', '.rels')):
                    node = xml(archive, name)
                    if any(item.tag.endswith('}workbookProtection') or item.tag.endswith('}documentProtection') for item in node.iter()):
                        raise ValueError('protected_file_not_supported')
                    if name.endswith('.rels') and any(item.attrib.get('TargetMode') == 'External' for item in node):
                        limitations.append('external_relationships_not_followed')
            required = {'xlsx': 'xl/workbook.xml', 'docx': 'word/document.xml', 'pptx': 'ppt/presentation.xml'}[family]
            if '[Content_Types].xml' not in archive.namelist() or required not in archive.namelist():
                raise ValueError('malformed_package')
            if mode == 'parse':
                if family == 'xlsx':
                    # Read native stored cells and cached values without calculating formulas.
                    shared = []
                    if 'xl/sharedStrings.xml' in archive.namelist():
                        shared = [''.join(item.itertext()) for item in xml(archive, 'xl/sharedStrings.xml')]
                    relationships = {item.attrib['Id']: item.attrib['Target'] for item in xml(archive, 'xl/_rels/workbook.xml.rels')}
                    workbook = xml(archive, required)
                    for sheet in workbook.findall('s:sheets/s:sheet', NS):
                        rel = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                        target = relationships.get(rel, '')
                        member = target.lstrip('/') if target.startswith('/') else 'xl/' + target
                        if member not in archive.namelist() or '..' in PurePosixPath(member).parts:
                            raise ValueError('malformed_package')
                        root = xml(archive, member)
                        for cell in root.findall('.//s:sheetData/s:row/s:c', NS):
                            address = cell.attrib.get('r', '')
                            if not re.fullmatch('[A-Z]{1,3}[1-9][0-9]{0,6}', address):
                                raise ValueError('invalid_native_locator')
                            value = cell.find('s:v', NS)
                            text = value.text or '' if value is not None else ''
                            if cell.attrib.get('t') == 's':
                                text = shared[int(text)]
                            elif cell.attrib.get('t') == 'inlineStr':
                                text = ''.join(item.text or '' for item in cell.findall('.//s:t', NS))
                            formula = cell.find('s:f', NS)
                            if formula is not None:
                                limitations.append('formula_cache_not_recalculated')
                                text = f'Formula: {formula.text}; cached value: {text or "unavailable"}'
                            add({'kind': 'cell', 'sheet': sheet.attrib['name'], 'cell': address, 'sheet_state': sheet.attrib.get('state', 'visible')}, text)
                    limitations += ['styles_charts_and_images_not_interpreted', 'number_formats_preserved_in_original_only']
                elif family == 'docx':
                    for index, paragraph in enumerate(xml(archive, required).findall('.//w:p', NS), 1):
                        text = ''.join(item.text or '' for item in paragraph.findall('.//w:t', NS))
                        add({'kind': 'paragraph', 'part': required, 'paragraph': index}, text)
                    limitations += ['headers_footers_images_and_tracked_changes_not_interpreted', 'paragraph_locator_is_not_a_rendered_page']
                else:
                    for member in sorted(archive.namelist()):
                        match = re.fullmatch(r'ppt/slides/slide([1-9][0-9]*)\.xml', member)
                        if not match:
                            continue
                        for index, paragraph in enumerate(xml(archive, member).findall('.//a:p', NS), 1):
                            add({'kind': 'slide_paragraph', 'part': member, 'slide': int(match.group(1)), 'paragraph': index}, ''.join(item.text or '' for item in paragraph.findall('.//a:t', NS)))
                    limitations += ['charts_images_notes_and_layout_not_interpreted']
    elif family == 'pdf':
        import pymupdf
        with pymupdf.open(path) as document:
            if document.needs_pass:
                raise ValueError('protected_file_not_supported')
            for xref in range(1, document.xref_length()):
                if re.search(r'/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction)\b', document.xref_object(xref)):
                    raise ValueError('executable_content')
            if mode == 'parse':
                for index, page in enumerate(document, 1):
                    blocks = page.get_text('blocks')
                    for block in blocks:
                        if block[6] == 0:
                            add({'kind': 'page_block', 'page': index, 'block': block[5], 'bbox': list(block[:4])}, block[4])
                    if not blocks:
                        limitations.append(f'page_{index}_has_no_native_text')
                limitations += ['native_text_only_no_ocr', 'visual_table_and_image_meaning_not_interpreted']
    elif family == 'csv':
        text = path.read_bytes().decode('utf-8-sig', errors='strict')
        if '\0' in text:
            raise ValueError('malformed_package')
        if mode == 'parse':
            reader = csv.reader(io.StringIO(text), strict=True)
            width = None
            for index, row in enumerate(reader, 1):
                if width is None:
                    width = len(row)
                if len(row) != width:
                    limitations.append('irregular_row_width')
                for column, value in enumerate(row, 1):
                    if value.startswith(('=', '+', '-', '@')):
                        limitations.append('cell_text_not_executed')
                    add({'kind': 'csv_cell', 'row': index, 'column': column}, value)
    else:
        raise ValueError('unsupported_media_type')
    coverage = 'native_text_partial' if family != 'csv' or limitations else 'complete'
    for fragment in fragments:
        fragment['coverage_code'] = coverage
    return {'clean': True, 'code': None, 'family': family, 'limitations': sorted(set(limitations)), 'parser_identity': 'native-source-v1', 'coverage_code': coverage, 'substantive_parsing': mode == 'parse', 'fragments': fragments, 'original_sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'scan': {'engine': 'ClamAV', 'signature_updated_at': max(p.stat().st_mtime for p in signatures)}}

if __name__ == '__main__':
    request = json.loads(Path('/input/input.json').read_text())
    try:
        if request['mode'] not in ('scan', 'parse'):
            raise ValueError('unsupported_operation')
        report = inspect(Path('/input/source.bin'), request['family'], request['mode'])
    except (ValueError, OSError, zipfile.BadZipFile, ET.ParseError, KeyError, IndexError, csv.Error, subprocess.TimeoutExpired):
        # Source text, filenames and parser diagnostics never enter operational logs.
        report = {'clean': False, 'code': 'source_processing_failed', 'fragments': [], 'limitations': ['safety_or_parser_check_failed']}
    Path('/output/source-report.json').write_text(json.dumps(report))
