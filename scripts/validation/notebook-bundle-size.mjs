import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
// Measured static export before Notebook implementation, deployed commit below.
const baseline = { total:1324923, home:194354, data:259467, models:422383, workspaceIndex:191994, workspace:199115 };
const chunks=[];
function walk(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true})) { const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(f.endsWith(".js"))chunks.push(f); } }
walk("out/_next/static/chunks");
const gzip=f=>zlib.gzipSync(fs.readFileSync(f)).length;
function initial(route) { const html=fs.readFileSync(`out/${route}index.html`,"utf8");return [...new Set([...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map(m=>`out${m[1]}`))].reduce((n,f)=>n+gzip(f),0); }
const current={total:chunks.reduce((n,f)=>n+gzip(f),0),home:initial(""),data:initial("data/"),models:initial("models/"),workspaceIndex:initial("en/workspaces/"),workspace:initial("en/workspaces/inflation_monetary_policy/")};
console.log(JSON.stringify({baseline_commit:"d83a6166072c0c295e7d385d25378cb710053a54",measurement:"gzip each unique JS chunk independently; not a load-time benchmark",baseline,current,delta:Object.fromEntries(Object.keys(current).map(k=>[k,current[k]-baseline[k]])),notebook:initial("notebook/"),englishNotebook:initial("en/notebook/")},null,2));
