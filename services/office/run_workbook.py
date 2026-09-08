import json
from pathlib import Path
import sys
import os
input_path, output = Path(sys.argv[1]), Path(sys.argv[2])
data = json.loads(input_path.read_text())
if data.get("template_version") == "auction-control-1.0.0":
    from auction_control_workbook import build
    from inspect_auction_workbook import inspect
    build(data, output)
    result = inspect(data, output/'auction-control.xlsx', output/'auction-control.pdf')
else:
    if os.environ.get("OFFICE_ENGINE") == "libreoffice":
        from libreoffice_workbook import build
    else:
        from analysis_workbook import build
    from inspect_workbook import inspect
    build(data, output)
    result = inspect(data, output/'analysis-valuation.xlsx', output/'analysis-valuation.pdf')
(output/'inspection-report.json').write_text(json.dumps(result, indent=2))
