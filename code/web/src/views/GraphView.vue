<template>
  <div>
    <div class="hero">
      <div class="hero-title">知识图谱</div>
      <div class="hero-subtitle">{{ nodes.length }} 个节点 · {{ edges.length }} 条连接 · 点击节点查看详情</div>
    </div>

    <!-- 图例 -->
    <div style="display: flex; gap: 16px; margin-bottom: 16px; font-size: 13px;">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3B7DD8;margin-right:4px;"></span>概念</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#47956A;margin-right:4px;"></span>公司</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#C5961B;margin-right:4px;"></span>人物</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#7E5FAD;margin-right:4px;"></span>访谈</span>
    </div>

    <div
      ref="graphContainer"
      class="graph-canvas"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as d3 from 'd3'

const router = useRouter()
const graphContainer = ref(null)
const nodes = ref([])
const edges = ref([])

const colorMap = {
  concept: '#3B7DD8',
  company: '#47956A',
  person: '#C5961B',
  'interview-summary': '#7E5FAD',
  'letter-summary': '#C2604A',
  unknown: '#6C7293',
}

onMounted(async () => {
  const data = await fetch('/data/graph.json').then(r => r.json())
  nodes.value = data.nodes
  edges.value = data.edges

  const index = await fetch('/data/wiki-index.json').then(r => r.json())
  const pageMap = {}
  for (const p of index) pageMap[p.title] = p

  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight

  const nodeIds = new Set(data.nodes.map(n => n.id))
  const validEdges = data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(validEdges).id(d => d.id).distance(60))
    .force('charge', d3.forceManyBody().strength(-80))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(12))

  const svg = d3.select(graphContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  const g = svg.append('g')
  svg.call(d3.zoom().scaleExtent([0.2, 5]).on('zoom', (e) => {
    g.attr('transform', e.transform)
  }))

  const link = g.append('g')
    .selectAll('line')
    .data(validEdges)
    .join('line')
    .attr('stroke', '#E5E5EA')
    .attr('stroke-width', 0.5)

  const node = g.append('g')
    .selectAll('circle')
    .data(data.nodes)
    .join('circle')
    .attr('r', d => d.type === 'unknown' ? 3 : 6)
    .attr('fill', d => colorMap[d.type] || '#D2D2D7')
    .attr('stroke', '#FFFFFF')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      const page = pageMap[d.id]
      if (page) {
        const slug = page.path.replace(/\.md$/, '').split('/').pop()
        router.push(`/page/${page.category}/${encodeURIComponent(slug)}`)
      }
    })
    .call(d3.drag()
      .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    )

  const label = g.append('g')
    .selectAll('text')
    .data(data.nodes.filter(n => n.type !== 'unknown'))
    .join('text')
    .text(d => d.id)
    .attr('font-size', 9)
    .attr('font-family', '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif')
    .attr('dx', 9)
    .attr('dy', 3)
    .attr('fill', '#86868B')

  node.append('title').text(d => d.id)

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
    node.attr('cx', d => d.x).attr('cy', d => d.y)
    label.attr('x', d => d.x).attr('y', d => d.y)
  })
})
</script>

<style scoped>
.graph-canvas {
  width: 100%;
  height: calc(100vh - 200px);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

@media (max-width: 768px) {
  .graph-canvas {
    height: calc(100vh - 180px);
  }
}
</style>
