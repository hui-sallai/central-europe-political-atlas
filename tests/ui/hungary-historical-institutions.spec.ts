import {expect,test} from "@playwright/test";

const elections = [
  {id:"el-hu-ogy-2002-04-07", year:2002, final:[176,140,70], transfer:12},
  {id:"el-hu-ogy-2006-04-09", year:2006, final:[176,146,64], transfer:6},
  {id:"el-hu-ogy-2010-04-11", year:2010, final:[176,146,64], transfer:6},
];
const amendments = [
  {id:"hu-1994-electoral-act-amendment", effective:"1994-01-20", source:"https://njt.jog.gov.hu/jogszabaly/1994-3-00-00"},
  {id:"hu-1997-electoral-act-amendment", effective:"1997-11-05", source:"https://njt.jog.gov.hu/jogszabaly/1997-96-00-00"},
];

for (const prefix of ["/en",""]) {
  const en = prefix === "/en";
  test("Hungarian historical allocation and polling-day threshold coverage " + (en?"EN":"ZH"),async({page})=>{
    for (const [i,left] of elections.entries()) {
      const right=elections[(i+1)%elections.length];
      await page.goto(prefix+"/politics/hungary/?election="+left.id+"&compare="+right.id);
      const matrix=page.locator("[data-historical-allocation-comparison]");
      await expect(matrix).toBeVisible();
      await expect(matrix.getByRole("columnheader")).toHaveText([en?"Seat allocation":"席位分配",String(left.year),String(right.year)]);
      for (const [column,e] of [left,right].entries()) {
        const expected=[176,152,58,...e.final,e.transfer,386].map(String);
        await expect(matrix.locator("tbody tr td:nth-child("+(column+2)+")")).toHaveText(expected);
        const rules=matrix.locator('[data-comparison-rules="'+e.id+'"]');
        await rules.locator("summary").click();
        if (e.year===2010) {
          await expect(rules.locator("li")).toHaveCount(2);
          await expect(rules.locator("[data-threshold-coverage]")).toContainText(en?"remained in force":"仍然有效");
        } else {
          await expect(rules.locator("li")).toHaveText(en
            ? [/must exceed 5%/,/must reach 10%/,/must reach 15%/]
            : [/超过 5%/,/达到.*10%/,/三个或更多政党.*达到.*15%/]);
          await expect(rules.locator("[data-threshold-coverage]")).toHaveCount(0);
        }
      }
      if (!en && left.year < 2010) {
        const details=page.locator("[data-national-research]");
        await details.locator("summary").click();
        const thresholds=details.locator("[data-national-thresholds]");
        await expect(thresholds).toContainText(/超过 5%.*两党联合名单须达到.*10%.*三个或更多政党的联合名单须达到.*15%/);
        await expect(thresholds).not.toContainText("两党以上");
      }
      const period=page.locator('[data-election-period="'+left.id+'"]');
      await period.locator("summary").click();
      await expect(period.locator("[data-election-amendments]")).toContainText("1949");
      for (const a of amendments) {
        const link=period.locator('[data-election-amendments] a[href$="#'+a.id+'"]');
        await expect(link).toContainText(a.effective);
        await expect(link).toHaveAttribute("href",prefix+"/countries/hungary/#"+a.id);
      }
    }
  });

  test("Hungarian amendments open within the original act and retain official sources " + (en?"EN":"ZH"),async({page})=>{
    const route=prefix+"/countries/hungary/";
    for (const a of amendments) {
      await page.goto(route+"#"+a.id);
      const act=page.locator("#hu-1989-electoral-act");
      const record=act.locator("#"+a.id);
      await expect(act).toHaveJSProperty("open",true);
      await expect(record).toHaveJSProperty("open",true);
      await expect(record.locator("summary")).toContainText(a.effective);
      await expect(record.locator('a[href="'+a.source+'"]')).toBeVisible();
      await expect(record).toContainText(a===amendments[0]?(en?"top three":"三名"):(en?"more than 5%":"超过 5%"));
    }
    await expect(page.getByText(en?/Other revisions to the electoral act/:/该法其他修订/)).toHaveCount(1);
    await page.goto(prefix+"/politics/hungary/?election=el-hu-ogy-2014-04-06");
    const newer=page.locator('[data-election-period="el-hu-ogy-2014-04-06"]');
    await newer.locator("summary").click();
    await expect(newer.locator("[data-election-amendments]")).toHaveCount(0);
    await expect(newer.locator('a[href$="#hu-1989-electoral-act"]')).toContainText("2012-01-01");
  });
}
