// Phase 7 documentary review from ALREADY ARCHIVED local evidence only (no network access).
// Writes documentary_review.json: file inventories, schema/encoding matrices, denominator checks, vintage structure,
// identity-evidence plans and dated documents. No canonical write, no production value is published.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseCsv} from '../../../scripts/political-data/germany/csv.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const evidence=fs.readdirSync(path.join(dir,'local-evidence')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,'local-evidence',f),'utf8')));
const byUrl=u=>evidence.find(e=>e.url===u);
const decode=e=>{const raw=fs.readFileSync(path.join(dir,e.archive_path));const m=/charset=([\w-]+)/i.exec(raw.subarray(0,4000).toString('latin1'));return new TextDecoder(m?m[1].toLowerCase():'utf-8').decode(raw);};
const text=h=>h.replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const links=e=>[...decode(e).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(a=>({url:new URL(a[1].replaceAll('\\','/').replaceAll('&amp;','&'),e.url).href,title:text(a[2]).trim()}));
const ref=e=>e?{url:e.url,sha256:e.sha256,retrieved_at:e.retrieved_at}:null;

// ---------------- Czechia ----------------
const czYears=[2002,2006,2010,2013,2017,2021,2025];
const czKind=u=>/_reg|reg\d|regPopis/i.test(u)?'registry':/cisel|ciselnik/i.test(u)?'code_lists':/_data_|data\d{8}|datovaveta|dataPopis/i.test(u)?'result_data':/vysledky/i.test(u)?'live_result_xml':/XML\.(pdf|htm)$/i.test(u)?'xml_documentation':/nuts/i.test(u)?'nuts_code_list':/Mandatu|mandat/i.test(u)?'seat_allocation_method':/NSS|usneseni/i.test(u)?'court_resolution':'other';
const czech=czYears.map(year=>{
 const idx=evidence.find(e=>e.url.includes(`/opendata/ps${year}/`)&&/opendata\.htm|odata\.htm/.test(e.url)&&!e.url.includes('Popis')&&!(year===2017&&e.url.endsWith('ps2017_opendata.htm')));
 const subpages=year===2017?['https://volby.gov.cz/opendata/ps2017nss/ps2017nss_opendata.htm','https://volby.gov.cz/opendata/ps2017/ps2017_opendata.htm'].map(u=>{const e=byUrl(u);return e?{vintage:u.includes('nss')?'recalculated_NSS_Vol_58_2017':'original_precinct_commission_results',index:ref(e),files:links(e).filter(l=>/\.(zip|xml|pdf|htm|xlsx)$/i.test(l.url)&&!/opendata\.htm$|prohlaseni/.test(l.url)).map(l=>({url:l.url,title:l.title,kind:czKind(l.url),vintage:(/(\d{8})/.exec(path.basename(l.url))||[])[1]??null}))}:{vintage:u,index:null,files:[]};}):null;
 const files=idx?links(idx).filter(l=>/\.(zip|xml|pdf|htm|xlsx)$/i.test(l.url)&&!/opendata\.htm$|prohlaseni/.test(l.url)).map(l=>({url:l.url,title:l.title,kind:czKind(l.url),format:path.extname(new URL(l.url).pathname).slice(1).toLowerCase(),vintage:(/(\d{8})/.exec(path.basename(l.url))||[])[1]??null})):[];
 const t=idx?text(decode(idx)):'';
 const vintages=[...new Set(files.map(f=>f.vintage).filter(Boolean))].sort();
 return {year,index:ref(idx),file_count:files.length+(subpages?subpages.reduce((n,p)=>n+p.files.length,0):0),files,vintage_subpages:subpages,package_vintages:vintages,
  retrospective_packages:vintages.some(v=>v.startsWith('2023')),
  vintage_notes:year===2017?['Two official sub-pages: results recalculated under Supreme Administrative Court resolution Vol 58/2017-173 (19 Nov 2017; changes made 22 Nov 2017) and original results taken over from precinct commissions. Both are provided for continuity. A production definition must choose one explicitly; the recalculated vintage is the legally corrected result.',t.includes('přepočtené')?'Index text confirms recalculated vs original wording.':'Index text check failed.']:year===2021?['Register packages exist in two vintages (20211010 and 20211111) next to Supreme Administrative Court decision Vol 102/2021-38; data packages are dated 20211010. The register change must be reviewed before identity work.']:[]};
});
const czDefinitions={
 observed_2025_vysledky_xml:{observed_at:'2026-10-02 (political audit; not archived)',url:'https://volby.gov.cz/appdata/ps2025/odata/vysledky.xml',turnout:'UCAST_PROC = VYDANE_OBALKY / ZAPSANI_VOLICI (e.g. Prague 645322/903298 = 71.44%)',vote_share:'PROC_HLASU = HLASY / PLATNE_HLASY (e.g. SPD Prague 33292/636042 = 5.23%)',seat_share:'PROC_MANDATU = MANDATY / regional seat total (POCMANDATU)',postal:'2025 adds DORUCOVACI_OBALKY / DORUCOVACI_ODLOZENE (postal envelopes); foreign votes are reported in separate areas — no double counting'},
 not_yet_inspected:['PS_datovaveta (2002–2013), PS2021_datovaveta, PS2025_datovaveta record definitions','XML documentation PS20xx_XML for each year'],
 code_list_semantics:{source:ref(byUrl('https://volby.gov.cz/opendata/ps2025/PS2025ciselnikyPopis.htm')),CVS:'Číselník volebních stran — every electoral contestant (political parties, movements, their coalitions or associations with independent candidates) that appeared in any election since 1998; enables comparison across election types and years (not legal continuity).',VSTRANA:"CVS: 'Kód volební strany'; CVS_SLOZENI: 'Vylosované číslo strany' — the two descriptions conflict; to be clarified before VSTRANA is used as a stable key.",TYPVS:'S = political party/movement, K = coalition, N = independent candidate, M = association of independents, D = association of independents and parties',SLOZENI:'member NSTRANA codes (normalised in CVS_SLOZENI)',CNS:'NSTRANA — nominating party code',CPP:'PSTRANA — political affiliation of candidates',KSTRANA:'ballot number within one election'},
 identity_plan:['Per election: join results (KSTRANA) to the election register (VSTRANA, TYPVS, SLOZENI) from the same package vintage.','Coalitions (TYPVS=K/D) remain contestants; members only via CVS_SLOZENI → CNS for that election; no vote allocation to members.','No cross-election continuity from VSTRANA alone; legal continuity needs the Ministry of the Interior party register.','Historical ČSSD/SOCDEM and 2025 “ČSSD – Česká suverenita sociální demokracie” stay separate until registry evidence exists.']
};

// ---------------- Slovakia ----------------
const skRows=JSON.parse(fs.readFileSync(path.join(dir,'candidate_production_files.json'),'utf8')).elections.filter(e=>e.country==='slovakia');
const tree=evidence.find(e=>e.url.endsWith('volby.statistics.sk/tree.html'));
const treeText=tree?text(decode(tree)):'';
const datasetList=year=>[...treeText.matchAll(new RegExp(`([^-]{5,140}?) - (NRSR_?${year}[_A-Za-z0-9]*\\.csv) \\(([^)]+)\\)`,'g'))].map(m=>({file:m[2],title:m[1].trim().replace(/^.*?(\d{4}\s)/,'').trim(),size:m[3]}));
const num=s=>{if(s==null)return null;const v=String(s).replace(/\s/g,'').replace(',','.');return v===''||/^nan$/i.test(v)?null:Number(v);};
const slovakia=skRows.map(r=>{
 const bytes=fs.readFileSync(path.join(dir,r.retrieval.archive_path));
 const enc=r.year===2002?'windows-1250':'utf-8', delim=r.year===2002?';':',';
 const rows=parseCsv(new TextDecoder(enc,{fatal:true}).decode(bytes),delim);
 const headers=rows[0].map(h=>h.replace(/\s+/g,' ').trim());
 const body=rows.slice(1).filter(x=>x.some(c=>c.trim()!==''));
 const vi=headers.findIndex(h=>/platn.*hlasov/i.test(h)&&!/Podiel/i.test(h)), pi=headers.findIndex(h=>/Podiel platných/i.test(h));
 const si=headers.findIndex(h=>/Počet (pridelených|získaných) mandátov/.test(h));
 const flag=headers.findIndex(h=>/Splnená podmienka/.test(h));
 const idi=headers.findIndex(h=>/Číslo politického|strana číslo/.test(h));
 const votes=body.map(x=>num(x[vi])), total=votes.reduce((a,b)=>a+(b??0),0);
 const maxDiff=Math.max(...body.map((x,i)=>Math.abs(num(x[pi])-votes[i]/total*100)));
 const seatCells={explicit_zero:0,positive:0,nan_marker:0,empty_cell:0};
 if(si>=0)for(const x of body){const s=(x[si]??'').trim();if(s==='')seatCells.empty_cell++;else if(/^nan$/i.test(s))seatCells.nan_marker++;else if(Number(s)===0)seatCells.explicit_zero++;else seatCells.positive++;}
 const seatTotal=si>=0?body.map(x=>num(x[si])).filter(Number.isFinite).reduce((a,b)=>a+b,0):null;
 const list=datasetList(r.year);
 return {year:r.year,file:path.basename(r.file_url),sha256:sha(bytes),encoding:enc,delimiter:delim,headers,result_rows:body.length,
  subject_number_field:idi>=0?headers[idi]:null,subject_number_locality:'election-local ballot/subject number; never a durable party identifier',
  vote_field:headers[vi],share_field:headers[pi],seat_field:si>=0?headers[si]:null,
  threshold_flag_field:flag>=0?headers[flag]:null,
  seat_representation:si>=0?seatCells:'no seat column in this file (2002: first column is a 0/1 seat-allocation-condition flag, not seats)',
  seat_total_positive:seatTotal,
  missing_seat_rule:'explicit 0, nan marker and empty cell are recorded distinctly; nan/empty are never converted to 0',
  valid_vote_denominator:{party_valid_vote_sum:total,published_share_reproduction_max_abs_diff_pp:Math.round(maxDiff*1000)/1000,finding:'Published shares equal votes ÷ sum of party valid votes within rounding; the official national valid-vote total is in the summary table (not acquired) and must be compared before production.'},
  turnout_field:null,
  related_official_tables:list.filter(x=>/Súhrnné výsledky hlasovania( za SR| podľa (okresov|krajov|obvodov))|Pridelenie mandátov|prideľovaniu mandátov|Zoznam (kandidujúcich )?politických subjektov|Zvolení poslanci/.test(x.title)).map(x=>({...x,role:/Súhrnné/.test(x.title)?'turnout/summary (registered, ballots, valid votes)':/mandát/.test(x.title)?'seat allocation':/Zoznam/.test(x.title)?'same-election subject list (identity)':'elected members'})),
  acquisition_note:'Related tables identified from the archived official dataset list only; not downloaded (automated collection prohibited; manual route pending publisher reply).'};
});
const decision2016=evidence.find(e=>e.url.endsWith('ZZ_2015_307_20151112.pdf'));
const decision2016html=evidence.find(e=>e.url.endsWith('2015/307/vyhlasene_znenie.html'));
const sk2016=decision2016html?/určujem\s*1\.\s*deň ich konania na sobotu 5\. marca 2016/.test(text(decode(decision2016html)).replace(/u r č u j e m/,'určujem')):false;

// ---------------- Poland ----------------
const plYears=[2001,2005,2007,2011,2015,2019,2023];
const poland=plYears.map(year=>{
 const pages=evidence.filter(e=>e.url.includes(`Parlament_${year}`)||e.url.includes(`Wybory_do_Sejmu_w_${year}`));
 const all=pages.flatMap(p=>links(p)).filter(l=>/\.(xls|xlsx|csv|zip)$/i.test(l.url));
 const uniq=[...new Map(all.map(l=>[l.url,l])).values()];
 return {year,pages:pages.map(ref),
  district_list_results:uniq.filter(l=>/okr-lis|lis-okr|po_okregach_sejm_csv|gl-lis-okr\./i.test(path.basename(l.url))&&!/proc|kand/i.test(path.basename(l.url))).map(l=>l.url),
  district_definition_files:uniq.filter(l=>/^okr(ę|%c4%99|e)gi.*sejm|^parl\d{4}okr/i.test(path.basename(l.url))).map(l=>l.url),
  finer_list_results:uniq.filter(l=>{const b=path.basename(l.url);return /(gm|gmin|pow|powiat|woj)/i.test(b)&&/lis|listy/i.test(b)&&!/proc|kand|senat|sen-/i.test(b);}).map(l=>l.url),
  committee_or_list_registry:uniq.filter(l=>/komitety|wykaz_list_sejm_csv|kandsejm\d{4}(kom)?\.xls|kand-sejm\.xls/i.test(path.basename(l.url))).map(l=>l.url),
  national_total_file:null,
  national_total_status:'not located in the KBW archive pages; candidate Tier-1 source: the PKW results announcement (obwieszczenie) — to be located; national totals are never summed until 41-district completeness and denominators are documented',
  date_evidence:year===2007?'KBW archive confirms 21 October 2007':null};
});

// ---------------- Austria ----------------
const atYears=[2002,2006,2008,2013,2017,2019,2024];
const austria=atYears.map(year=>{
 const idx=evidence.find(e=>e.url.endsWith(`nationalratswahl_${year}/`));
 const L=idx?links(idx).filter(l=>/\.(xls|xlsx|zip|pdf)$/i.test(l.url)):[];
 const classify=l=>{const s=(l.url+' '+l.title).toLowerCase();return /vorl/.test(s)?'provisional_label':/mandatsspiegelv\.pdf/.test(s)?'possibly_provisional_filename_suffix':/endg|endergebnis|ergebnis_end|verlautbarung/.test(s)?'final_label':'unlabelled';};
 return {year,index:ref(idx),
  result_workbooks:L.filter(l=>/\.(xls|xlsx|zip)$/i.test(l.url)&&/ergebnis|endg|e_dl|multi/i.test(l.url)).map(l=>({url:l.url,title:l.title,vintage_label:classify(l)})),
  seat_documents:L.filter(l=>/mandat|verlautbarung/i.test(l.url)).map(l=>({url:l.url,title:l.title,vintage_label:classify(l)})),
  inspection:'contents not inspected by the agent (bmi.gv.at robots.txt disallows AI agents); owner-performed manual download required'};
});

const out={schema_version:'political-documentary-review-v1',generated_at:new Date().toISOString().slice(0,10),method:'archived local evidence only; no network access in this script',
 czechia:{elections:czech,definitions:czDefinitions},
 slovakia:{elections:slovakia,election_date_2016:{status:sk2016?'verified_tier1_legal_document':'not_verified',date:'2016-03-05',document:'Rozhodnutie predsedu NR SR č. 307/2015 Z. z. o vyhlásení volieb do NR SR (12.11.2015)',evidence:[ref(decision2016),ref(decision2016html)],resolves:'ParlGov 2016-03-06 conflict'},
  dataset_list:{source:ref(tree),statement:'Údaje na stiahnutie — dataset list compiled under Government Resolution No. 59 of 11 Feb 2015 (Open Government Partnership action plan 2015); all seven national files are listed by exact name and size.'}},
 poland:{elections:poland,semantics:['Contestants are electoral committees (komitety wyborcze); coalition committees and voter committees are not parties.','Minority committees may be exempt from the threshold; exemption must be read from the official committee registration, not inferred.','District files hold committee list numbers per district; national aggregation requires all 41 districts and a documented denominator.']},
 austria:{elections:austria,observed_2024_workbook:{observed_at:'2026-10-02 (political audit; not archived; retrieval preceded the robots finding)',national_row:'GKZ G00000 Österreich',fields:['Wahlberechtigte','Abgegebene','Ungültige','Gültige','party votes','party % (of valid votes)'],seats:'not in workbook; in the final Mandatsspiegel PDF',pseudo_units:'Wahlkarten rows (electorate 0) are postal counting units, not geography'},
  semantics:['Wahlwerbende Gruppe (list) need not be a party under the Parteiengesetz.','Seats are allocated in three Ermittlungsverfahren (Regional-, Landes-, Bundeswahlkreis); the final national seat total comes from the Verlautbarung/endgültiger Mandatsspiegel, never from summing rows.']}};
fs.writeFileSync(path.join(dir,'documentary_review.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({czechia_files:czech.reduce((n,c)=>n+c.file_count,0),slovakia_files:slovakia.length,slovakia_2016_date_verified:sk2016,poland_years_with_district_files:poland.filter(p=>p.district_list_results.length).length,austria_years_with_workbooks:austria.filter(a=>a.result_workbooks.length).length}));
