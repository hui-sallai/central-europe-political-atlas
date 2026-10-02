import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {root, archiveRoot, sha256} from "./acquire.mjs";

export function loadArchives() {
  const archives=fs.readdirSync(path.join(root,archiveRoot)).filter(name=>/^\d{4}-/.test(name)).sort().map(name=>JSON.parse(fs.readFileSync(path.join(root,archiveRoot,name,"metadata.json"),"utf8")));
  for(const a of archives)assert.equal(sha256(fs.readFileSync(path.join(root,a.raw_path))),a.sha256,"Raw checksum mismatch");
  const select=id=>{const matches=archives.filter(a=>a.source_id===id);assert.equal(matches.length,1,"Explicit snapshot selection required for multiple revisions");return matches[0];};
  const historical=select("src-de-bwl-historical-results"),zip=select("src-de-bwl-final-archive");
  const members=JSON.parse(execFileSync("python3",["-c","import zipfile,json,sys,hashlib;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;out={}\nfor n in z.namelist():\n b=z.read(n);enc='utf-8-sig'\n try:t=b.decode(enc)\n except UnicodeDecodeError:enc='cp1252';t=b.decode(enc)\n out[n]={'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'encoding':enc,'text':t}\nprint(json.dumps(out,ensure_ascii=False))",path.join(root,zip.raw_path)],{maxBuffer:30000000}).toString());
  return {historical,zip,members};
}
