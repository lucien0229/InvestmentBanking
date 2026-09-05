-- Exact decimal text is permitted; [.] avoids dependence on SQL backslash modes.
ALTER TABLE analysis.calculation_input_measure DROP CONSTRAINT calculation_input_measure_value_text_check;
ALTER TABLE analysis.calculation_input_measure ADD CONSTRAINT calculation_input_measure_value_text_check CHECK(value_text ~ '^-?(0|[1-9][0-9]*)([.][0-9]+)?$');
