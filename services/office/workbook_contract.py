"""Input and identity contract shared by the two declared workbook engines."""
import hashlib
import json
from decimal import Decimal

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

