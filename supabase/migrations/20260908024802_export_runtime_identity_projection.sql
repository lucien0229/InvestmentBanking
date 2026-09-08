-- Only the closed export commit guard can inspect this runtime identity.
CREATE POLICY export_runtime_identity ON app.runtime_principal FOR SELECT
 TO app_export_owner USING(principal_code='workbook_worker');
