"""Bounded XLSX/PDF renderer. No database, provider credentials, or network required."""
import hashlib
import json
import os
from pathlib import Path
import sys
from decimal import Decimal
import aspose.cells as cells
from aspose.cells.charts import ChartType
from aspose.pydrawing import Color
import openpyxl
import pymupdf
from aspose.cells.rendering import SheetRender, ImageOrPrintOptions
from aspose.cells.drawing import ImageType

ENGINE_VERSION = '26.8.0'
TEMPLATE_VERSION = 'analysis-valuation-1.0.0'
SHEETS = ['Overview', 'Inputs', 'Assumptions', 'Valuation', 'Scenarios', 'Lineage', 'Banker Notes']
KEYS = ['enterprise_value', 'cash', 'debt']
NAMES = ['EV', 'Cash', 'Debt']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def validate_input(data):
    if data.get('schema_version') != '1.0.0' or data.get('template_version') != TEMPLATE_VERSION:
        raise ValueError('unsupported_workbook_contract')
    if not 1 <= len(data.get('calculations', [])) <= 24:
        raise ValueError('calculation_scope_required')
    if len(json.dumps(data)) > 240000:
        raise ValueError('workbook_input_limit')
    for run in data['calculations']:
        if run.get('method') != 'ev_to_equity_tie_out':
            raise ValueError('unsupported_formula')
        measures = run['measures']
        if sorted(m['key'] for m in measures) != sorted(KEYS):
            raise ValueError('controlled_inputs_incomplete')
        if len({(m['period'], m['unit'], m['currency']) for m in measures}) != 1:
            raise ValueError('input_dimensions_mismatch')
        for measure in measures:
            number = Decimal(measure['value'])
            if not number.is_finite() or len(number.as_tuple().digits) > 15:
                raise ValueError('excel_precision_unsupported')
            if not (measure.get('fact_id') or measure.get('assumption_id')) or not measure.get('decision_id'):
                raise ValueError('controlled_input_authority_required')
            if measure.get('fact_id') and (not measure.get('source_record_id') or len(measure.get('source_digest') or '') != 64 or not measure.get('locator')):
                raise ValueError('source_locator_required')


def write_text(sheet, row, col, value):
    # put_value(text, False) keeps source-controlled strings from becoming formulas.
    sheet.cells.get(row, col).put_value('Not applicable' if value is None else str(value), False)


def row_values(sheet, row, values):
    for col, value in enumerate(values):
        write_text(sheet, row, col, value)


def color(value):
    return Color.from_argb(255, (value >> 16) & 255, (value >> 8) & 255, value & 255)


def section_style(workbook, background, ink, bold=False):
    style = workbook.create_style()
    style.font.name = 'DejaVu Sans'
    style.font.size = 10
    style.font.is_bold = bold
    style.font.color = color(ink)
    style.foreground_color = color(background)
    style.pattern = cells.BackgroundType.SOLID
    style.is_text_wrapped = True
    style.vertical_alignment = cells.TextAlignmentType.CENTER
    return style


def prepare_sheet(workbook, name, data):
    sheet = workbook.worksheets.get(name)
    sheet.is_gridlines_visible = False
    for col in range(8):
        sheet.cells.set_column_width(col, 18.0 if col > 0 else 26.0)
    sheet.cells.merge(0, 0, 1, 8)
    sheet.cells.merge(1, 0, 1, 8)
    sheet.cells.merge(2, 0, 1, 8)
    sheet.cells.merge(3, 0, 1, 8)
    sheet.cells.merge(4, 0, 1, 8)
    write_text(sheet, 0, 0, f'DEAL CONTROL / {name.upper()}')
    write_text(sheet, 1, 0, data['deal_name'])
    write_text(sheet, 2, 0, f"Revision {data['revision_id']}")
    write_text(sheet, 3, 0, f"{data['purpose']} | {data['audience']}")
    write_text(sheet, 4, 0, f"{data['confidentiality'].upper()} | {data['provenance'].upper()} | No external-use authorization")
    title_style = section_style(workbook, 0xFF18352C, 0xFFFFFFFF, True)
    title_style.font.size = 14
    sheet.cells.get(0, 0).set_style(title_style)
    sheet.cells.set_row_height(0, 30.0)
    for row in range(1, 5):
        sheet.cells.set_row_height(row, 23.0)
    sheet.freeze_panes(7, 1, 7, 1)
    setup = sheet.page_setup
    setup.orientation = cells.PageOrientationType.LANDSCAPE
    setup.paper_size = cells.PaperSizeType.PAPER_A3
    setup.fit_to_pages_wide = 1
    setup.fit_to_pages_tall = 0
    setup.top_margin = 0.4
    setup.bottom_margin = 0.4
    setup.left_margin = 0.3
    setup.right_margin = 0.3
    setup.print_title_rows = '$1:$7'
    setup.set_footer(0, f"{data['confidentiality'].upper()} / {data['provenance']}")
    setup.set_footer(1, f"Rev {data['revision_id']}")
    setup.set_footer(2, 'Page &P of &N')
    return sheet


