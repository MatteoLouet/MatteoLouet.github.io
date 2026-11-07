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
    // Pré-compile ces dépendances au démarrage du serveur de dev : sans cela, la première visite
    // d'une page qui les importe déclenche une ré-optimisation (« Outdated Optimize Dep ») et casse l'hydratation.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'recharts', 'motion/react', 'd3-array', 'd3-scale', 'd3-shape', 'clsx', 'tailwind-merge'],
    },
    resolve: { alias: { '@': fileURLToPath(new URL('./src/fd001', import.meta.url)) } },
  },
});
