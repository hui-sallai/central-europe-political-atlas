import { latestPublished } from "./freshnessCore";
import type { Observation } from "@/types/Observation";

/** A placeholder may explain a gap, but its value must never be presented as published. */
export function countryObservationSummary(series: readonly Observation[]) {
  const published = latestPublished(series.filter(row => row.applicability_status !== "not_applicable" && row.comparability_status !== "not_applicable"));
  const record = published ?? series.reduce<Observation | undefined>((latest, row) => !latest || row.year > latest.year ? row : latest, undefined);
  const unavailable = !published ? record?.applicability_status === "not_applicable" || record?.comparability_status === "not_applicable" ? "not_applicable" : record?.status === "pending" ? "pending" : "missing" : null;
  return { published, record, value: published?.value ?? null, unavailable };
}

const statisticalNotes:Record<string,string>={
 "链式体量，较上年变化率。":"Year-on-year change in chain-linked volume.",
 "年均消费者价格变化率；欧盟国家采用 HICP。":"Average annual change in consumer prices. EU countries use the Harmonised Index of Consumer Prices.",
 "15-74 岁劳动力口径。":"Labour force aged 15–74.",
 "按 GDP 与人口换算。":"Calculated from GDP and population.",
 "年初人口；单位已按指标字典转换为人。":"Population at the start of the year, expressed in persons.",
 "该 Eurostat 同口径模板当前不覆盖塞尔维亚；其他官方口径仅作替代证据，暂不进入十国比较。":"This harmonised Eurostat series does not cover Serbia. Other official definitions are available as separate evidence and are excluded from the ten-country comparison."
};
export function countryStatisticalNote(note:string,english:boolean){
 if(!note.trim()||note.trim()==="无")return {text:english?"No statistical description recorded.":"暂无统计说明。",original:false};
 if(!english)return {text:note,original:false};
 const [description,...sources]=note.split("数据来源：");
 const translated=statisticalNotes[description.trim()];
 if(!translated)return {text:note,original:true};
 return {text:translated+(sources.length?" Source: "+sources.join("数据来源：").trim():""),original:false};
}
