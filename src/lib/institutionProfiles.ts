// Presentation evidence. Election-specific counts and electoral rules stay in politicalData.
type Text = readonly [string,string];
type Rule = {
  source: string; basis: string; selection: Text; term: Text; formation: Text; confidence: Text;
};
export const chambers:Record<string,Text> = {
  poland:['Sejm and Senate','众议院（Sejm）与参议院'],hungary:['National Assembly','国民议会'],
  germany:['Bundestag and Bundesrat','联邦议院与联邦参议院'],serbia:['National Assembly','国民议会'],
  austria:['National Council and Federal Council','国民议会与联邦议会'],romania:['Chamber of Deputies and Senate','众议院与参议院'],
  czechia:['Chamber of Deputies and Senate','众议院与参议院'],slovakia:['National Council','国民议会（National Council）'],
  slovenia:['National Assembly and National Council','国民议会与国民委员会'],croatia:['Croatian Parliament (Sabor)','克罗地亚议会（Sabor）']
};
export const parliamentaryDirectory='https://www.europarl.europa.eu/relnatparl/en/home/national-parliaments';
export const constitutionalRules:Partial<Record<string,Rule>>={
 poland:{
  source:'https://sejm.gov.pl/prawo/konst/angielski/konse.htm',basis:'Konstytucja RP · 95, 98, 127, 154, 158',
  selection:['President elected directly','总统由选民直选'],term:['Sejm and Senate: four years ordinarily','众议院与参议院通常为四年'],
  formation:['President appoints the Council of Ministers → Prime Minister seeks confidence in the Sejm','总统任命部长会议 → 总理向众议院请求信任投票'],
  confidence:['The Sejm can replace the government by electing a successor prime minister.','众议院可通过选出继任总理更换政府。']
 },
 hungary:{
  source:'https://njt.hu/jogszabaly/en/2011-4301-02-00',basis:'Magyarország Alaptörvénye · 2, 10–11, 16, 21 (2025-04-15)',
  selection:['President elected by the National Assembly','总统由国民议会选出'],term:['General elections ordinarily take place in the fourth year after the preceding election.','例行大选在上次大选后的第四年举行。'],
  formation:['President proposes a prime minister → National Assembly elects the prime minister','总统提名总理 → 国民议会选举总理'],
  confidence:['A motion of no confidence in the prime minister names a successor.','对总理的不信任动议须提出继任人选。']
 },
 germany:{
  source:'https://www.gesetze-im-internet.de/englisch_gg/englisch_gg.html',basis:'Grundgesetz · 39, 54, 63, 67',
  selection:['Federal President elected by the Federal Convention','联邦总统由联邦大会选出'],term:['Bundestag: four years ordinarily','联邦议院通常为四年'],
  formation:['Federal President proposes a chancellor → Bundestag votes → President appoints the elected chancellor under Article 63','联邦总统提名总理 → 联邦议院投票 → 总统依第63条任命'],
  confidence:['The Bundestag can withdraw confidence by electing a successor chancellor.','联邦议院可通过选出继任总理撤回信任。']
 },
 serbia:{
  source:'https://www.parlament.gov.rs/upload/documents/Constitution_%20of_Serbia_pdf.pdf',basis:'Ustav Republike Srbije · 100–101, 114, 127, 130',
  selection:['President elected directly','总统由选民直选'],term:['National Assembly: four years ordinarily','国民议会通常为四年'],
  formation:['President proposes a candidate → National Assembly votes on the programme and government','总统提名总理人选 → 国民议会表决施政纲领和政府组成'],
  confidence:['The National Assembly may vote on a motion of no confidence in the government.','国民议会可对政府进行不信任表决。']
 }
};
export function institutionalSources(slug:string) {
 return slug==='serbia' ? ['https://www.parlament.gov.rs/national-assembly/role-and-mode-of-operation/jurisdiction.501.html'] :
 ['https://european-union.europa.eu/principles-countries-history/eu-countries/'+slug+'_en',parliamentaryDirectory];
}
