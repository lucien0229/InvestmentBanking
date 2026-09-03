-- Provider request/response ciphertext is Deal-scoped protected data. The
-- runtime may read only the safe AI Run projection columns; the owner-only
-- completion/projection functions retain access to ciphertext.
REVOKE SELECT ON ai.run FROM app_runtime;
GRANT SELECT (
  id, account_id, deal_id, actor_id, job_id, job_scope_id, packet_version_id,
  work_objective_id, task_definition, task_definition_version, prompt_package_id,
  provider_profile_id, provenance_class, confidentiality_class,
  de_identification_posture, scope_digest, canonical_input_digest, request_digest,
  request_nonce, outcome_class, status_code, provider_request_id, model_code,
  usage, cost_minor_units, latency_ms, created_at, completed_at
) ON ai.run TO app_runtime;
