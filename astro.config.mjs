import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Adresse publique : GitHub Pages, dépôt MatteoLouet.github.io (voir .github/workflows/deploy.yml)
export default defineConfig({
  site: 'https://matteolouet.github.io',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [react()],
  vite: {
    // Tailwind ne sert qu'au site C-MAPSS embarqué (src/fd001), voir src/fd001/fd001.css
    plugins: [tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src/fd001', import.meta.url)) } },
  },
});
