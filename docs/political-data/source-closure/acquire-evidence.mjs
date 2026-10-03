import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const allowed=new Set(['csu.gov.cz','opendata.csu.gov.cz','volby.cz','volby.gov.cz','volby.statistics.sk','statistics.sk','slovak.statistics.sk','pkw.gov.pl','www.pkw.gov.pl','danewyborcze.kbw.gov.pl','www.bmi.gv.at','static.slov-lex.sk']);
const archive=path.join(dir,'local-evidence');
fs.mkdirSync(archive,{recursive:true});
if(process.argv.includes('--baseline')){
  const roots=['src/data','public/research-data','src/app','src/components','src/lib'];
  const files=[];
  function walk(rel){for(const entry of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const p=`${rel}/${entry.name}`;if(entry.isDirectory())walk(p);else if(entry.isFile())files.push(p);}}
  for(const rel of roots)walk(rel);
  files.push('package.json','pnpm-lock.yaml');
  const baseline={schema_version:'political-source-closure-freeze-v1',created_at:new Date().toISOString(),platform_version:'v2.0',files:Object.fromEntries(files.sort().map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]))};
  fs.writeFileSync(path.join(dir,'frozen-baseline.json'),JSON.stringify(baseline,null,2)+'\n',{flag:'wx'});
}else{
  const urls=process.argv[2]==='--batch'?JSON.parse(fs.readFileSync(path.resolve(process.argv[3]),'utf8')):process.argv.slice(2);
  for(const url of urls){
  if(!url||!allowed.has(new URL(url).hostname))throw Error('Explicit approved official audit URL required');
  const key=hash(Buffer.from(url));
  const file=path.join(archive,key+'.json');
  if(fs.existsSync(file)){console.log(JSON.stringify({existing:JSON.parse(fs.readFileSync(file,'utf8'))}));continue;}
  if(new URL(url).hostname==='www.bmi.gv.at')throw Error('BMI automated acquisition stopped: bmi.gv.at robots.txt disallows AI agents (Anthropic-ai, Claude-Web). Owner-performed manual download only.');
  if(/(^|\.)statistics\.sk$/.test(new URL(url).hostname))throw Error('Slovak automated acquisition stopped: publisher prohibits similar collection tools. Owner-approved permitted route and written applicability confirmation required.');
  try{
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>10_000_000)throw Error('Audit file exceeds 10 MB; select a smaller national source');
  const sha=hash(bytes), filename=sha+'.raw';
  if(!fs.existsSync(path.join(archive,filename)))fs.writeFileSync(path.join(archive,filename),bytes,{flag:'wx'});
  const metadata={url,final_url:response.url,status:response.status,content_type:response.headers.get('content-type'),retrieved_at:new Date().toISOString(),bytes:bytes.length,sha256:sha,archive_path:`local-evidence/${filename}`,raw_redistribution:'not_cleared_local_only'};
  fs.writeFileSync(file,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(metadata));
  }catch(error){console.log(JSON.stringify({url,error:error.message,status:'retrieval_failed_no_evidence'}));}
  }
}
