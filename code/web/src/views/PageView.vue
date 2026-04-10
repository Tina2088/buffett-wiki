<template>
  <div v-if="loading" style="padding: 60px 0; text-align: center; color: var(--text-tertiary);">加载中...</div>
  <div v-else class="page-detail">
    <!-- 面包屑 -->
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb-sep">/</span>
      <router-link :to="'/category/' + category">{{ categoryLabel }}</router-link>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">{{ pageTitle }}</span>
    </div>

    <!-- 页面头部卡片 -->
    <div class="page-header">
      <div class="page-header-badge" :class="'badge-' + category">{{ categoryLabel }}</div>
      <h1 class="page-header-title">{{ pageTitle }}</h1>
      <div v-if="pageMeta.date" class="page-header-meta">
        <span>{{ pageMeta.date }}</span>
      </div>
    </div>

    <!-- 摘要正文 -->
    <div class="page-content">
      <div class="markdown-body" v-html="html"></div>
    </div>

    <!-- 原文全文（仅信件和访谈） -->
    <div v-if="hasRawText" class="raw-section">
      <div class="raw-header" @click="showRaw = !showRaw">
        <span class="raw-header-icon">{{ showRaw ? '▼' : '▶' }}</span>
        <span class="raw-header-title">📄 原文全文</span>
        <span class="raw-header-hint">{{ showRaw ? '收起' : '展开阅读完整原文' }}</span>
      </div>
      <div v-if="showRaw" class="raw-content">
        <div class="markdown-body" v-html="rawHtml"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'

const props = defineProps(['category', 'slug'])
const route = useRoute()
const router = useRouter()
const html = ref('')
const rawHtml = ref('')
const loading = ref(true)
const pageTitle = ref('')
const category = ref('')
const pageMeta = ref({})
const hasRawText = ref(false)
const showRaw = ref(false)

const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

const categoryLabels = {
  concepts: '核心概念', companies: '投资公司', people: '关键人物',
  interviews: '访谈与演讲', letters: '股东信', insights: '洞察'
}
const categoryLabel = ref('')

function renderWikiLinks(text) {
  return text.replace(/\[\[(.+?)\]\]/g, (_, name) => {
    return `<span class="wiki-link" data-link="${name}">${name}</span>`
  })
}

// 根据 wiki source 字段推断 raw 文件路径
function rawUrlFromSource(source) {
  // source 格式如 "raw/interviews/xxx.md" 或 "raw/letters/berkshire/xxx.md"
  if (!source) return null
  // 去掉开头的 raw/ 得到相对路径
  const rel = source.replace(/^raw\//, '')
  return `/data/raw/${rel}`
}

async function loadPage() {
  loading.value = true
  showRaw.value = false
  hasRawText.value = false
  rawHtml.value = ''

  const cat = props.category || route.params.category
  const slug = props.slug || route.params.slug
  category.value = cat
  categoryLabel.value = categoryLabels[cat] || cat

  try {
    const resp = await fetch(`/data/pages/${cat}/${decodeURIComponent(slug)}.md`)
    if (!resp.ok) throw new Error('Not found')
    let text = await resp.text()

    // 提取 frontmatter
    const titleMatch = text.match(/^title:\s*"?(.+?)"?\s*$/m)
    const dateMatch = text.match(/^date:\s*(.+)$/m)
    const sourceMatch = text.match(/^source:\s*"?(.+?)"?\s*$/m)
    pageTitle.value = titleMatch ? titleMatch[1] : decodeURIComponent(slug)
    pageMeta.value = {
      date: dateMatch ? dateMatch[1].trim() : '',
      source: sourceMatch ? sourceMatch[1].trim() : '',
    }

    // 去掉 frontmatter
    if (text.startsWith('---')) {
      const parts = text.split('---')
      if (parts.length >= 3) text = parts.slice(2).join('---')
    }

    // 去掉重复的一级标题
    text = text.replace(/^#\s+.+\n*/m, '')

    text = renderWikiLinks(text)
    html.value = md.render(text)

    // 加载原文（仅信件和访谈）
    if ((cat === 'interviews' || cat === 'letters') && pageMeta.value.source) {
      const rawUrl = rawUrlFromSource(pageMeta.value.source)
      if (rawUrl) {
        try {
          const rawResp = await fetch(rawUrl)
          if (rawResp.ok) {
            let rawText = await rawResp.text()
            // 去掉 frontmatter（如果有）
            if (rawText.startsWith('---')) {
              const parts = rawText.split('---')
              if (parts.length >= 3) rawText = parts.slice(2).join('---')
            }
            // 去掉 Source 和 Type 行
            rawText = rawText.replace(/^>\s*\*\*Source\*\*.*\n?/m, '')
            rawText = rawText.replace(/^>\s*\*\*Type\*\*.*\n?/m, '')
            rawHtml.value = md.render(rawText)
            hasRawText.value = true
          }
        } catch {
          // 原文不可用，不显示
        }
      }
    }
  } catch {
    html.value = '<p style="color: var(--text-secondary);">页面未找到</p>'
  }
  loading.value = false
}

onMounted(() => {
  loadPage()
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('wiki-link')) {
      navigateToEntity(e.target.dataset.link)
    }
  })
})

