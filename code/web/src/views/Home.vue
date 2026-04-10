<template>
  <div>
    <!-- Hero + 迷你图谱 -->
    <div class="home-hero">
      <div class="home-hero-text">
        <div class="hero-title">Tina-巴菲特知识库</div>
        <div class="hero-subtitle">70年投资智慧，{{ totalPages }} 个知识页面，{{ graphStats.edges.toLocaleString() }} 条交叉链接</div>
        <div class="hero-actions">
          <router-link to="/chat" class="hero-btn hero-btn-primary">🧑‍💼 问 AI 巴菲特</router-link>
          <router-link to="/graph" class="hero-btn hero-btn-secondary">🕸️ 探索知识图谱</router-link>
        </div>
      </div>
      <div class="home-hero-graph" ref="miniGraph"></div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card" @click="$router.push('/category/letters')">
        <div class="stat-main"><span class="stat-icon">✉️</span><span class="stat-number">98</span></div>
        <div class="stat-label">封股东信</div>
      </div>
      <div class="stat-card" @click="$router.push('/category/concepts')">
        <div class="stat-main"><span class="stat-icon">💡</span><span class="stat-number">{{ stats.concepts }}</span></div>
        <div class="stat-label">核心概念</div>
      </div>
      <div class="stat-card" @click="$router.push('/category/companies')">
        <div class="stat-main"><span class="stat-icon">🏢</span><span class="stat-number">{{ stats.companies }}</span></div>
        <div class="stat-label">投资公司</div>
      </div>
      <div class="stat-card" @click="$router.push('/category/interviews')">
        <div class="stat-main"><span class="stat-icon">🎤</span><span class="stat-number">{{ stats.interviews }}</span></div>
        <div class="stat-label">访谈演讲</div>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input
        v-model="query"
        class="search-input search-input-home"
        placeholder="搜索概念、公司、人物、信件..."
        @input="search"
      />
    </div>
    <div v-if="results.length" class="card search-results">
      <ul class="entity-list">
        <li v-for="r in results" :key="r.path" class="entity-item" @click="goTo(r)">
          <span class="entity-item-title">{{ r.title }}</span>
          <span :class="'tag tag-' + tagType(r.type)">{{ typeLabel(r.type) }}</span>
        </li>
      </ul>
    </div>

    <!-- 核心概念 TOP 15 -->
    <div class="section-block section-concept" style="margin-top: 24px;">
      <div class="section-header">
        <h2 class="section-title">核心投资概念</h2>
        <span class="section-badge">TOP 15</span>
      </div>
      <div class="chip-grid">
        <div v-for="c in topConcepts" :key="c.title" class="chip" @click="goTo(c)">
          <span class="chip-name">{{ c.title }}</span>
          <span class="chip-num chip-num-concept">{{ c.linkCount }}</span>
        </div>
      </div>
    </div>

    <!-- 重要公司 TOP 15 -->
    <div class="section-block section-company">
      <div class="section-header">
        <h2 class="section-title">重要公司</h2>
        <span class="section-badge">TOP 15</span>
      </div>
      <div class="chip-grid">
        <div v-for="c in topCompanies" :key="c.title" class="chip" @click="goTo(c)">
          <span class="chip-name">{{ c.title }}</span>
          <span class="chip-num chip-num-company">{{ c.linkCount }}</span>
        </div>
      </div>
    </div>

    <!-- 关键人物 — 头像卡片 -->
    <div class="card">
      <div class="card-title">👤 关键人物</div>
      <div class="people-grid">
        <div
          v-for="p in peopleList"
          :key="p.title"
          class="people-card"
          @click="goTo(p)"
        >
          <div class="people-avatar" :style="{ background: avatarColor(p.title) }">
            {{ p.title.charAt(0) }}
          </div>
          <div class="people-name">{{ p.title }}</div>
          <div class="people-refs">{{ p.linkCount }} 次引用</div>
        </div>
      </div>
    </div>

    <!-- 时间线概览 -->
    <div class="card">
      <div class="card-title">📅 时间线 <span class="card-title-sub">信件与访谈分布</span></div>
      <div class="timeline">
        <div class="timeline-labels">
          <span>1956</span><span>1970</span><span>1985</span><span>2000</span><span>2015</span><span>2025</span>
        </div>
        <div class="timeline-bar">
          <div
            v-for="d in timelineDots"
            :key="d.year + d.type + d.title"
            class="timeline-dot"
            :class="'timeline-dot-' + d.type"
            :style="{ left: timelinePos(d.year) }"
            :title="d.title"
          ></div>
        </div>
        <div class="timeline-legend">
          <span class="timeline-legend-item"><span class="tl-dot" style="background:#007AFF"></span>合伙人信</span>
          <span class="timeline-legend-item"><span class="tl-dot" style="background:#34C759"></span>伯克希尔股东信</span>
          <span class="timeline-legend-item"><span class="tl-dot" style="background:#AF52DE"></span>访谈演讲</span>
          <span class="timeline-legend-item"><span class="tl-dot" style="background:#FF9500"></span>特别信件</span>
        </div>
      </div>
    </div>

    <!-- 快速导航 -->
    <div class="card">
      <div class="card-title">🚀 快速导航</div>
      <div class="quick-nav">
        <router-link to="/graph" class="quick-btn"><span class="quick-btn-icon">🕸️</span> 知识图谱</router-link>
        <router-link to="/chat" class="quick-btn"><span class="quick-btn-icon">🧑‍💼</span> AI 巴菲特</router-link>
        <router-link to="/category/concepts" class="quick-btn"><span class="quick-btn-icon">💡</span> 全部概念</router-link>
        <router-link to="/category/companies" class="quick-btn"><span class="quick-btn-icon">🏢</span> 全部公司</router-link>
        <router-link to="/category/interviews" class="quick-btn"><span class="quick-btn-icon">🎤</span> 全部访谈</router-link>
        <router-link to="/category/letters" class="quick-btn"><span class="quick-btn-icon">✉️</span> 全部股东信</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as d3 from 'd3'

