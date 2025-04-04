import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/viz-jiaf/',
  plugins: [
    svelte()
  ],
  resolve: {
    alias: {
      "pages": path.resolve("./src/pages")
    }
  }
})
