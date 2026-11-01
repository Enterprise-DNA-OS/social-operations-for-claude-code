#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {page,table as htmlTable,writeOut} from './lib/render.mjs';

export const reads={
 profiles:'select id,name,network,owner,jurisdiction from profiles order by name',
 campaigns:"select c.*,count(p.id)::int as posts,count(p.id) filter(where p.state='published')::int as published from campaigns c left join posts p on p.campaign_id=c.id group by c.id order by c.name",
 calendar:"select p.code,p.title,f.name as profile,p.owner,p.state,p.revision,p.planned_at from posts p join profiles f on f.id=p.profile_id where state not in ('published','archived') order by planned_at nulls last,code",
 'approval-queue':'select code,title,owner,revision,decision,reviewed_revision,coalesce(current_approval,false) as current_approval from approval_queue order by code',
 attention:'select code,title,owner,issue from attention order by code,issue',
 performance:"select code,title,network,campaign,as_of,impressions,engagements,clicks,engagement_pct,click_pct from post_performance where state='published' order by code",
 'campaign-review':"select c.name,c.owner,count(p.id)::int as posts,count(p.id) filter(where p.state='published')::int as published,count(p.id) filter(where p.state in ('draft','review'))::int as waiting,count(m.id)::int as measured,sum(m.impressions) as known_impressions,sum(m.clicks) as known_clicks,count(p.id) filter(where p.state='published' and m.clicks is null)::int as missing_clicks from campaigns c left join posts p on p.campaign_id=c.id left join latest_metrics m on m.post_id=p.id group by c.id order by c.name",
 'content-gaps':"select f.name,f.network,f.owner,count(p.id)::int as planned_posts from profiles f left join posts p on p.profile_id=f.id and p.state in ('draft','review','approved') and p.planned_at between now() and now()+interval '7 days' group by f.id order by f.name",
 'owner-load':"select coalesce(nullif(owner,''),'UNASSIGNED') as owner,count(*)::int as open_posts,count(*) filter(where planned_at<now())::int as overdue from posts where state in ('draft','review','approved') group by owner order by overdue desc,owner",
 'metric-gaps':"select p.code,p.title,m.as_of,case when m.id is null then 'no snapshot' when m.as_of<current_date-7 then 'stale snapshot' else 'missing metric' end as issue from posts p left join latest_metrics m on m.post_id=p.id where p.state='published' and (m.id is null or m.as_of<current_date-7 or m.impressions is null or m.engagements is null or m.clicks is null) order by code",
 compliance:'select code,title,jurisdiction,rule,issue,source from compliance_findings order by code,rule',
 activity:'select a.created_at,p.code,a.actor,a.action,a.detail from activity a left join posts p on p.id=a.post_id order by a.created_at,a.id',
 imports:'select id,filename,as_of,actor,row_count,created_at from imports order by created_at'
};
export const commands=[...Object.keys(reads),'help','list','show','weekly-review','add-profile','add-campaign','add','update','log','approve','record-published','record-metrics','metric-history','import','export','draft-calendar','draft-review'];
const entities=['profiles','campaigns','posts','approvals','metrics','imports','source_rows','activity'];
function required(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k} is required`);return o[k].trim();}
function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error(`Invalid ISO date: ${s}`);return s;}
function instant(s){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))throw Error('Timestamp needs ISO date and explicit timezone');date(s.slice(0,10));return new Date(s).toISOString();}
function count(s){if(s===null||s===undefined||String(s).trim()===''||['N/A','--','-'].includes(String(s).trim()))return null;const v=String(s).replace(/,/g,'');if(!/^\d+$/.test(v)||!Number.isSafeInteger(Number(v)))throw Error(`Invalid nonnegative metric: ${s}`);return Number(v);}
function bool(s){if(!['true','false'].includes(s))throw Error('Boolean must be true or false');return s==='true';}
function link(s){let u;try{u=new URL(s);}catch{throw Error('Expected an absolute HTTP(S) URL');}if(!['https:','http:'].includes(u.protocol))throw Error('Expected an HTTP(S) URL');return s;}
async function resolve(db,entity,ref){
 if(!ref)throw Error('A record reference is required');
 const col=entity==='posts'?'title':'name';
 let rows=await db.query(`select * from ${entity} where id::text=$1 or lower(${entity==='posts'?'code':col})=lower($1)`,[ref]);
 if(!rows.length)rows=await db.query(`select * from ${entity} where left(id::text,length($1))=$1 or position(lower($1) in lower(${col}))>0 order by ${col}`,[ref]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${entity}: ${rows.map(r=>`${r.id} ${r.code||r.name} ${r.title||''}`).join('; ')}`:`No ${entity} match: ${ref}`);return rows[0];
}
async function event(db,p,actor,action,detail){await db.query('insert into activity(post_id,actor,action,detail) values($1,$2,$3,$4::jsonb)',[p?.id||null,actor,action,JSON.stringify(detail)]);}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}