const router = useRouter()
const pages = ref([])
const graph = ref({ nodes: [], edges: [] })
const query = ref('')
const results = ref([])
const miniGraph = ref(null)

const totalPages = computed(() => pages.value.length)

const stats = computed(() => {
  const s = { concepts: 0, companies: 0, people: 0, interviews: 0, letters: 0 }
  for (const p of pages.value) {
    if (s[p.category] !== undefined) s[p.category]++
  }
  return s
})

const graphStats = computed(() => ({
  nodes: graph.value.nodes.length,
  edges: graph.value.edges.length,
}))

function linkCounts() {
  const counts = {}
  for (const e of graph.value.edges) {
    counts[e.target] = (counts[e.target] || 0) + 1
  }
  return counts
}

const topConcepts = computed(() => {
  const counts = linkCounts()
  return pages.value
    .filter(p => p.category === 'concepts')
    .map(p => ({ ...p, linkCount: counts[p.title] || 0 }))
    .sort((a, b) => b.linkCount - a.linkCount)
    .slice(0, 15)
})

const maxConceptCount = computed(() => topConcepts.value[0]?.linkCount || 1)

const topCompanies = computed(() => {
  const counts = linkCounts()
  return pages.value
    .filter(p => p.category === 'companies')
    .map(p => ({ ...p, linkCount: counts[p.title] || 0 }))
    .sort((a, b) => b.linkCount - a.linkCount)
    .slice(0, 15)
})

const maxCompanyCount = computed(() => topCompanies.value[0]?.linkCount || 1)

const peopleList = computed(() => {
  const counts = linkCounts()
  return pages.value
    .filter(p => p.category === 'people')
    .map(p => ({ ...p, linkCount: counts[p.title] || 0 }))
    .sort((a, b) => b.linkCount - a.linkCount)
})

