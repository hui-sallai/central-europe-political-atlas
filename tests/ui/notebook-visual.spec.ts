import fs from "node:fs";
import { test,expect } from "@playwright/test";
for(const locale of ["zh-CN","en"] as const)test(`notebook visual ${locale}`,async({page},info)=>{
  await page.goto(locale==="en"?"/en/notebook/":"/notebook/",{waitUntil:"networkidle"});await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:"*, *::before, *::after { transition: none !important; animation: none !important; }"});
  for(const scheme of ["light","dark"] as const){await page.emulateMedia({colorScheme:scheme});await expect(page.locator("html")).toHaveAttribute("data-theme",scheme);const name=`notebook-${locale}-${scheme}.png`;if(!fs.existsSync(info.snapshotPath(name))&&info.config.updateSnapshots==="none")throw Error(`Missing deliberate notebook baseline ${name}`);await expect(page).toHaveScreenshot(name,{fullPage:true});}
});
