import fs from 'node:fs';
import path from 'node:path';
import {getDb,REPO_ROOT} from './lib/db.mjs';
export async function seed(db){await db.exec('BEGIN');try{await db.exec(fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}}
if(process.argv[1]?.endsWith('seed.mjs')){const db=await getDb();try{if(db.mode!=='pglite')throw Error('Demo seed requires local PGlite; tests call seed explicitly on disposable databases.');await seed(db);console.log('Seed: fictional Kauri Outdoors records ready');}finally{await db.close();}}
