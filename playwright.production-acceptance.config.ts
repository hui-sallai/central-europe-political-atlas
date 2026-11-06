import {defineConfig} from '@playwright/test';
import existing from './playwright.config';
const local=process.env.ATLAS_ACCEPTANCE_BASE_URL;
export default defineConfig({...existing,webServer:local?existing.webServer:undefined,testMatch:'d4-e1-production-acceptance.spec.ts',outputDir:local?'test-results/local-acceptance':'test-results/production-acceptance',use:{...existing.use,baseURL:local??'https://hy-central-europe-analysis.org'},workers:2});