async function importSprout(db,o,actor){
 const file=required(o,'file'),asOf=date(required(o,'as-of'));
 if(asOf>new Date().toISOString().slice(0,10))throw Error('Snapshot cannot be in the future');
 const input=fs.readFileSync(file,'utf8'),raw=parseCsv(input);
 if(!raw.length)throw Error('No data rows in CSV');
 const mapping=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
 for(const k of Object.keys(mapping))if(!['id','url','profile','network','body','published','impressions','engagements','clicks'].includes(k)||typeof mapping[k]!=='string')throw Error(`Unknown mapping field ${k}`);
 for(const header of Object.values(mapping))if(!Object.keys(raw[0]).some(k=>k.toLowerCase()===header.toLowerCase()))throw Error(`Mapped column not found: ${header}`);
 const get=(r,k,...names)=>mapping[k]?pick(r,mapping[k]):pick(r,...names);
 const seen=new Set();
 const rows=raw.map((r,i)=>{
 const network=get(r,'network','Network','Social Network'),profile=get(r,'profile','Profile','Profile Name');
 const id=get(r,'id','Post ID','Message ID'),url=get(r,'url','Post Link','Permalink','Post URL');
 const body=get(r,'body','Post','Message','Post Text');
 if(!network||!profile||(!id&&!url)||!body)throw Error(`Row ${i+2}: network, profile, stable post ID or link, and post text required. Use --map for different headers.`);
 if(url)link(url);
 const key=JSON.stringify([network.toLowerCase(),profile.toLowerCase(),id||url]);
 if(seen.has(key))throw Error(`Row ${i+2}: duplicate post in one export`);seen.add(key);
 const published=get(r,'published','Date','Published Date','Post Date');
 const publishedAt=/^\d{4}-\d{2}-\d{2}$/.test(published)?date(published)+'T00:00:00Z':instant(published);
 if(publishedAt.slice(0,10)>asOf)throw Error('Post published after snapshot date');
 return {network,profile,key,body,url,publishedAt,raw:r,impressions:count(get(r,'impressions','Impressions')),engagements:count(get(r,'engagements','Engagements')),clicks:count(get(r,'clicks','Post Link Clicks','Link Clicks'))};
 });
 const fingerprint=createHash('sha256').update(JSON.stringify({input,asOf,mapping})).digest('hex');
 const prior=await db.query('select id from imports where fingerprint=$1',[fingerprint]);
 if(prior.length)return {unchanged:rows.length,created:0,updated:0,import_id:prior[0].id};
 return transaction(db,async()=>{
 const batch=(await db.query('insert into imports(fingerprint,filename,as_of,actor,row_count) values($1,$2,$3,$4,$5) returning id',[fingerprint,path.basename(file),asOf,actor,rows.length]))[0];
 let created=0,updated=0;
 for(const r of rows){
 let profile=(await db.query('select * from profiles where lower(name)=lower($1) and lower(network)=lower($2)',[r.profile,r.network]))[0];
 if(!profile)profile=(await db.query('insert into profiles(name,network) values($1,$2) returning *',[r.profile,r.network]))[0];
 let post=(await db.query('select * from posts where source_key=$1 for update',[r.key]))[0];
 const previousPost=post;
 if(!post){
 post=(await db.query("insert into posts(code,profile_id,title,body,published_at,permalink,state,source_key) values($1,$2,$3,$4,$5,$6,'published',$7) returning *",['IMP-'+createHash('sha256').update(r.key).digest('hex').slice(0,16),profile.id,r.body.slice(0,100),r.body,r.publishedAt,r.url,r.key]))[0];created++;
 }else if(post.body!==r.body||post.permalink!==r.url||Date.parse(post.published_at)!==Date.parse(r.publishedAt)){
 if(!o.update)throw Error(`Changed source content for ${post.code}; inspect and use --update to accept`);
 await db.query('update posts set body=$2,title=$3,permalink=$4,published_at=$5 where id=$1',[post.id,r.body,r.body.slice(0,100),r.url,r.publishedAt]);updated++;
 }
 const m=(await db.query('select * from metrics where post_id=$1 and as_of=$2',[post.id,asOf]))[0];
 const changed=m&&['impressions','engagements','clicks'].some(k=>(m[k]===null?null:Number(m[k]))!==r[k]);
 if(changed&&!o.update)throw Error(`Conflicting snapshot for ${post.code}; inspect and use --update`);
 await db.query('insert into metrics(post_id,as_of,impressions,engagements,clicks,source) values($1,$2,$3,$4,$5,$6) on conflict(post_id,as_of) do update set impressions=excluded.impressions,engagements=excluded.engagements,clicks=excluded.clicks,source=excluded.source',[post.id,asOf,r.impressions,r.engagements,r.clicks,'Sprout CSV '+batch.id]);
 await db.query('insert into source_rows(import_id,post_id,raw) values($1,$2,$3::jsonb)',[batch.id,post.id,JSON.stringify(r.raw)]);
 await event(db,post,actor,'import',{batch:batch.id,as_of:asOf,previous_post:previousPost||null,previous_metrics:m||null});
 }
 return {import_id:batch.id,rows:rows.length,created,updated,dry_run:Boolean(o['dry-run'])};
 },Boolean(o['dry-run']));
}

