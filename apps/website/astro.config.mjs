import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://marketmiam.fr',
  outDir: '../../dist/apps/website',
  integrations: [
    sitemap({
      // Archived CGU versions (/cgu/2026-09 …) are frozen files kept so a vendor
      // can retrieve the version they accepted. They must never be submitted for
      // indexing: they would compete with the version in force. Permanent rule.
      //
      // `/cgu` itself is excluded only while it is a draft — remove that clause
      // when VERSION.date is set in cgu.astro.
      filter: (page) => !/\/cgu(\/|$)/.test(new URL(page).pathname),
    }),
  ],
});
