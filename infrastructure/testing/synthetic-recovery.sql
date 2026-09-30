-- Disposable fixture only. Marker strings are deliberately not valid credentials.
insert into users(id, webauthn_user_id, name) values
('00000000-0000-4000-8000-000000000001', 'synthetic-handle-one', 'Synthetic account one'),
('00000000-0000-4000-8000-000000000002', 'synthetic-handle-two', 'Synthetic account two');
insert into sessions(id, user_id) values
('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001');
insert into passkeys(id,user_id,public_key,counter,transports) values
('synthetic-noncredential', '00000000-0000-4000-8000-000000000001', decode('0102030405','hex'), 9007199254740993, array['internal']);
insert into recovery_codes(code_hash,user_id) values
(repeat('a',64), '00000000-0000-4000-8000-000000000001');
insert into entities(id,user_id,kind,name) values
('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','person','Synthetic entity one'),
('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','person','Synthetic entity two');
insert into hmrc_connections(entity_id,hmrc_env,access_token_enc,refresh_token_enc,expires_at,scope,rail) values
('00000000-0000-4000-8000-000000000004','sandbox','synthetic-not-a-token','synthetic-not-a-token','2030-01-01T00:00:00Z','read:vat','vat'),
('00000000-0000-4000-8000-000000000004','sandbox','synthetic-not-a-token','synthetic-not-a-token','2030-01-01T00:00:00Z','read:self-assessment','itsa');
insert into submissions(entity_id,period_key,hmrc_env,payload,receipt,correlation_id) values
('00000000-0000-4000-8000-000000000004','synthetic-period','sandbox','{"synthetic":true,"amountPence":12345}','{"synthetic":true,"accepted":true}','synthetic-correlation');
insert into itsa_receipts(entity_id,tax_year,quarter_index,period_end,business_id,type_of_business,superseded_count,payload_summary) values
('00000000-0000-4000-8000-000000000004','2026-27',1,'2026-07-05','synthetic-business','self-employment',2,'{"synthetic":true,"turnoverPence":67890}');
insert into api_workspaces(id,name) values ('00000000-0000-4000-8000-000000000006','Synthetic workspace');
insert into api_keys(workspace_id,name,mode,key_hash,key_prefix,scopes) values
('00000000-0000-4000-8000-000000000006','Synthetic non-key','test',repeat('b',64),'synthetic',array['synthetic:read']);
insert into accounting_authorisations(id,user_id,provider,provider_environment,provider_subject_id,status,granted_scopes) values
('00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000001','quickbooks','sandbox','synthetic-subject','active',array['synthetic:read']);
insert into accounting_provider_token_sets(authorisation_id,provider,provider_environment,access_token_ciphertext,refresh_token_ciphertext,key_version,access_expires_at,refresh_expires_at,token_generation) values
('00000000-0000-4000-8000-000000000007','quickbooks','sandbox','atsv1.synthetic_not_a_token','atsv1.synthetic_not_a_token',1,'2030-01-01T00:00:00Z','2030-02-01T00:00:00Z',9007199254740993);
insert into accounting_source_connections(id,user_id,authorisation_id,entity_id,provider_organisation_id,organisation_name,country_code,base_currency,provider,provider_environment,dirty_generation) values
('00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000004','synthetic-organisation','Synthetic organisation','GB','GBP','quickbooks','sandbox',9007199254740993);
insert into accounting_sync_replicas(id,user_id,source_connection_id,device_id,local_replica_id,next_fence) values
('00000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000011',9007199254740993);
insert into accounting_sync_runs(id,source_connection_id,replica_id,dataset,kind,status,fence,lease_expires_at,staged_cursor,staged_coverage_marker,next_sequence,acknowledged_page_count,acknowledged_record_count,started_dirty_generation,completed_at) values
('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000009','synthetic-dataset','initial','completed',9007199254740993,'2030-01-01T00:00:00Z','synthetic-cursor','synthetic-coverage',1,1,3,9007199254740993,now());
insert into accounting_page_manifests(id,run_id,dataset,sequence,fence,page_digest,record_count,next_cursor,is_final,coverage_marker,expires_at,acknowledged_at) values
('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000012','synthetic-dataset',0,9007199254740993,'sha256:'||repeat('c',64),3,'synthetic-cursor',true,'synthetic-coverage','2030-01-01T00:00:00Z',now());
insert into accounting_dataset_checkpoints(replica_id,dataset,completed_run_id,committed_cursor,committed_coverage_marker,committed_dirty_generation,page_count,record_count,completed_at) values
('00000000-0000-4000-8000-000000000009','synthetic-dataset','00000000-0000-4000-8000-000000000012','synthetic-cursor','synthetic-coverage',9007199254740993,1,3,now());
