-- SELECT FOR SHARE requires UPDATE privilege on one column. No runtime write
-- grant or UPDATE policy is added to the authority tables.
GRANT UPDATE(id) ON app.deal,app.deal_workspace,app.account TO app_source_owner;
