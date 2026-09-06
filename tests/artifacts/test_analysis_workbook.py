"""Independent observers of the renderer's public file interface."""
import json
import os
import copy
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from decimal import Decimal
import openpyxl
import pymupdf
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
RENDERER = 'libreoffice_workbook.py' if os.environ.get('OFFICE_ENGINE')=='libreoffice' else 'analysis_workbook.py'


class AnalysisWorkbookFiles(unittest.TestCase):
    def test_delivered_native_preserves_formula_and_recalculated_value(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, str(ROOT / 'services/office' / RENDERER),
                                     str(ROOT / 'tests/fixtures/analysis-workbook.json'), directory],
                                    capture_output=True, text=True, timeout=90)
            self.assertEqual(result.returncode, 0, result.stderr)
            native = Path(directory) / 'analysis-valuation.xlsx'
            workbook = openpyxl.load_workbook(native, data_only=False)
            cached = openpyxl.load_workbook(native, data_only=True)
            self.assertEqual(workbook['Valuation']['E8'].value, '=ROUND(EV_1+Cash_1-Debt_1,1)')
            self.assertEqual(Decimal(str(cached['Valuation']['E8'].value)), Decimal('94.7'))
            self.assertEqual(Decimal(str(cached['Valuation']['G8'].value)), Decimal('0'))
            self.assertEqual(workbook['Banker Notes']['B8'].value, 'Banker-owned notes; retained on supported save/reopen paths.')
            self.assertTrue({'EV_1', 'Cash_1', 'Debt_1'}.issubset(workbook.defined_names))
            self.assertEqual(len(workbook['Scenarios']._charts), 1)
            self.assertGreater(len(workbook['Lineage']['A8'].value), 0)
            self.assertTrue((Path(directory) / 'analysis-valuation.pdf').is_file())
            report = json.loads((Path(directory) / 'render-report.json').read_text())
            self.assertEqual(report['revision_id'], '33333333-3333-4333-8333-333333333333')
            self.assertEqual(report['recalculation']['outcome'], 'passed')
            def inspect_file(path, reader=None):
                destination=Path(directory)/'observed.json'
                result=subprocess.run([sys.executable,str(ROOT/'services/office/inspect_workbook.py'),str(ROOT/'tests/fixtures/analysis-workbook.json'),str(path),str(reader or Path(directory)/'analysis-valuation.pdf'),str(destination)],capture_output=True,text=True,timeout=90)
                self.assertEqual(result.returncode,0,result.stderr)
                return {c['code']:c['outcome'] for c in json.loads(destination.read_text())['checks']}
            baseline=inspect_file(native)
            for code in ['native_structure','recalculation','lineage']:
                self.assertEqual(baseline[code],'passed',baseline)
            # A new synthetic document exercises the clean-copy text classifier;
            # this is not a licensed render or removal of a vendor watermark.
            ordinary=Path(directory)/'ordinary-business-text.pdf'
            document=pymupdf.open();page=document.new_page()
            page.insert_text((40,40),'Evaluation time: 2026-09-05. Aspose.Cells Python via .NET 26.8.0')
            document.save(ordinary);document.close()
            self.assertEqual(inspect_file(native,ordinary)['clean_copy'],'passed')
            self.assertEqual(baseline['clean_copy'],'passed' if os.environ.get('OFFICE_ENGINE')=='libreoffice' else 'failed')
            for mutation,expected in [('flattened','native_structure'),('wrong_cache','recalculation'),('wrong_locator','lineage'),('wrong_chart_series','native_structure')]:
                with self.subTest(mutation=mutation):
                    changed=Path(directory)/f'{mutation}.xlsx'
                    with zipfile.ZipFile(native) as source,zipfile.ZipFile(changed,'w') as output:
                        for entry in source.infolist():
                            content=source.read(entry.filename)
                            if entry.filename=='xl/worksheets/sheet4.xml' and mutation in ['flattened','wrong_cache']:
                                document=ET.fromstring(content);ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                                cell=document.find('.//s:c[@r="E8"]',ns)
                                if mutation=='flattened':
                                    cell.remove(cell.find('s:f',ns))
                                else:
                                    cell.find('s:v',ns).text='999.7'
                                content=ET.tostring(document)
                            if mutation=='wrong_locator' and 'comments' in entry.filename.lower():
                                content=content.replace(b'Balance Sheet',b'Wrong Locator')
                            if mutation=='wrong_chart_series' and entry.filename.startswith('xl/charts/chart'):
                                content=content.replace(b'Scenarios!$B$',b'Scenarios!$C$')
                            output.writestr(entry,content)
                    self.assertEqual(inspect_file(changed)[expected],'failed')
            baseline_observations=json.loads((Path(directory)/'observed.json').read_text())['observations']
            self.assertTrue(baseline_observations['sheet_order_matches'])
            self.assertTrue(baseline_observations['valuation_values_match'])
            self.assertTrue(baseline_observations['decision_and_source_citations_match'])
            self.assertTrue(baseline_observations['chart_region_present'])
            swapped=Path(directory)/'swapped-columns.pdf';pdf=pymupdf.open(Path(directory)/'analysis-valuation.pdf')
            for page in pdf:
                if 'DEAL CONTROL / VALUATION' in page.get_text():
                    targets=[(page.search_for('4.7')[0],'10.0'),(page.search_for('10.0')[0],'4.7')]
                    for rect,value in targets:page.add_redact_annot(rect)
                    page.apply_redactions()
                    for rect,value in targets:page.insert_text((rect.x0,rect.y1-2),value,fontsize=9)
            pdf.save(swapped);pdf.close()
            self.assertEqual(inspect_file(native,swapped)['native_reader_parity'],'failed')
            self.assertFalse(json.loads((Path(directory)/'observed.json').read_text())['observations']['valuation_values_match'])
            missing_bar=Path(directory)/'missing-chart-bar.pdf';pdf=pymupdf.open(Path(directory)/'analysis-valuation.pdf')
            for page in pdf:
                if 'DEAL CONTROL / SCENARIOS' in page.get_text():
                    for drawing in page.get_drawings():
                        fill=drawing.get('fill');rect=drawing['rect']
                        if fill and abs(fill[0]-.267)<.01 and rect.width>20 and rect.height>10:page.add_redact_annot(rect)
                    page.apply_redactions(graphics=2)
            pdf.save(missing_bar);pdf.close()
            self.assertEqual(inspect_file(native,missing_bar)['native_reader_parity'],'failed')
            self.assertFalse(json.loads((Path(directory)/'observed.json').read_text())['observations']['chart_region_present'])
            reordered=Path(directory)/'reordered.pdf'
            pdf=pymupdf.open(Path(directory)/'analysis-valuation.pdf');pdf.select(list(reversed(range(len(pdf)))));pdf.save(reordered);pdf.close()
            self.assertEqual(inspect_file(native,reordered)['native_reader_parity'],'failed')
            self.assertFalse(json.loads((Path(directory)/'observed.json').read_text())['observations']['sheet_order_matches'])
            mismatched=Path(directory)/'wrong-values.pdf';pdf=pymupdf.open(Path(directory)/'analysis-valuation.pdf')
            for page in pdf:
                if 'DEAL CONTROL / VALUATION' in page.get_text():
                    for rect in page.search_for('94.7'):page.add_redact_annot(rect)
                    page.apply_redactions()
            pdf.save(mismatched);pdf.close()
            self.assertEqual(inspect_file(native,mismatched)['native_reader_parity'],'failed')
            self.assertFalse(json.loads((Path(directory)/'observed.json').read_text())['observations']['valuation_values_match'])
            corrupt=Path(directory)/'corrupt.xlsx';corrupt.write_bytes(b'This is not an OOXML package')
            self.assertEqual(inspect_file(corrupt)['native_structure'],'failed')

    def test_multiple_scenarios_preserve_zero_and_negative_equity(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);data=json.loads((ROOT/'tests/fixtures/analysis-workbook.json').read_text())
            base=data['calculations'][0];data['calculations']=[]
            for scenario,debt in [('Base', '10.0'),('Zero','104.7'),('Downside','120.0')]:
                run=copy.deepcopy(base);run['scenario']=scenario
                next(m for m in run['measures'] if m['key']=='debt')['value']=debt
                run['expected_equity_value']=str(Decimal('104.7')-Decimal(debt));data['calculations'].append(run)
            fixture=root/'input.json';fixture.write_text(json.dumps(data))
            built=subprocess.run([sys.executable,str(ROOT/'services/office'/RENDERER),str(fixture),directory],capture_output=True,text=True,timeout=90)
            self.assertEqual(built.returncode,0,built.stderr)
            inspected=subprocess.run([sys.executable,str(ROOT/'services/office/inspect_workbook.py'),str(fixture),str(root/'analysis-valuation.xlsx'),str(root/'analysis-valuation.pdf'),str(root/'inspection.json')],capture_output=True,text=True,timeout=90)
            self.assertEqual(inspected.returncode,0,inspected.stderr)
            report=json.loads((root/'inspection.json').read_text())
            self.assertEqual(next(c['outcome'] for c in report['checks'] if c['code']=='recalculation'),'passed',report)
            self.assertTrue(report['observations']['valuation_values_match'],report)
            self.assertTrue(report['observations']['chart_region_present'],report)



if __name__ == '__main__':
    unittest.main()
