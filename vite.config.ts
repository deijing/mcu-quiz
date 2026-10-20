import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * 把构建产物中的 CSS 内联进 HTML。
 * 站点是单页应用、只有一份 CSS（约 8KB gzip），内联后浏览器拿到 HTML 即可绘制骨架，
 * 省掉一次跨网络往返，首屏在弱网/高延迟网络下明显更快。
 */
function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html
      const cssKey = Object.keys(ctx.bundle).find((key) => key.endsWith('.css'))
      if (!cssKey) return html
      const asset = ctx.bundle[cssKey]
      if (!asset || asset.type !== 'asset') return html

      const css = String(asset.source)
      delete ctx.bundle[cssKey]
      return html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), inlineCssPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