const timelineDots = computed(() => {
  const dots = []
  for (const p of pages.value) {
    const year = parseInt(p.date)
    if (!year || year < 1950 || year > 2030) continue
    let type = 'berkshire'
    if (p.category === 'interviews') type = 'interview'
    else if (p.tags && p.tags.includes('合伙人信')) type = 'partnership'
    else if (p.tags && p.tags.includes('特别信件')) type = 'special'
    else if (p.category !== 'letters') continue
    dots.push({ year, type, title: p.title })
  }
  return dots
})

function barWidth(count, max) {
  return Math.max(4, (count / max) * 100) + '%'
}

function timelinePos(year) {
  return Math.min(98, Math.max(2, ((year - 1956) / (2025 - 1956)) * 100)) + '%'
}

function avatarColor(name) {
  const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA', '#FF2D55']
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % colors.length
  return colors[hash]
}

function search() {
  if (!query.value.trim()) { results.value = []; return }
  const q = query.value.toLowerCase()
  results.value = pages.value
    .filter(p => p.title.toLowerCase().includes(q) || (p.summary && p.summary.toLowerCase().includes(q)))
    .slice(0, 10)
}

function goTo(page) {
  const slug = page.path.replace(/\.md$/, '').split('/').pop()
  router.push(`/page/${page.category}/${encodeURIComponent(slug)}`)
}

function tagType(t) {
  if (t === 'interview-summary') return 'interview'
  return t
}

function typeLabel(t) {
  const m = { concept: '概念', company: '公司', person: '人物', 'interview-summary': '访谈', 'letter-summary': '信件' }
  return m[t] || t
}

async function renderMiniGraph() {
  await nextTick()
  if (!miniGraph.value || !graph.value.nodes.length) return
  const el = miniGraph.value
  const width = el.clientWidth
  const height = el.clientHeight
  const nodeIds = new Set(graph.value.nodes.map(n => n.id))
  const validEdges = graph.value.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
  const nodesCopy = graph.value.nodes.map(n => ({ ...n }))
  const edgesCopy = validEdges.map(e => ({ ...e }))
  const colorMap = { concept: '#568DE5', company: '#5DB87E', person: '#D4AF37', 'interview-summary': '#9B7ED0', 'letter-summary': '#E0785F', unknown: '#4A5070' }
  const svg = d3.select(el).append('svg').attr('width', width).attr('height', height).style('background', 'transparent')
  const g = svg.append('g')
  const simulation = d3.forceSimulation(nodesCopy)
    .force('link', d3.forceLink(edgesCopy).id(d => d.id).distance(20).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-15))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(4))
  g.append('g').selectAll('line').data(edgesCopy).join('line')
    .attr('stroke', 'rgba(255,255,255,0.08)').attr('stroke-width', 0.3)
  g.append('g').selectAll('circle').data(nodesCopy).join('circle')
    .attr('r', d => d.type === 'unknown' ? 1.5 : 3)
    .attr('fill', d => colorMap[d.type] || '#4A5070').attr('fill-opacity', 0.85)
  simulation.on('tick', () => {
    g.selectAll('line').attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y)
    g.selectAll('circle').attr('cx', d => d.x).attr('cy', d => d.y)
  })
  setTimeout(() => simulation.stop(), 4000)
}

onMounted(async () => {
  pages.value = await fetch('/data/wiki-index.json').then(r => r.json())
  graph.value = await fetch('/data/graph.json').then(r => r.json())
  renderMiniGraph()
})
</script>

