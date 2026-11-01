
insert into profiles(id,name,network,owner,jurisdiction) values
 ('10000000-0000-0000-0000-000000000001','Kauri Outdoors NZ','Instagram','Mia','NZ'),
 ('10000000-0000-0000-0000-000000000002','Kauri Outdoors AU','LinkedIn','Leo','AU') on conflict do nothing;
insert into campaigns(id,name,owner,objective,due_date) values
 ('20000000-0000-0000-0000-000000000001','Summer trail kit','Mia','Explain the new trail pack and track visits',current_date+14),
 ('20000000-0000-0000-0000-000000000002','Dealer field notes','Leo','Share dealer stories',current_date+21) on conflict do nothing;
insert into posts(id,code,profile_id,campaign_id,title,body,owner,planned_at,published_at,permalink,state,advertising,disclosure_evidence,claim_evidence,rights_until,updated_at) values
 ('30000000-0000-0000-0000-000000000001','SOC-001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Trail pack launch','Our trail pack carries the weekend kit.','Mia',now()-interval '2 days',null,'','review',true,'','',current_date-1,now()),
 ('30000000-0000-0000-0000-000000000002','SOC-002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Trail pack checklist','Five things to check before a day walk.','Mia',now()-interval '12 days',now()-interval '12 days','https://example.invalid/posts/checklist','published',false,'','',null,now()),
 ('30000000-0000-0000-0000-000000000003','SOC-003','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Dealer visit draft','Notes from the winter dealer visit.','',now()+interval '2 days',null,'','draft',false,'','',null,now()-interval '10 days'),
 ('30000000-0000-0000-0000-000000000004','SOC-004','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Dealer repair guide','How our dealer workshop checks a strap.','Leo',now()-interval '20 days',now()-interval '20 days','https://example.invalid/posts/repair','published',false,'','',null,now()),
 ('30000000-0000-0000-0000-000000000005','SOC-005','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Trail pack care','Ad: wash with warm water.','Mia',now()+interval '3 days',null,'','approved',true,'Demo reviewer confirmed clear Ad label','Demo care-sheet version 2',current_date+90,now()) on conflict do nothing;
insert into approvals(id,post_id,revision,decision,actor,evidence) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000005',1,'approved','Demo approver','Demo signed care-sheet review') on conflict do nothing;
insert into metrics(post_id,as_of,impressions,engagements,clicks,source) values
 ('30000000-0000-0000-0000-000000000002',current_date-9,1000,50,15,'fictional demo'),
 ('30000000-0000-0000-0000-000000000002',current_date-1,1600,96,32,'fictional demo'),
 ('30000000-0000-0000-0000-000000000004',current_date-10,900,18,null,'fictional demo') on conflict do nothing;
