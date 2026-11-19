import {expect,test} from "@playwright/test";

test("German and Romanian chambers can be compared without combining Romanian seat slots",async({page})=>{
  await page.goto("/en/politics/germany/");
  const panel=page.locator("[data-comparison-picker]");
  await panel.getByLabel("Compare with country").selectOption("romania");
  const choose=panel.getByRole("combobox",{name:"Election",exact:true});
  await expect(choose).toHaveValue("");
  await choose.selectOption("el-ro-s-2024-12-01");
  const senate=panel.locator('[data-comparison-column="romania"]');
  await expect(senate).toContainText("Senat");
  await expect(senate).toContainText(/134 assigned seats\s*\/ 136 seat slots/);
  await expect(senate.getByRole("link")).toHaveAttribute("href",/election=el-ro-s-2024-12-01/);
  await page.reload();
  await expect(choose).toHaveValue("el-ro-s-2024-12-01");
  await choose.selectOption("el-ro-cd-2024-12-01");
  await expect(senate).toContainText("Camera Deputaților");
  await page.goBack();
  await expect(choose).toHaveValue("el-ro-s-2024-12-01");
});

test("Croatian constituency selection is explicit in Chinese comparisons",async({page})=>{
  await page.goto("/politics/austria/?election=el-at-nr-2024-09-29&compare_country=croatia&compare_election=el-hr-sabor-2024-04-17");
  const panel=page.locator("[data-comparison-picker]");
  const side=panel.locator('[data-comparison-column="croatia"]');
  const ballot=panel.getByLabel("比较选票范围");
  await expect(ballot).toHaveValue("");
  await ballot.selectOption("hr-ie-11");
  await expect(side.getByRole("link")).toHaveAttribute("href",/ballot=hr-ie-11/);
  await expect(side).toContainText(/席位占比分母\s*·\s*3 席/);
  await side.locator("summary").click();
  await expect(side.locator("tbody tr").first()).toBeVisible();
  await expect(panel.locator('[data-comparison-column="austria"]')).toContainText("Nationalrat");
});

test("ten-country comparison file includes published results for each chamber and no national Croatian share",async({request})=>{
  const response=await request.get("/politics-comparison.json");
  expect(response.ok()).toBeTruthy();
  const data=await response.json();
  expect(Object.keys(data)).toHaveLength(10);
  expect(data.romania).toHaveLength(8);
  const latest=data.croatia.find((r:{date:string})=>r.date==="2024-04-17");
  expect(latest.ballots.map((b:{id:string})=>b.id)).not.toContain("national");
  const senate=data.romania.find((r:{id:string})=>r.id==="el-ro-s-2024-12-01");
  expect([senate.seats,senate.slots]).toEqual([134,136]);
});