export async function run(db,cmd='help',o={},pos=[]){
 const allowed=new Set(['json','ref','actor','name','network','owner','jurisdiction','objective','due','code','profile','campaign','title','body','at','advertising','disclosure','evidence','rights','state','note','revision','decision','url','as-of','impressions','engagements','clicks','update','file','map','dry-run']);
 for(const key of Object.keys(o))if(!allowed.has(key))throw Error(`Unknown option --${key}`);
 for(const key of ['json','update','dry-run'])if(o[key]!==undefined&&typeof o[key]!=='boolean')throw Error(`--${key} is a standalone boolean flag`);
 if(o['dry-run']&&cmd!=='import')throw Error('--dry-run is only supported for import');
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return {commands,usage:'npm run social -- <command> [--ref=CODE] [--json]. Mutations require --actor=NAME. See docs/cli.md.'};
 if(cmd==='list')return db.query('select id,code,title,owner,state,revision from posts order by code');
 if(cmd==='show'){const p=await resolve(db,'posts',required(o,'ref'));return {post:p,approvals:await db.query('select * from approvals where post_id=$1 order by created_at',[p.id]),metrics:await db.query('select * from metrics where post_id=$1 order by as_of',[p.id])};}
 if(cmd==='metric-history'){const p=await resolve(db,'posts',required(o,'ref'));return db.query('select as_of,impressions,engagements,clicks,source from metrics where post_id=$1 order by as_of',[p.id]);}
 if(cmd==='weekly-review')return {attention:await run(db,'attention'),approvals:await run(db,'approval-queue'),campaigns:await run(db,'campaign-review'),metrics:await run(db,'metric-gaps')};
 if(cmd==='export'){
  const dest=path.resolve(REPO_ROOT,o.file||`exports/social-${randomUUID()}.json`);const result={format:'social-operations-v1',exported_at:new Date().toISOString()};
  await transaction(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');for(const t of entities)result[t]=await db.query(`select * from ${t} order by id`);});
  fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});return {file:dest,posts:result.posts.length};
 }
 if(cmd==='draft-calendar'||cmd==='draft-review'){
 const names=cmd==='draft-calendar'?['calendar','approval-queue','compliance']:['campaign-review','performance','metric-gaps'];
 const sections=[];for(const n of names)sections.push({title:n,note:'Draft for human review. Snapshot only. No publishing or sending.',html:htmlTable(await run(db,n))});
 return {file:writeOut('drafts',`${cmd}-${randomUUID()}`,page({title:cmd==='draft-calendar'?'Content calendar review':'Social performance review',sections}))};
 }
 if(!commands.includes(cmd))throw Error(`Unknown command ${cmd}`);
 const actor=required(o,'actor');
 if(cmd==='import'){if(pos[0]!=='sprout-social')throw Error('Use import sprout-social');return importSprout(db,o,actor);}
 return transaction(db,async()=>{
 if(cmd==='add-profile'){
 const jurisdiction=o.jurisdiction||'NZ';if(!['NZ','AU'].includes(jurisdiction))throw Error('jurisdiction must be NZ or AU');
 const r=(await db.query('insert into profiles(name,network,owner,jurisdiction) values($1,$2,$3,$4) returning *',[required(o,'name'),required(o,'network'),required(o,'owner'),jurisdiction]))[0];await event(db,null,actor,cmd,r);return r;
 }
 if(cmd==='add-campaign'){
 const r=(await db.query('insert into campaigns(name,owner,objective,due_date) values($1,$2,$3,$4) returning *',[required(o,'name'),required(o,'owner'),required(o,'objective'),date(required(o,'due'))]))[0];await event(db,null,actor,cmd,r);return r;
 }
 if(cmd==='add'){
 const profile=await resolve(db,'profiles',required(o,'profile')),campaign=o.campaign?await resolve(db,'campaigns',o.campaign):null;
 const r=(await db.query('insert into posts(code,profile_id,campaign_id,title,body,owner,planned_at,advertising) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[required(o,'code'),profile.id,campaign?.id||null,required(o,'title'),required(o,'body'),required(o,'owner'),o.at?instant(o.at):null,o.advertising?bool(o.advertising):false]))[0];await event(db,r,actor,cmd,r);return r;
 }
 let p=await resolve(db,'posts',required(o,'ref'));
 p=(await db.query('select * from posts where id=$1 for update',[p.id]))[0];
 if(cmd==='update'){
 const fields={title:'title',body:'body',owner:'owner',at:'planned_at',advertising:'advertising',disclosure:'disclosure_evidence',evidence:'claim_evidence',rights:'rights_until',state:'state'};
 const changes={};for(const [k,col] of Object.entries(fields))if(o[k]!==undefined){let val=o[k];if(k==='at')val=instant(val);if(k==='rights')val=date(val);if(k==='advertising')val=bool(val);if(k==='state'&&!['draft','review','archived'].includes(val))throw Error('Use approve or record-published for approval/publication evidence');if(['title','body','owner'].includes(k)&&!val.trim())throw Error(`${k} cannot be empty`);changes[col]=val;}
 if(o.campaign)changes.campaign_id=(await resolve(db,'campaigns',o.campaign)).id;
 if(!Object.keys(changes).length)throw Error('No fields to update');
 const keys=Object.keys(changes);const r=(await db.query(`update posts set ${keys.map((k,i)=>`${k}=$${i+2}`).join(',')} where id=$1 returning *`,[p.id,...Object.values(changes)]))[0];await event(db,r,actor,cmd,{before:p,after:r});return r;
 }
 if(cmd==='log'){await event(db,p,actor,'note',{note:required(o,'note')});return {code:p.code,logged:true};}
 if(cmd==='approve'){
 if(['published','archived'].includes(p.state))throw Error('Only unpublished active posts can be reviewed');
 if(String(p.revision)!==required(o,'revision'))throw Error('Revision changed; read the current content');
 const decision=o.decision||'approved';if(!['approved','rejected'].includes(decision))throw Error('Decision must be approved or rejected');
 const evidence=required(o,'evidence');
 if(decision==='approved'){
 const problems=await db.query('select rule,issue from compliance_findings where id=$1',[p.id]);if(problems.length)throw Error(`Resolve compliance findings: ${JSON.stringify(problems)}`);
 if(!p.owner||!p.planned_at)throw Error('An owner and planned timestamp are required');
 }
 await db.query('insert into approvals(post_id,revision,decision,actor,evidence) values($1,$2,$3,$4,$5)',[p.id,p.revision,decision,actor,evidence]);
 await db.query('update posts set state=$2 where id=$1',[p.id,decision==='approved'?'approved':'draft']);await event(db,p,actor,cmd,{decision,revision:p.revision,evidence});return {code:p.code,revision:p.revision,decision};
 }
 if(cmd==='record-published'){
 if(p.state!=='approved')throw Error('Current approval required');
 const a=(await db.query('select * from approvals where post_id=$1 order by created_at desc,id desc limit 1',[p.id]))[0];
 if(!a||a.decision!=='approved'||a.revision!==p.revision)throw Error('Current approval required');
 const at=instant(required(o,'at'));if(Date.parse(at)>Date.now())throw Error('Publication evidence cannot be in the future');
 const problems=await db.query('select rule from compliance_findings where id=$1',[p.id]);if(problems.length)throw Error('Compliance findings block recording publication');
 const url=link(required(o,'url')),evidence=required(o,'evidence');
 await db.query("update posts set state='published',published_at=$2,permalink=$3 where id=$1",[p.id,at,url]);await event(db,p,actor,cmd,{at,url,evidence});return {code:p.code,state:'published',sent:false};
 }
 if(cmd==='record-metrics'){
 if(p.state!=='published')throw Error('Metrics require a published post');
 const asOf=date(required(o,'as-of'));if(asOf<new Date(p.published_at).toISOString().slice(0,10))throw Error('Snapshot precedes publication');
 if(asOf>new Date().toISOString().slice(0,10))throw Error('Snapshot cannot be in the future');
 const vals=['impressions','engagements','clicks'].map(k=>count(o[k]));if(vals.every(v=>v===null))throw Error('Provide at least one metric');
 const previous=(await db.query('select * from metrics where post_id=$1 and as_of=$2',[p.id,asOf]))[0];if(previous&&!o.update)throw Error('Snapshot exists; use --update after review');
 const evidence=required(o,'evidence');await db.query('insert into metrics(post_id,as_of,impressions,engagements,clicks,source) values($1,$2,$3,$4,$5,$6) on conflict(post_id,as_of) do update set impressions=excluded.impressions,engagements=excluded.engagements,clicks=excluded.clicks,source=excluded.source',[p.id,asOf,...vals,evidence]);await event(db,p,actor,cmd,{as_of:asOf,previous,values:vals,evidence});return {code:p.code,as_of:asOf};
 }
 throw Error('Unhandled command');
 });
}

export function parseArgs(args){const o={},pos=[];for(let i=0;i<args.length;i++){const a=args[i];if(a.startsWith('--')){const eq=a.indexOf('=');if(eq>=0)o[a.slice(2,eq)]=a.slice(eq+1);else if(['json','dry-run','update'].includes(a.slice(2)))o[a.slice(2)]=true;else {if(!args[i+1]||args[i+1].startsWith('--'))throw Error(`Missing value for ${a}`);o[a.slice(2)]=args[++i];}}else pos.push(a);}return {cmd:pos.shift()||'help',o,pos};}
function human(value){if(Array.isArray(value)){if(!value.length)return '(none)';const rows=value.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v===null?'unknown':typeof v==='object'?JSON.stringify(v):v])));return table(rows,Object.keys(rows[0]).map(key=>({key,label:key,width:key==='title'?32:undefined})));}if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>Array.isArray(v)?`${k}\n${human(v)}`:`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n\n');return String(value);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const {cmd,o,pos}=parseArgs(process.argv.slice(2));db=await getDb();const result=await run(db,cmd,o,pos);console.log(o.json?JSON.stringify(result,null,2):human(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
