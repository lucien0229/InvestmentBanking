"""Independent file observers: openpyxl + PDF parser; never regenerates the input."""
import hashlib
import json
import re
from decimal import Decimal
from pathlib import Path
import sys
import zipfile
import openpyxl
import aspose.cells as cells
import pymupdf

SHEETS = ['Overview', 'Inputs', 'Assumptions', 'Valuation', 'Scenarios', 'Lineage', 'Banker Notes']
KEYS = [('enterprise_value', 'EV'), ('cash', 'Cash'), ('debt', 'Debt')]


def inspect(data, native, reader):
    checks = []
    observations = {}
    def record(code, passed, detail, locator=None):
        checks.append({'code': code, 'outcome': 'passed' if passed else 'failed', 'detail': detail, 'locator': locator or {}})
    try:
        if native.stat().st_size > 100*1024*1024:
            raise ValueError('native_byte_limit')
        with zipfile.ZipFile(native) as archive:
            if len(archive.infolist()) > 2000 or sum(x.file_size for x in archive.infolist()) > 160*1024*1024:
                raise ValueError('native_expansion_limit')
            unsupported = [n for n in archive.namelist() if any(x in n for x in ['vbaProject', 'externalLinks/', 'embeddings/', 'connections.xml'])]
            if unsupported:
                raise ValueError('unsupported_active_content')
        workbook = openpyxl.load_workbook(native, data_only=False, keep_links=False)
        cached = openpyxl.load_workbook(native, data_only=True, keep_links=False)
        props = {p.name: p.value for p in workbook.custom_doc_props}
        structure = all(name in workbook.sheetnames for name in SHEETS) and props.get('revision_id') == data['revision_id']
        structure &= len(workbook['Scenarios']._charts) == 1 and workbook.calculation.calcMode in (None, 'auto')
        cache_pass, lineage_pass = True, True
        for index, run in enumerate(data['calculations'], 1):
            row = index+7
            expected_formula = f'=EV_{index}+Cash_{index}-Debt_{index}'
            structure &= workbook['Valuation'][f'E{row}'].value == expected_formula
            expected = Decimal(next(m['value'] for m in run['measures'] if m['key']=='enterprise_value')) + Decimal(next(m['value'] for m in run['measures'] if m['key']=='cash')) - Decimal(next(m['value'] for m in run['measures'] if m['key']=='debt'))
            cache_pass &= Decimal(str(cached['Valuation'][f'E{row}'].value)) == expected and Decimal(str(cached['Valuation'][f'G{row}'].value)) == 0
            cache_pass &= Decimal(str(cached['Scenarios'][f'B{row}'].value)) == expected
            for key, name in KEYS:
                measure = next(m for m in run['measures'] if m['key']==key)
                defined = workbook.defined_names.get(f'{name}_{index}')
                if defined is None:
                    structure = False
                    continue
                destinations = list(defined.destinations)
                if len(destinations) != 1 or destinations[0][0] not in ['Inputs','Assumptions']:
                    structure = False
                    continue
                sheet, cell = destinations[0]
                input_cell = workbook[sheet][cell]
                locator = json.dumps(measure['locator'], sort_keys=True)
                lineage_pass &= input_cell.comment is not None and locator in input_cell.comment.text and measure['decision_id'] in input_cell.comment.text
                lineage_pass &= workbook[sheet].cell(input_cell.row, 7).value == locator
                lineage_pass &= Decimal(str(input_cell.value)) == Decimal(measure['value'])
                structure &= sheet == ('Assumptions' if measure['assumption_id'] else 'Inputs')
        license_path=Path('/run/secrets/aspose-license')
        if license_path.is_file():
            cells.License().set_license(str(license_path))
        recalculated=cells.Workbook(str(native))
        recalculated.calculate_formula()
        for index,run in enumerate(data['calculations'],8):
            cache_pass &= Decimal(str(recalculated.worksheets.get('Valuation').cells.get(f'E{index}').double_value)) == Decimal(str(cached['Valuation'][f'E{index}'].value))
        record('native_structure', bool(structure), 'Native formula, defined-name, chart, revision and calculation-mode checks')
        record('recalculation', bool(cache_pass), 'Exact stored Native reopened and recalculated by Aspose; independent decimals compared with stored caches and chart data')
        record('lineage', bool(lineage_pass), 'Input authority, source locator and exact native cell checked independently')
    except Exception as error:
        record('native_structure', False, f'Native Artifact inspection failed: {type(error).__name__}')
        record('recalculation', False, 'Cannot verify stored caches on an invalid Native Artifact')
        record('lineage', False, 'Cannot verify lineage on an invalid Native Artifact')
    try:
        pdf = pymupdf.open(reader)
        text = '\n'.join(p.get_text() for p in pdf)
        clean = 'evaluation' not in text.lower() and 'aspose' not in text.lower().replace('aspose.cells python via .net 26.8.0', '')
        record('clean_copy', clean, 'Reader Copy checked for evaluation marks and clean output')
        pages = [(page, page.get_text()) for page in pdf]
        sheet_pages = {sheet: [(page, content) for page, content in pages if f'DEAL CONTROL / {sheet.upper()}' in content] for sheet in SHEETS}
        order = []
        for _, content in pages:
            for sheet in SHEETS:
                if f'DEAL CONTROL / {sheet.upper()}' in content and (not order or order[-1] != sheet):
                    order.append(sheet)
        observations['sheet_order_matches'] = order == SHEETS
        valuation_text = '\n'.join(content for _, content in sheet_pages['Valuation'])
        valuation_numbers = {Decimal(token.replace(',', '')) for token in re.findall(r'(?<![\w.])-?\d[\d,]*(?:\.\d+)?(?![\w.])', valuation_text)}
        values_match = bool(valuation_text)
        for run in data['calculations']:
            values_match &= run['scenario'] in valuation_text
            values_match &= all(Decimal(m['value']) in valuation_numbers for m in run['measures'])
            values_match &= Decimal(run['expected_equity_value']) in valuation_numbers
            values_match &= run['measures'][0]['unit'] in valuation_text and run['measures'][0]['period'] in valuation_text
        observations['valuation_values_match'] = bool(values_match)
        normalized_lineage = re.sub(r'\s+', '', '\n'.join(content for _, content in sheet_pages['Lineage']))
        citations_match = all(m['decision_id'] in normalized_lineage and (not m.get('source_record_id') or m['source_record_id'] in normalized_lineage) for run in data['calculations'] for m in run['measures'])
        observations['decision_and_source_citations_match'] = citations_match
        chart_pages = sheet_pages['Scenarios']
        observations['chart_region_present'] = any('Equity value by controlled scenario' in content and len(page.get_drawings()) > 0 for page, content in chart_pages)
        parity = all(observations.values()) and data['revision_id'] in text and data['confidentiality'].upper() in text
        parity &= data['purpose'] in text and data['audience'] in text
        fonts = [f for page in pdf for f in page.get_fonts(full=True)]
        embedded = bool(fonts) and all(bool(pdf.extract_font(font[0])[3]) for font in fonts)
        safe = not pdf.is_form_pdf and pdf.embfile_count() == 0 and all('JavaScript' not in pdf.xref_object(i) and '/Launch' not in pdf.xref_object(i) for i in range(1,pdf.xref_length()))
        observations['fonts_embedded'] = embedded
        observations['safe_pdf_17'] = safe and pdf.metadata.get('format') == 'PDF 1.7'
        record('native_reader_parity', bool(parity and all(observations.values())), 'Sheet order/content, revision, numbers, confidentiality, embedded fonts and PDF active content checked; visual review remains explicit')
    except Exception as error:
        record('native_reader_parity', False, f'Reader Copy inspection failed: {type(error).__name__}')
    unknown = any(m['actual_forecast']=='unknown' for r in data['calculations'] for m in r['measures'])
    checks.append({'code':'controlled_inputs','outcome':'missing' if unknown else 'passed','detail':'Actual/forecast classification incomplete' if unknown else 'Exact controlled inputs and explicit assumptions are pinned'})
    return {'schema_version':'1.0.0','revision_id':data['revision_id'],'native_sha256':hashlib.sha256(native.read_bytes()).hexdigest(),
            'reader_sha256':hashlib.sha256(reader.read_bytes()).hexdigest(),'checks':checks,'observations':observations}


if __name__ == '__main__':
    result = inspect(json.loads(Path(sys.argv[1]).read_text()), Path(sys.argv[2]), Path(sys.argv[3]))
    Path(sys.argv[4]).write_text(json.dumps(result, indent=2))
