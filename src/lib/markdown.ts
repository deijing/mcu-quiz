import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * 渲染 AI 返回的 Markdown。
 * 先交给 marked 转 HTML，再用 DOMPurify 清洗，避免模型输出注入脚本。
 */
export function renderMarkdown(source: string): string {
  if (!source.trim()) return '';
  const html = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}
