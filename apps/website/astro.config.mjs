import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://marketmiam.fr',
  outDir: '../../dist/apps/website',
  integrations: [sitemap()],
});
