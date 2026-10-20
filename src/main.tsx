import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 生产环境注册 Service Worker：首次访问后台缓存，后续访问秒开、断网可用。
// 放到页面加载完成后再注册，避免和首屏资源抢带宽。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 注册失败不影响正常使用
      })
    }

    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback

    if (idle) {
      idle(register, { timeout: 3000 })
    } else {
      window.setTimeout(register, 1500)
    }
  })
}
