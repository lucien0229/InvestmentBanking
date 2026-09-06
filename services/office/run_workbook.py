import json
from pathlib import Path
import sys
import os
if os.environ.get("OFFICE_ENGINE") == "libreoffice":
    from libreoffice_workbook import build
else:
    from analysis_workbook import build
from inspect_workbook import inspect

input_path, output = Path(sys.argv[1]), Path(sys.argv[2])
data = json.loads(input_path.read_text())
build(data, output)
result = inspect(data, output/'analysis-valuation.xlsx', output/'analysis-valuation.pdf')
(output/'inspection-report.json').write_text(json.dumps(result, indent=2))
