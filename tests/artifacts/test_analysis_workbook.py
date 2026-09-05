"""Independent observers of the renderer's public file interface."""
import json
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


class AnalysisWorkbookFiles(unittest.TestCase):
    def test_delivered_native_preserves_formula_and_recalculated_value(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, str(ROOT / 'services/office/analysis_workbook.py'),
                                     str(ROOT / 'tests/fixtures/analysis-workbook.json'), directory],
                                    capture_output=True, text=True, timeout=90)
            self.assertEqual(result.returncode, 0, result.stderr)
            native = Path(directory) / 'analysis-valuation.xlsx'
            workbook = openpyxl.load_workbook(native, data_only=False)
            cached = openpyxl.load_workbook(native, data_only=True)
            self.assertEqual(workbook['Valuation']['E8'].value, '=EV_1+Cash_1-Debt_1')
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
            for mutation,expected in [('flattened','native_structure'),('wrong_cache','recalculation'),('wrong_locator','lineage')]:
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
                            output.writestr(entry,content)
                    self.assertEqual(inspect_file(changed)[expected],'failed')
            baseline_observations=json.loads((Path(directory)/'observed.json').read_text())['observations']
            self.assertTrue(baseline_observations['sheet_order_matches'])
            self.assertTrue(baseline_observations['valuation_values_match'])
            self.assertTrue(baseline_observations['decision_and_source_citations_match'])
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



if __name__ == '__main__':
    unittest.main()
