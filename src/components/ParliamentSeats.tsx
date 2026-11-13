"use client";
import {seatsWon,seatMeasureScope,turnoutForDisplay,type PoliticalElectionView} from '@/lib/politicalExplorer';
import {useLocale} from '@/i18n/LocaleProvider';
export function ParliamentSeats({election}:{election:PoliticalElectionView}){
 const en=useLocale()==='en',chamber=election.totalSeats,total=chamber??0,turnout=turnoutForDisplay(election),scope=seatMeasureScope(election);
 const parties=election.results.map(r=>({id:r.contestantId,label:r.nativeLabel,seats:seatsWon(r,election)})).filter(r=>r.seats>0);
 const known=parties.reduce((n,p)=>n+p.seats,0),valid=Number.isInteger(total)&&total>0&&total<=1500&&known<=total;
 const colors=['#475569','#64748b','#0f766e','#b45309','#7c3a5e','#596b32','#706b87','#254c65'];
 const assignments=parties.flatMap((p,i)=>Array.from({length:p.seats},()=>({label:p.label,color:colors[i%colors.length]})));
 const seats=valid?Array.from({length:total},(_,i)=>assignments[i]??{label:en?'Not represented in this source slice':'本来源切片未涵盖',color:'var(--line)'}):[];
 let cursor=0;const radii=[50,66,82,98,114,130,146,162],weight=radii.reduce((n,r)=>n+r,0);
 return <section className="mt-5 rounded border border-[var(--line)] p-4" data-parliament-seats>
 <div className="flex flex-wrap gap-6 text-lg font-semibold"><p>{en?'Turnout':'投票率'}: {turnout.value===null?'—':`${turnout.value.toLocaleString(en?'en':'zh-CN',{maximumFractionDigits:2})}%`}</p><p>{en?'Full chamber':'全议院'}: {chamber??'—'}</p></div>
 <h3 className="mt-3 font-semibold">{en?'Parliamentary seat composition':'议会席位构成'} · {election.year}</h3>
 <p className="mt-2 text-xs">{scope==='national_list_tier'?(en?'Only recorded national-list seats are assigned to contestants. Grey seats are outside this slice; the full-chamber denominator is retained.':'仅将已记录的全国名单席位分配给参选方；灰色表示本切片未涵盖的席位，分母保留全议院。'):(en?'Election-specific contestants and coalitions remain intact. Grey seats are unassigned by this source, not zero seats.':'保留当届参选方和联盟身份；灰色表示本来源未归属的席位，不是零席位。')}</p>
 {valid?<svg viewBox="0 0 400 205" role="img" aria-label={`${en?'Seat composition':'席位构成'} · ${known}/${total}`} className="mt-3 max-h-[300px] w-full">{radii.flatMap((radius,row)=>{const count=row===radii.length-1?total-cursor:Math.round(total*radius/weight);return Array.from({length:Math.max(0,count)},(_,i)=>{const seat=seats[cursor++];const angle=Math.PI-(i+.5)*Math.PI/count;return <circle key={`${row}:${i}`} cx={200+radius*Math.cos(angle)} cy={188-radius*Math.sin(angle)} r={total>450?2.1:3.8} fill={seat.color}><title>{seat.label}</title></circle>;});})}</svg>:<p role="status">{en?'The source does not support a complete seat diagram; original records remain available.':'来源不足以支持席位图；原始记录仍可查看。'}</p>}
 <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">{parties.map((p,i)=><li key={p.id}><span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full" style={{background:colors[i%colors.length]}}/><span lang={election.originalLanguage??'und'}>{p.label}</span>: {p.seats}</li>)}{valid&&known<total?<li>{en?'Outside this slice / unassigned':'切片未涵盖／未归属'}: {total-known}</li>:null}</ul>
 </section>;
}
