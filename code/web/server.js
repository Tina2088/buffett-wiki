import express from 'express'
import cors from 'cors'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'public', 'data')

const app = express()
app.use(cors())
app.use(express.json())

// --- 启动时预加载索引和图谱 ---

const wikiIndex = JSON.parse(readFileSync(join(DATA_DIR, 'wiki-index.json'), 'utf-8'))
const graphData = JSON.parse(readFileSync(join(DATA_DIR, 'graph.json'), 'utf-8'))

// 构建邻接表：title → 关联的 titles
const neighbors = {}
for (const edge of graphData.edges) {
  if (!neighbors[edge.source]) neighbors[edge.source] = new Set()
  if (!neighbors[edge.target]) neighbors[edge.target] = new Set()
  neighbors[edge.source].add(edge.target)
  neighbors[edge.target].add(edge.source)
}

// 构建 title → index entry 的映射
const indexByTitle = {}
for (const entry of wikiIndex) {
  indexByTitle[entry.title] = entry
}

console.log(`索引加载完成: ${wikiIndex.length} 页, ${graphData.edges.length} 条关联`)

// --- 智能检索 ---

function searchRelevant(question, maxPages = 6) {
  // 阶段 1：中文友好的多粒度匹配
  const q = question.toLowerCase()

  // 提取 2-4 字的滑动窗口作为中文"关键词"
  const ngrams = new Set()
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= q.length - len; i++) {
      const gram = q.slice(i, i + len)
      if (!/^\s+$/.test(gram)) ngrams.add(gram)
    }
  }
  // 也保留空格分割的完整词（处理英文）
  for (const w of q.split(/\s+/).filter(w => w.length >= 2)) {
    ngrams.add(w)
  }

  const scored = wikiIndex.map(entry => {
    let score = 0
    const title = entry.title.toLowerCase()
    const summary = (entry.summary || '').toLowerCase()

    // 标题完全包含在问题中 → 高分
    if (q.includes(title)) score += 50
    // 问题包含在标题中
    if (title.includes(q)) score += 40

    for (const gram of ngrams) {
      // 标题匹配权重高
      if (title.includes(gram)) score += 8
      // 摘要匹配
      if (summary.includes(gram)) score += 3
    }

    // links（关联概念）匹配
    if (entry.links) {
      for (const link of entry.links) {
        if (q.includes(link.toLowerCase())) score += 6
      }
    }

    return { ...entry, score }
  })

  // 阶段 2：取 top 命中，再通过图谱扩展关联页面
  const directHits = scored
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  // 图谱扩展：直接命中的页面的邻居中，选得分最高的补充
  const hitTitles = new Set(directHits.map(p => p.title))
  const expandCandidates = new Map()
  for (const hit of directHits) {
    const nb = neighbors[hit.title]
    if (!nb) continue
    for (const nbTitle of nb) {
      if (hitTitles.has(nbTitle) || expandCandidates.has(nbTitle)) continue
      const entry = indexByTitle[nbTitle]
      if (entry) {
        // 邻居自身也要跟问题有一定相关性
        const s = scored.find(s => s.title === nbTitle)
        if (s && s.score > 0) {
          expandCandidates.set(nbTitle, { ...entry, score: s.score, expanded: true })
        }
      }
    }
  }

  const expanded = [...expandCandidates.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages - directHits.length)

  return [...directHits, ...expanded]
}

// 读取 wiki 页面内容
function loadPageContent(entry) {
  const filePath = join(DATA_DIR, 'pages', entry.path)
  if (!existsSync(filePath)) return null
  let text = readFileSync(filePath, 'utf-8')
  // 去掉 frontmatter
  if (text.startsWith('---')) {
    const parts = text.split('---')
    if (parts.length >= 3) text = parts.slice(2).join('---')
  }
  return text.trim()
}

// --- API 端点 ---

app.post('/api/chat', async (req, res) => {
  const { question } = req.body
  if (!question) return res.status(400).json({ error: '请提供问题' })

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
  const baseURL = process.env.ANTHROPIC_BASE_URL || undefined
  if (!apiKey) {
    return res.status(500).json({ error: '未配置 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN' })
  }

  try {
    const relevant = searchRelevant(question)
    console.log(`[检索] 问题: "${question}" → 命中 ${relevant.length} 页:`, relevant.map(r => r.title))

    // 构建上下文：读取精炼的 wiki 页面
    let context = ''
    const sources = []
    if (relevant.length > 0) {
      context = '以下是知识库中与问题相关的内容：\n\n'
      for (const entry of relevant) {
        const content = loadPageContent(entry)
        if (!content) continue
        sources.push(entry.title)
        // wiki 页面本身就是精炼摘要，取合理长度
        const excerpt = content.slice(0, 3000)
        context += `--- ${entry.title} (${entry.category}) ---\n${excerpt}\n\n`
      }
    }

    const client = new Anthropic({ apiKey, ...(baseURL && { baseURL }) })

    // SSE 流式输出
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = client.messages.stream({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `你是"AI 巴菲特"——一个基于巴菲特知识库的智能助手。你应当：

1. 用巴菲特的思维方式和语言风格回答问题
2. 尽可能引用巴菲特在股东信和访谈中的原话
3. 回答要有深度，不要泛泛而谈
4. 在适当时引用具体的信件年份或访谈场合
5. 如果知识库中没有相关信息，坦诚说明
6. 使用中文回答

${context}`,
      messages: [{ role: 'user', content: question }],
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`)
    res.end()
  } catch (err) {
    console.error('Chat API error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// --- 生产环境：托管前端静态文件 ---

app.use(express.static(join(__dirname, 'dist')))

// SPA fallback：非 API 路由返回 index.html（Vue Router history 模式）
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// --- 启动 ---

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`巴菲特知识库 API 服务启动: http://localhost:${PORT}`)
})
