-- Provider failures are durable observations, separate from schema/domain rejection.
ALTER TABLE ai.run_validation DROP CONSTRAINT run_validation_stage_check;
ALTER TABLE ai.run_validation ADD CONSTRAINT run_validation_stage_check
 CHECK(stage IN ('schema','domain','locator','deterministic','permission','repair','provider'));