watch(() => route.params, loadPage)

async function navigateToEntity(name) {
  const index = await fetch('/data/wiki-index.json').then(r => r.json())
  const page = index.find(p => p.title === name)
  if (page) {
    const slug = page.path.replace(/\.md$/, '').split('/').pop()
    router.push(`/page/${page.category}/${encodeURIComponent(slug)}`)
  }
}
</script>

<style scoped>
.page-detail {
  max-width: 780px;
}

.breadcrumb-sep {
  margin: 0 6px;
  color: var(--text-tertiary);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

.page-header {
  padding: 28px 32px;
  background: linear-gradient(135deg, #191D2B 0%, #1E2438 50%, #252D45 100%);
  border: 1px solid #2A3050;
  border-radius: var(--radius-lg);
  margin-bottom: 24px;
}

.page-header-badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 12px;
}

.badge-concepts { background: rgba(59, 125, 216, 0.15); color: #7AAFEA; }
.badge-companies { background: rgba(71, 149, 106, 0.15); color: #7EC996; }
.badge-people { background: rgba(197, 150, 27, 0.15); color: #D4C06A; }
.badge-interviews { background: rgba(126, 95, 173, 0.15); color: #B99ADB; }
.badge-letters { background: rgba(194, 96, 74, 0.15); color: #E08A7A; }

.page-header-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #FFFFFF;
  margin: 0;
}

.page-header-meta {
  margin-top: 8px;
  font-size: 13px;
  color: #8B8FA4;
}

.page-content {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 32px;
  margin-bottom: 20px;
}

/* 原文区域 */
.raw-section {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 20px;
}

.raw-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.raw-header:hover {
  background: var(--sidebar-hover);
}

.raw-header-icon {
  font-size: 12px;
  color: var(--text-tertiary);
  width: 16px;
}

.raw-header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.raw-header-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-left: auto;
}

.raw-content {
  padding: 32px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-light);
  max-height: 80vh;
  overflow-y: auto;
}

.raw-content::-webkit-scrollbar {
  width: 5px;
}

.raw-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

/* Markdown 增强 */
.page-content :deep(h2),
.raw-content :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 32px 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
}

.page-content :deep(h2:first-child),
.raw-content :deep(h2:first-child) {
  margin-top: 0;
}

.page-content :deep(h3),
.raw-content :deep(h3) {
  font-size: 17px;
  font-weight: 600;
  margin: 24px 0 12px;
  color: var(--text-primary);
}

.page-content :deep(p),
.raw-content :deep(p) {
  margin: 0 0 16px;
  line-height: 1.8;
  color: var(--text-primary);
}

.page-content :deep(blockquote),
.raw-content :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding: 14px 20px;
  margin: 20px 0;
  background: rgba(0, 122, 255, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.8;
}

.page-content :deep(ul),
.page-content :deep(ol),
.raw-content :deep(ul),
.raw-content :deep(ol) {
  padding-left: 24px;
  margin: 12px 0 16px;
}

.page-content :deep(li),
.raw-content :deep(li) {
  margin: 6px 0;
  line-height: 1.7;
}

.page-content :deep(table),
.raw-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 20px 0;
  font-size: 14px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.page-content :deep(th),
.raw-content :deep(th) {
  background: var(--bg-secondary);
  font-weight: 600;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 2px solid var(--border);
}

.page-content :deep(td),
.raw-content :deep(td) {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
}

.page-content :deep(.wiki-link) {
  color: var(--accent);
  cursor: pointer;
  font-weight: 500;
  padding: 1px 2px;
  border-radius: 3px;
  transition: all 0.15s;
}

.page-content :deep(.wiki-link:hover) {
  color: var(--accent-hover);
  background: rgba(0, 122, 255, 0.06);
}

@media (max-width: 768px) {
  .page-detail { max-width: 100%; }
  .page-header { padding: 20px; }
  .page-header-title { font-size: 22px; }
  .page-content { padding: 20px; }
  .raw-content { padding: 20px; }
}
</style>
