import {defineConfig} from 'vite';
import vinext from 'vinext';
import {cloudflare} from '@cloudflare/vite-plugin';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  plugins: [
    vinext(),
    cloudflare({
      configPath: 'wrangler.standalone.json',
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr']
      },
      persistState: {path: '.wrangler/state'},
      inspectorPort: false
    })
  ]
});
