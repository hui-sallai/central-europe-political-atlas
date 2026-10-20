import { test, expect } from '@playwright/test';
for (const prefix of ['', '/en']) {
    const en = !!prefix;
    const annualName = en ? 'Annual core data' : '年度核心数据', hfName = en ? 'Domestic high-frequency data' : '高频国内数据', macroName = en ? 'Macro-driver data' : '宏观驱动数据';
    test(`high-frequency direct links, refresh and locale changes ${prefix || 'zh'}`, async ({ page }) => {
        await page.goto(`${prefix}/data/?tab=high_frequency`, { waitUntil: 'networkidle' });
        await expect(page.getByRole('tab', { name: hfName, exact: true })).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('[data-monthly-handoff]')).toBeVisible();
        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.getByRole('tab', { name: hfName, exact: true })).toHaveAttribute('aria-selected', 'true');
        await page.goto(`${prefix}/data/?tab=high_frequency&country=czechia&indicator=hicp_monthly_index&from=2025&to=2026&sort=asc&history=0`, { waitUntil: 'networkidle' });
        await page.getByRole('link', { name: en ? '中文' : 'English', exact: true }).click();
        let scope = page.locator('[data-snapshot-scope="high-frequency"]');
        await expect(scope.getByRole('combobox', { name: en ? '国家' : 'Country', exact: true })).toHaveValue('czechia');
        await expect(scope.getByRole('combobox', { name: en ? '指标' : 'Indicator', exact: true })).toHaveValue('hicp_monthly_index');
        await expect(scope.getByRole('combobox', { name: en ? '起始年份' : 'Start year', exact: true })).toHaveValue('2025');
        await expect(scope.getByRole('combobox', { name: en ? '结束年份' : 'End year', exact: true })).toHaveValue('2026');
        expect(new URL(page.url()).searchParams.get('tab')).toBe('high_frequency');
        expect(new URL(page.url()).searchParams.get('history')).toBe('0');
        await page.reload({ waitUntil: 'networkidle' });
        await expect(scope).toBeVisible();
        await page.getByRole('link', { name: en ? 'English' : '中文', exact: true }).click();
        scope = page.locator('[data-snapshot-scope="high-frequency"]');
        await expect(scope.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true })).toHaveValue('czechia');
        await expect(scope.getByRole('combobox', { name: en ? 'Indicator' : '指标', exact: true })).toHaveValue('hicp_monthly_index');
    });
    test(`tab history restores annual and high-frequency selections on back and forward ${prefix || 'zh'}`, async ({ page }) => {
        // Delay initial URL restoration to exercise interaction before hydration settles.
        await page.addInitScript(() => {
            const schedule = window.setTimeout.bind(window);
            Object.defineProperty(window, 'setTimeout', {
                value: (handler: TimerHandler, timeout?: number, ...args: unknown[]) => schedule(handler, timeout === 0 ? 100 : timeout, ...args),
                configurable: true,
                writable: true,
            });
        });
        await page.goto(`${prefix}/data/?tab=annual&country=germany&indicator=real_gdp_growth&from=2021&to=2021`, { waitUntil: 'networkidle' });
        await expect(page.getByRole('tab', { name: annualName, exact: true })).toHaveAttribute('aria-selected', 'true');
        await page.getByRole('tab', { name: hfName, exact: true }).click();
        const scope = page.locator('[data-snapshot-scope="high-frequency"]');
        await expect(scope).toBeVisible();
        await scope.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true }).selectOption('austria');
        await expect(page).toHaveURL(/country=austria/);
        await scope.getByRole('combobox', { name: en ? 'Indicator' : '指标', exact: true }).selectOption('industrial_production_index');
        await scope.getByRole('combobox', { name: en ? 'Start year' : '起始年份', exact: true }).selectOption('2025');
        await scope.getByRole('combobox', { name: en ? 'End year' : '结束年份', exact: true }).selectOption('2026');
        await expect(page).toHaveURL(/tab=high_frequency/);
        expect(new URL(page.url()).searchParams.get('country')).toBe('austria');
        expect(new URL(page.url()).searchParams.get('indicator')).toBe('industrial_production_index');
        expect(new URL(page.url()).searchParams.get('from')).toBe('2025');
        expect(new URL(page.url()).searchParams.get('to')).toBe('2026');
        await page.getByRole('tab', { name: macroName, exact: true }).click();
        await expect(page).toHaveURL(/tab=macro_drivers/);
        await page.goBack();
        await expect(page.getByRole('tab', { name: hfName, exact: true })).toHaveAttribute('aria-selected', 'true');
        await expect(scope.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true })).toHaveValue('austria');
        await expect(scope.getByRole('combobox', { name: en ? 'Indicator' : '指标', exact: true })).toHaveValue('industrial_production_index');
        await expect(scope.getByRole('combobox', { name: en ? 'Start year' : '起始年份', exact: true })).toHaveValue('2025');
        await page.goBack();
        await expect(page.getByRole('tab', { name: annualName, exact: true })).toHaveAttribute('aria-selected', 'true');
        const annual = page.locator('[data-snapshot-scope="annual"]');
        await expect(annual.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true })).toHaveValue('germany');
        await expect(annual.getByRole('combobox', { name: en ? 'Indicator' : '指标', exact: true })).toHaveValue('real_gdp_growth');
        await expect(annual.getByRole('combobox', { name: en ? 'Start year' : '起始年份', exact: true })).toHaveValue('2021');
        await page.goForward();
        await expect(scope).toBeVisible();
        await expect(scope.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true })).toHaveValue('austria');
        await page.goForward();
        await expect(page.getByRole('tab', { name: macroName, exact: true })).toHaveAttribute('aria-selected', 'true');
    });
    test(`same-tab history retains explicit unsupported parameters and restores valid monthly handoff ${prefix || 'zh'}`, async ({ page }) => {
        await page.goto(`${prefix}/data/?tab=high_frequency&country=hungary&indicator=hicp_annual_rate&from=2025&to=2026`, { waitUntil: 'networkidle' });
        const scope = page.locator('[data-snapshot-scope="high-frequency"]');
        await page.evaluate(() => { history.pushState(null, '', location.pathname + '?tab=high_frequency&country=unknown&indicator=cpi&from=bad&to=2026&history=0'); dispatchEvent(new PopStateEvent('popstate')); });
        await expect(scope.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true })).toHaveValue('unknown');
        await expect(scope.getByRole('combobox', { name: en ? 'Indicator' : '指标', exact: true })).toHaveValue('cpi');
        await expect(scope.getByRole('combobox', { name: en ? 'Start year' : '起始年份', exact: true })).toHaveValue('bad');
        const panel = page.locator('[data-monthly-handoff]');
        await panel.locator('summary').click();
        await expect(panel.locator('[data-monthly-entry]')).toHaveCount(0);
        await page.goBack();
        await expect(scope.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true })).toHaveValue('hungary');
        await expect(scope.getByRole('combobox', { name: en ? 'Indicator' : '指标', exact: true })).toHaveValue('hicp_annual_rate');
        await expect(scope.getByRole('combobox', { name: en ? 'Start year' : '起始年份', exact: true })).toHaveValue('2025');
        await panel.getByRole('checkbox', { name: en ? /^Germany/ : /^德国/ }).check();
        await expect(panel.locator('[data-monthly-entry]')).toHaveAttribute('href', /monthly_countries=hungary%2Cgermany/);
        await page.goForward();
        await expect(scope.getByRole('combobox', { name: en ? 'Country' : '国家', exact: true })).toHaveValue('unknown');
        await expect(scope.getByRole('combobox', { name: en ? 'Indicator' : '指标', exact: true })).toHaveValue('cpi');
        await expect(panel.locator('[data-monthly-entry]')).toHaveCount(0);
    });
}
