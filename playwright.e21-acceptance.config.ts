import {defineConfig} from '@playwright/test';
import acceptance from './playwright.production-acceptance.config';
export default defineConfig({...acceptance,testMatch:'e21-production-acceptance.spec.ts',outputDir:'test-results/e21-production-acceptance'});