def headers(workbook, sheet, labels):
    style = section_style(workbook, 0xFFE8EEEA, 0xFF18352C, True)
    row_values(sheet, 6, labels)
    for col in range(len(labels)):
        sheet.cells.get(6, col).set_style(style)
    sheet.cells.set_row_height(6, 28.0)


def build(data, output):
    validate_input(data)
    output.mkdir(parents=True, exist_ok=True)
    license_path = os.environ.get('ASPOSE_LICENSE_PATH', '/run/secrets/aspose-license')
    licensed = Path(license_path).is_file()
    if licensed:
        license = cells.License()
        license.set_license(license_path)
    workbook = cells.Workbook()
    workbook.worksheets.clear()
    for name in SHEETS:
        workbook.worksheets.add(name)
    workbook.settings.formula_settings.calculation_mode = cells.CalcModeType.AUTOMATIC
    for key in ['revision_id', 'deliverable_id', 'deal_id', 'template_version', 'evaluation_time']:
        workbook.custom_document_properties.add(key, data[key])
    workbook.custom_document_properties.add('build_input_sha256', digest(json.dumps(data, sort_keys=True).encode()))
    default = workbook.default_style
    default.font.name = 'DejaVu Sans'
    default.font.size = 10
    default.is_text_wrapped = True
    default.vertical_alignment = cells.TextAlignmentType.TOP
    workbook.default_style = default
    sheets = {name: prepare_sheet(workbook, name, data) for name in SHEETS}
    headers(workbook, sheets['Overview'], ['Control', 'Exact value'])
    controls = [('Purpose', data['purpose']), ('Audience', data['audience']), ('Calculation engine', f'Aspose.Cells Python via .NET {ENGINE_VERSION}'),
                ('Template', TEMPLATE_VERSION), ('Calculation mode', 'Automatic; recalculated on exact delivered bytes'),
                ('Evaluation time', data['evaluation_time']), ('Scope', 'Controlled EV-to-equity models and scenarios only'),
                ('Readiness', 'Inspect current Review/QC; generation never establishes readiness'),
                ('Office compatibility', 'Requires exact application/build evidence'),
                ('External use', 'Not authorized'), ('Limitations', ' | '.join(data['limitations']))]
    for row, (label, value) in enumerate(controls, 7):
        sheets['Overview'].cells.merge(row, 1, 1, 7)
        row_values(sheets['Overview'], row, [label, value])
        sheets['Overview'].cells.set_row_height(row, 30.0)
    input_headers = ['Definition', 'Value', 'Period', 'Unit / currency', 'Sign / precision', 'Actual / forecast', 'Source locator', 'Authority']
    for name in ['Inputs', 'Assumptions']:
        headers(workbook, sheets[name], input_headers)
    headers(workbook, sheets['Valuation'], ['Scenario', 'Enterprise value', 'Cash', 'Debt', 'Equity value', 'Expected equity', 'Tie-out difference', 'Units / period'])
    headers(workbook, sheets['Scenarios'], ['Scenario', 'Equity value', 'Run / exact model', 'Assumption scope'])
    headers(workbook, sheets['Lineage'], ['Native region', 'Source record', 'Representation', 'Source SHA-256', 'Source locator', 'Fact / assumption', 'Decision', 'Run / model / scenario'])
    headers(workbook, sheets['Banker Notes'], ['Ownership', 'Notes'])
    sheets['Banker Notes'].cells.merge(7, 1, 4, 7)
    row_values(sheets['Banker Notes'], 7, ['Banker-owned', 'Banker-owned notes; retained on supported save/reopen paths.'])
    sheets['Banker Notes'].comments.add(7, 1)
    sheets['Banker Notes'].comments.get(7, 1).note = 'Banker content must never be silently overwritten.'
    counters = {'Inputs': 7, 'Assumptions': 7, 'Lineage': 7}
    lineage = []
    for index, run in enumerate(data['calculations'], 1):
        valuation_row = index + 6
        source_basis = []
        for key, name in zip(KEYS, NAMES):
            measure = next(m for m in run['measures'] if m['key'] == key)
            sheet_name = 'Assumptions' if measure['assumption_id'] else 'Inputs'
            sheet = sheets[sheet_name]
            row = counters[sheet_name]
            counters[sheet_name] += 1
            locator = json.dumps(measure['locator'], sort_keys=True)
            authority = measure['fact_id'] or measure['assumption_id']
            row_values(sheet, row, [measure['definition'], '', measure['period'], f"{measure['unit']} / {measure['currency']}",
                                   f"{measure['sign']} / {measure['precision']}", measure['actual_forecast'], locator, authority])
            cell = sheet.cells.get(row, 1)
            cell.put_value(float(measure['value']))
            style = cell.get_style()
            style.custom = '0' + ('.' + '0' * measure['precision'] if measure['precision'] else '')
            style.font.color = color(0xFF196544 if measure['assumption_id'] else 0xFF2455A4)
            cell.set_style(style)
            sheet.cells.set_row_height(row, 52.0)
            defined_name = workbook.worksheets.names[workbook.worksheets.names.add(f'{name}_{index}')]
            defined_name.refers_to = f"='{sheet_name}'!$B${row + 1}"
            sheet.comments.add(row, 1)
            sheet.comments.get(row, 1).note = f"Source {measure['source_record_id']} | {locator} | Decision {measure['decision_id']}"
            relation = {**measure, 'native_sheet': sheet_name, 'native_range': f'B{row+1}', 'output_sheet': 'Valuation',
                        'output_range': f'B{valuation_row+1}:G{valuation_row+1}', 'revision_id': data['revision_id'],
                        'run_id': run['run_id'], 'calculation_version_id': run['calculation_version_id'],
                        'model_version_id': run['model_version_id'], 'scenario_version_id': run['scenario_version_id']}
            lineage.append(relation)
            source_basis.append(measure['source_record_id'])
            line_row = counters['Lineage']
            counters['Lineage'] += 1
            row_values(sheets['Lineage'], line_row, [f"{sheet_name}!B{row+1} -> Valuation!B{valuation_row+1}:G{valuation_row+1}",
                measure['source_record_id'], measure['representation_id'], measure['source_digest'], locator,
                authority, measure['decision_id'], f"{run['run_id']} / {run['model_version_id']} / {run['scenario_version_id']}"])
            sheets['Lineage'].cells.set_row_height(line_row, 160.0)
        sheet = sheets['Valuation']
        write_text(sheet, valuation_row, 0, run['scenario'])
        precision = max(measure['precision'] for measure in run['measures'])
        for col, formula in enumerate([f'=EV_{index}', f'=Cash_{index}', f'=Debt_{index}', f'=ROUND(EV_{index}+Cash_{index}-Debt_{index},{precision})'], 1):
            sheet.cells.get(valuation_row, col).formula = formula
        sheet.cells.get(valuation_row, 5).put_value(float(run['expected_equity_value']))
        sheet.cells.get(valuation_row, 6).formula = f'=ROUND(E{valuation_row+1}-F{valuation_row+1},{precision})'
        write_text(sheet, valuation_row, 7, f"{run['measures'][0]['unit']} / {run['measures'][0]['period']}")
        for col in range(1, 7):
            style = sheet.cells.get(valuation_row, col).get_style()
            style.custom = '0.0#########'
            sheet.cells.get(valuation_row, col).set_style(style)
        sheet.cells.set_row_height(valuation_row, 44.0)
        row_values(sheets['Scenarios'], valuation_row, [run['scenario'], '', f"{run['run_id']} / {run['model_version_id']}",
            'Assumptions remain assumptions; scenario is not a prediction.'])
        sheets['Scenarios'].cells.get(valuation_row, 1).formula = f'=Valuation!E{valuation_row+1}'
        sheets['Scenarios'].cells.set_row_height(valuation_row, 44.0)
    chart_index = sheets['Scenarios'].charts.add(ChartType.COLUMN, len(data['calculations']) + 9, 0, len(data['calculations']) + 25, 7)
    chart = sheets['Scenarios'].charts[chart_index]
    chart.title.text = 'Equity value by controlled scenario'
    chart.n_series.add(f"Scenarios!B8:B{7+len(data['calculations'])}", True)
    chart.n_series.category_data = f"Scenarios!A8:A{7+len(data['calculations'])}"
    chart.n_series[0].name = data['calculations'][0]['measures'][0]['unit']
    for name, sheet in sheets.items():
        last = max(18, sheet.cells.max_data_row + 1)
        if name == 'Scenarios':
            last = len(data['calculations']) + 27
        sheet.page_setup.print_area = f'A1:H{last}'
    workbook.calculate_formula()
    native = output / 'analysis-valuation.xlsx'
    workbook.save(str(native), cells.SaveFormat.XLSX)
    # Reopen the exact delivered bytes; render from their stored calculation state.
    reopened = cells.Workbook(str(native))
    pdf_options = cells.PdfSaveOptions()
    pdf_options.compliance = cells.rendering.PdfCompliance.PDF17
    reopened.save(str(output / 'analysis-valuation.pdf'), pdf_options)
    native_pages = []
    options = ImageOrPrintOptions()
    options.image_type = ImageType.PNG
    options.horizontal_resolution = 110
    options.vertical_resolution = 110
    for name in SHEETS:
        rendered = SheetRender(reopened.worksheets.get(name), options)
        for index in range(rendered.page_count):
            filename = f'native-page-{len(native_pages)+1}.png'
            rendered.to_image(index, str(output / filename))
            native_pages.append({'sheet': name, 'page': index+1, 'image': filename})
    observed = openpyxl.load_workbook(native, data_only=True)
    checks = []
    for index, run in enumerate(data['calculations'], 8):
        expected = Decimal(next(m['value'] for m in run['measures'] if m['key']=='enterprise_value')) + Decimal(next(m['value'] for m in run['measures'] if m['key']=='cash')) - Decimal(next(m['value'] for m in run['measures'] if m['key']=='debt'))
        actual = Decimal(str(observed['Valuation'][f'E{index}'].value))
        difference = Decimal(str(observed['Valuation'][f'G{index}'].value))
        checks.append({'locator': f'Valuation!E{index}:G{index}', 'expected': str(expected), 'observed': str(actual), 'difference': str(difference), 'passed': actual == expected and difference == 0})
    pdf = pymupdf.open(output / 'analysis-valuation.pdf')
    pages = []
    for index, page in enumerate(pdf):
        filename = f'reader-page-{index+1}.png'
        page.get_pixmap(matrix=pymupdf.Matrix(1.2,1.2)).save(output / filename)
        pages.append({'page': index+1, 'image': filename, 'text': page.get_text(), 'width': page.rect.width, 'height': page.rect.height})
    for relation in lineage:
        relation['reader_pages'] = [p['page'] for p in pages if f"DEAL CONTROL / {relation['native_sheet'].upper()}" in p['text'] or 'DEAL CONTROL / VALUATION' in p['text'] or 'DEAL CONTROL / SCENARIOS' in p['text'] or 'DEAL CONTROL / LINEAGE' in p['text']]
    formulas = openpyxl.load_workbook(native, data_only=False)
    cell_inventory = [{'sheet': sheet.title, 'cells': [{'cell': cell.coordinate, 'formula': cell.value if cell.data_type == 'f' else None,
        'value': observed[sheet.title][cell.coordinate].value, 'number_format': cell.number_format, 'comment': cell.comment.text if cell.comment else None}
        for row in sheet for cell in row if cell.value is not None]} for sheet in formulas if sheet.title in SHEETS]
    report = {'schema_version': '1.0.0', 'revision_id': data['revision_id'], 'engine': 'aspose.cells.python.net',
              'engine_version': ENGINE_VERSION, 'template_version': TEMPLATE_VERSION, 'licensed': licensed,
              'font': 'DejaVu Sans', 'font_manifest': [{'file':p.name,'sha256':digest(p.read_bytes())} for p in sorted(Path('/usr/share/fonts/truetype/dejavu').glob('*.ttf'))], 'calculation_mode': 'automatic', 'evaluation_time': data['evaluation_time'],
              'recalculation': {'outcome': 'passed' if all(x['passed'] for x in checks) else 'failed', 'checks': checks},
              'files': [{'path': name, 'sha256': digest((output/name).read_bytes()), 'bytes': (output/name).stat().st_size}
                        for name in ['analysis-valuation.xlsx','analysis-valuation.pdf']],
              'pages': pages, 'native_pages': native_pages, 'cells': cell_inventory, 'lineage': lineage,
              'limitations': [] if licensed else ['Aspose evaluation output; license required for clean-copy acceptance.']}
    (output / 'render-report.json').write_text(json.dumps(report, indent=2))
    return report


if __name__ == '__main__':
    build(json.loads(Path(sys.argv[1]).read_text()), Path(sys.argv[2]))
