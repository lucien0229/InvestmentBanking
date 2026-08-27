INSERT INTO app.account(id, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Northstar Banker Account'),
  ('00000000-0000-0000-0000-000000000002', 'Other Banker Account')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO app.actor(id, email_digest, display_name, passkey_registered) VALUES
  ('00000000-0000-0000-0000-000000000011', encode(digest('banker-a@example.test','sha256'),'hex'), 'Northstar Banker', true),
  ('00000000-0000-0000-0000-000000000012', encode(digest('banker-b@example.test','sha256'),'hex'), 'Other Banker', true)
ON CONFLICT (id) DO UPDATE SET passkey_registered = EXCLUDED.passkey_registered;

INSERT INTO app.account_actor(account_id, actor_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012')
ON CONFLICT DO NOTHING;

INSERT INTO app.deal(id, account_id, name, client_label, transaction_subject, mandate_objective, business_stage)
VALUES
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000001', 'Project Northstar', 'Northstar Holdings', 'Northstar Software', 'Controlled sell-side auction execution', 'Preparation'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-0000-0000-000000000002', 'Other Deal', 'Other Holdings', 'Other Software', 'Independent deal workspace', 'Initiated')
ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id, name = EXCLUDED.name, business_stage = EXCLUDED.business_stage;

INSERT INTO app.deal_workspace(id, account_id, deal_id, overview_revision_id, displayed_state)
VALUES
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000001', '00000000-0000-4000-8000-000000000101', 'northstar-overview-r1', '{"stage":"Preparation","materiality":"synthetic_reference_fixture","source_posture":"rights_cleared_synthetic","next_controlled_action":"Inspect Evidence and Decisions"}'),
  ('00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000002', '00000000-0000-4000-8000-000000000202', 'other-overview-r1', '{"stage":"Initiated","materiality":"synthetic_isolation_fixture","source_posture":"not_visible","next_controlled_action":"Complete Deal Setup"}')
ON CONFLICT (deal_id) DO UPDATE SET displayed_state = EXCLUDED.displayed_state;
