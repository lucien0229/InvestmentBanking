-- Workbook AI uses the same encrypted evidence recorder as online proposals.
-- The function still checks the live Account/Actor/Deal run scope; no table
-- read/write privilege is granted to the isolated worker.
GRANT EXECUTE ON FUNCTION ai.record_provider_request(uuid,text,bytea) TO job_worker;