<style scoped>
.home-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #191D2B 0%, #1E2438 50%, #252D45 100%);
  border-radius: 16px;
  border: 1px solid #2A3050;
  margin-bottom: 16px;
  overflow: hidden;
  color: #D1D5E4;
}
.home-hero-text { flex: 1; min-width: 0; }
.home-hero-graph { width: 240px; height: 150px; flex-shrink: 0; border-radius: 12px; overflow: hidden; opacity: 0.9; background: transparent; }
.hero-title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: #FFFFFF; }
.hero-subtitle { font-size: 13px; color: #7B82A0; margin-top: 4px; }
.hero-actions { display: flex; gap: 10px; margin-top: 14px; }
.hero-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 22px; font-size: 14px; font-weight: 500; transition: all 0.25s ease; text-decoration: none; }
.hero-btn-primary { background: var(--gold); color: #191D2B; }
.hero-btn-primary:hover { background: #D4A520; color: #191D2B; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(197,150,27,0.35); }
.hero-btn-secondary { background: rgba(255,255,255,0.06); color: #D1D5E4; border: 1px solid rgba(255,255,255,0.1); }
.hero-btn-secondary:hover { background: rgba(255,255,255,0.12); color: #FFFFFF; transform: translateY(-1px); }

.search-wrapper { position: relative; margin-bottom: 8px; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none; }
.search-input-home { padding-left: 40px; }
.search-results { margin-top: 8px; padding: 8px; }
.card-title-sub { font-size: 12px; font-weight: 400; color: var(--text-tertiary); margin-left: 8px; }

.bar-chart,.bar-row,.bar-label,.bar-track,.bar-fill,.bar-fill-concept,.bar-fill-company,.bar-value { display: none; }

/* 区块 — 米色背景卡片 */
.section-block {
  padding: 28px 28px 24px;
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}

.section-concept {
  background: #F7F3EC;
}

.section-company {
  background: #F0F4EF;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 18px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.section-concept .section-title { color: #8B6914; }
.section-company .section-title { color: #3D7A52; }

.section-badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
}

/* Chip 胶囊 */
.chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #FFFFFF;
  border: 1px solid #E0DCD5;
  border-radius: 22px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  border-color: #CCC8BF;
}

.chip-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.chip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
}

.chip-num-concept { background: #B8922A; }
.chip-num-company { background: #47956A; }

.people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.people-card { display: flex; flex-direction: column; align-items: center; padding: 20px 12px; background: var(--bg-secondary); border-radius: var(--radius-md); cursor: pointer; transition: all 0.25s ease; }
.people-card:hover { background: var(--accent-light); transform: translateY(-3px); box-shadow: var(--shadow-md); }
.people-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 10px; }
.people-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.people-refs { font-size: 11px; color: var(--text-tertiary); }

.timeline { padding: 8px 0; }
.timeline-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px; padding: 0 4px; }
.timeline-bar { position: relative; height: 32px; background: var(--bg-secondary); border-radius: 16px; overflow: hidden; }
.timeline-dot { position: absolute; top: 50%; width: 8px; height: 8px; border-radius: 50%; transform: translate(-50%,-50%); transition: all 0.2s; cursor: pointer; }
.timeline-dot:hover { transform: translate(-50%,-50%) scale(2); z-index: 10; }
.timeline-dot-partnership { background: #007AFF; }
.timeline-dot-berkshire { background: #34C759; }
.timeline-dot-interview { background: #AF52DE; }
.timeline-dot-special { background: #FF9500; }
.timeline-legend { display: flex; gap: 16px; margin-top: 10px; font-size: 11px; color: var(--text-secondary); }
.timeline-legend-item { display: flex; align-items: center; gap: 4px; }
.tl-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

/* 响应式 */
@media (max-width: 768px) {
  .home-hero {
    flex-direction: column;
    padding: 20px;
  }
  .home-hero-graph { display: none; }
  .hero-title { font-size: 20px; }
  .hero-subtitle { font-size: 12px; }
  .hero-actions { flex-direction: column; gap: 8px; }
  .hero-btn { justify-content: center; padding: 10px 16px; font-size: 13px; }

  .section-block { padding: 18px 16px; }
  .section-title { font-size: 18px; }
  .chip { padding: 6px 12px; }
  .chip-name { font-size: 13px; }

  .people-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .people-card { padding: 14px 8px; }
  .people-avatar { width: 40px; height: 40px; font-size: 16px; }
  .people-name { font-size: 12px; }

  .timeline-legend { flex-wrap: wrap; gap: 8px; }
}
</style>
