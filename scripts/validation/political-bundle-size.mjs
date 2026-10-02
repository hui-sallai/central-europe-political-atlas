import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
// Notebook release measurement recorded in docs/research-notebook.md, before Politics.
const baseline={total:1346987,home:201014,data:266292,models:428819,workspaceIndex:198654,workspace:206211};
const chunks=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.js'))chunks.push(file);}}
walk('out/_next/static/chunks');
const gzip=file=>zlib.gzipSync(fs.readFileSync(file)).length;
function initial(route){const html=fs.readFileSync(`out/${route}index.html`,'utf8');return [...new Set([...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map(m=>`out${m[1]}`))].reduce((sum,file)=>sum+gzip(file),0);}
const current={total:chunks.reduce((sum,file)=>sum+gzip(file),0),home:initial(''),data:initial('data/'),models:initial('models/'),workspaceIndex:initial('en/workspaces/'),workspace:initial('en/workspaces/inflation_monetary_policy/')};
console.log(JSON.stringify({baseline_commit:'8b32cac',measurement:'gzip each unique chunk separately; not a load-time benchmark',baseline,current,delta:Object.fromEntries(Object.keys(current).map(key=>[key,current[key]-baseline[key]])),politics:initial('politics/'),englishPolitics:initial('en/politics/')},null,2));
