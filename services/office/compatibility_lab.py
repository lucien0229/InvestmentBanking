"""Exact-file development Calc smoke lab; does not mutate a delivered Revision."""
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET
import openpyxl
from calc_engine import document, save_xlsx
from workbook_contract import digest
from inspect_workbook import inspect


def chart_structure(chart):
    def normalize(tree):
        for parent in tree.iter():
            for child in list(parent):
                tag=child.tag.rsplit('}',1)[-1]
                # Calc allocates fresh relationship identifiers on every save.
                if tag in ('axId','crossAx'):parent.remove(child)
                # An explicit position for hidden labels has no visible effect.
                if tag=='dLblPos' and child.get('val')=='outEnd' and all(
                    item.get('val')=='0' for item in parent if item.tag.rsplit('}',1)[-1] in ('showVal','showCatName','showSerName','showPercent','showBubbleSize')):
                    parent.remove(child)
        return ET.tostring(tree,encoding='unicode')
    return [normalize(chart.to_tree()),normalize(chart.x_axis.to_tree()),normalize(chart.y_axis.to_tree())]


def protected_structure(path):
    book = openpyxl.load_workbook(path, data_only=False)
    return {
        'sheets': book.sheetnames,
        'formulas': {f'{s.title}!{c.coordinate}':c.value for s in book for row in s for c in row if c.data_type=='f'},
        'names': {name:item.attr_text for name,item in book.defined_names.items() if not name.startswith('_xlnm.')},
        'comments': {f'{s.title}!{c.coordinate}':c.comment.text for s in book for row in s for c in row if c.comment},
        'charts': {s.title:[chart_structure(chart) for chart in s._charts] for s in book},
        'banker_note':book['Banker Notes']['B8'].value,
    }


def run(data, native, reader, output):
    output.mkdir(parents=True, exist_ok=True)
    before = protected_structure(native)
    note = before.pop('banker_note') + '\nDevelopment acceptance: Banker note retained after save and reopen.'
    returned = output/'returned-workbook.xlsx'
    with document(native) as actual:
        actual.Sheets.getByName('Banker Notes').getCellRangeByName('B8').String=note
        save_xlsx(actual,returned)
    with document(returned) as reopened:
        note_retained = reopened.Sheets.getByName('Banker Notes').getCellRangeByName('B8').String==note
        values = [reopened.Sheets.getByName('Valuation').getCellRangeByName(f'E{row}').Value for row in range(8,8+len(data['calculations']))]
    after=protected_structure(returned)
    after_note=after.pop('banker_note')
    inspection=inspect(data,returned,reader)
    outcomes={c['code']:c['outcome']=='passed' for c in inspection['checks']}
    steps={'open':True,'edit_notes':note_retained and after_note==note,'save':returned.is_file(),'reopen':True,'reimport':all(outcomes.values()),
        'formulas':before['formulas']==after['formulas'],'names':before['names']==after['names'],
        'charts':before['charts']==after['charts'] and outcomes['native_structure'],
        'comments':before['comments']==after['comments'],'recalculation':outcomes['recalculation'],
        'sheet_order':before['sheets']==after['sheets'],'lineage':outcomes['lineage']}
    report={'schema_version':'1.0.0','revision_id':data['revision_id'],'acceptance_profile':'development_foss_v1',
        'platform':'linux','channel':'other','application':'LibreOffice Calc','build':subprocess.check_output(['libreoffice','--version'],text=True).strip(),
        'native_sha256':digest(native.read_bytes()),'reader_sha256':digest(reader.read_bytes()),'returned_sha256':digest(returned.read_bytes()),
        'steps':steps,'observed_values':values,'outcome':'passed' if all(steps.values()) else 'failed',
        'returned_file_inspection':inspection,'limitations':['Synthetic development smoke path only. No Windows Excel claim. Returned copy is not a new Deliverable Revision.']}
    (output/'office-lab-report.json').write_text(json.dumps(report,indent=2))
    if report['outcome']!='passed':raise RuntimeError('office_roundtrip_failed')
    return report


if __name__=='__main__':
    data=json.loads(Path(sys.argv[1]).read_text())
    run(data,Path(sys.argv[2]),Path(sys.argv[3]),Path(sys.argv[4]))
