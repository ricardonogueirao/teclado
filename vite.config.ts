import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the built app run from any sub-path, such as GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
});
