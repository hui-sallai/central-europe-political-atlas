import {test,expect} from '@playwright/test';
import {researchCountries,researchEvents,getEventsForCountry} from '../../src/lib/researchData';
import {newsTranslations} from '../../src/lib/newsTranslations';
import {englishText} from '../../src/i18n/reviewedText';
test('approved English events remain traceable in country profiles and the archive, outside the minimal homepage',async({page},info)=>{
 await page.goto('/en/');await expect(page.locator('[aria-labelledby="english-verified-events"],.home-latest-event')).toHaveCount(0);for(const country of researchCountries){await page.goto(`/en/countries/${country.slug}/`);const event=getEventsForCountry(country.slug).find(e=>e.data_status==='verified')!;const link=page.locator(`a[href="/en/news/?country=${country.slug}#${event.id}"]`);await expect(link).toHaveText(newsTranslations[event.id]?.title??event.title);}
 await page.goto('/en/news/');await expect(page.locator('[data-latest-signals-meta]')).toContainText('News batch through: 2026-11-11');await page.screenshot({path:info.outputPath('english-event-archive.png')});
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
test('Chinese event records and dates remain unchanged in the archive',async({page})=>{
 await page.goto('/');await expect(page.locator('.latest-signals-grid')).toHaveCount(0);const event=researchEvents.filter(e=>e.data_status==='verified').sort((a,b)=>b.date.localeCompare(a.date))[0];await page.goto(`/news/?country=${event.country_slug}&from=${event.date}&to=${event.date}`);await expect(page.locator(`article[id="${event.id}"] h3`)).toHaveText(event.title);
});
