import {test,expect} from '@playwright/test';
import {researchCountries,researchEvents,getEventsForCountry} from '../../src/lib/researchData';
import {newsTranslations} from '../../src/lib/newsTranslations';
import {englishText} from '../../src/i18n/reviewedText';
test('English home uses approved titles with unchanged event identity; map country selections stay interactive',async({page},info)=>{
 await page.goto('/en/',{waitUntil:'networkidle'});
 const latest=researchEvents.filter(e=>e.data_status==='verified').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
 const cards=page.locator('[aria-labelledby="english-verified-events"] article');await expect(cards).toHaveCount(6);
 for(let i=0;i<latest.length;i++){const event=latest[i];await expect(cards.nth(i).locator('h3')).toHaveText(newsTranslations[event.id].title);await expect(cards.nth(i).locator('h3 a')).toHaveAttribute('href',`/en/news/?country=${event.country_slug}#${event.id}`);await expect(cards.nth(i)).toContainText(event.date);}
 await expect(page.locator('[data-latest-signals-meta]')).toContainText('News batch through: 2026-10-18');
 await expect(page.locator('[aria-labelledby="english-verified-events"]')).not.toContainText('Chinese; untranslated');
 await page.locator('[aria-labelledby="english-verified-events"]').screenshot({path:info.outputPath('english-recent-events.png')});
 for(const country of researchCountries){const event=getEventsForCountry(country.slug).find(e=>e.data_status==='verified')!;await page.locator('.home-country-selector').getByRole('button',{name:country.iso2,exact:true}).click();const link=page.locator('.home-latest-event a');await expect(link).toContainText(newsTranslations[event.id].title);await expect(link).toHaveAttribute('href',new RegExp(`country=${country.slug}#${event.id}$`));}
 await cards.first().locator('h3 a').click();const event=latest[0];await expect(page.locator(`article[id="${event.id}"] h3`)).toHaveText(newsTranslations[event.id].title);
});
test('Event Library explains mixed-language fields and preserves untranslated archive and source links',async({page})=>{
 const original=researchEvents.find(e=>e.data_status==='verified'&&!newsTranslations[e.id])!;
 await page.goto(`/en/news/?country=${original.country_slug}&from=${original.date}&to=${original.date}`,{waitUntil:'networkidle'});
 await expect(page.locator('[data-event-language-note]')).toContainText('Coverage varies across the archive and by field');
 const card=page.locator(`article[id="${original.id}"]`);await expect(card.locator('h3')).toHaveText(original.title);await expect(card).toContainText('Original title (Chinese; approved English unavailable)');await expect(card.locator('h3')).toHaveAttribute('lang','zh-CN');
 if(original.source_url)await expect(card.locator(`a[href="${original.source_url}"]`)).toHaveCount(1);
 const translated=researchEvents.find(e=>e.data_status==='verified'&&newsTranslations[e.id]&&englishText(e.topic)!==e.topic)!;
 await page.goto(`/en/news/?country=${translated.country_slug}&from=${translated.date}&to=${translated.date}`,{waitUntil:'networkidle'});
 const current=page.locator(`article[id="${translated.id}"]`);await expect(current.locator('h3')).toHaveText(newsTranslations[translated.id].title);await expect(current).toContainText(englishText(translated.topic));await expect(current).not.toContainText('Original title (Chinese');
});
test('Chinese homepage recent-event titles and dates stay unchanged',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});const latest=researchEvents.filter(e=>e.data_status==='verified').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
 for(const event of latest)await expect(page.locator(`.latest-signals-grid a[href*="#${event.id}"]`)).toHaveText(event.title);
});
