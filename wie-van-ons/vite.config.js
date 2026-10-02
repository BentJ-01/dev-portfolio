import { defineConfig } from 'vite';

// Relatieve base: de build werkt onder elk pad (bv. https://bentj.be/wie-van-ons/).
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
});
