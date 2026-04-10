<template>
  <div class="app">
    <!-- 移动端顶栏 -->
    <header class="mobile-header">
      <button class="menu-btn" @click="sidebarOpen = true">
        <span class="menu-icon"></span>
      </button>
      <router-link to="/" class="mobile-logo">📚 巴菲特知识库</router-link>
    </header>

    <!-- 遮罩 -->
    <div class="sidebar-overlay" :class="{ active: sidebarOpen }" @click="sidebarOpen = false"></div>

    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <router-link to="/" class="logo" @click="sidebarOpen = false">
          <span class="logo-icon">📚</span>
          Tina-巴菲特知识库
        </router-link>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" @click="sidebarOpen = false">
          <span>🏠 知识库首页</span>
        </router-link>

        <div class="nav-group">
          <span class="nav-label">索引</span>
          <router-link to="/category/concepts" class="nav-item" @click="sidebarOpen = false">
            <span>💡 核心概念</span>
            <span class="nav-count">49</span>
          </router-link>
          <router-link to="/category/companies" class="nav-item" @click="sidebarOpen = false">
            <span>🏢 投资公司</span>
            <span class="nav-count">61</span>
          </router-link>
          <router-link to="/category/people" class="nav-item" @click="sidebarOpen = false">
            <span>👤 关键人物</span>
            <span class="nav-count">7</span>
          </router-link>
        </div>

        <div class="nav-group">
          <span class="nav-label">来源</span>
          <router-link to="/category/interviews" class="nav-item" @click="sidebarOpen = false">
            <span>🎤 访谈与演讲</span>
            <span class="nav-count">26</span>
          </router-link>
          <router-link to="/category/letters" class="nav-item" @click="sidebarOpen = false">
            <span>✉️ 股东信</span>
            <span class="nav-count">98</span>
          </router-link>
        </div>

        <div class="nav-group">
          <span class="nav-label">工具</span>
          <router-link to="/graph" class="nav-item" @click="sidebarOpen = false">
            <span>🕸️ 知识图谱</span>
          </router-link>
        </div>
      </nav>

      <!-- AI 巴菲特固定在底部 -->
      <div class="sidebar-bottom">
        <router-link to="/chat" class="nav-ai" @click="sidebarOpen = false">
          <span class="nav-ai-icon">🧑‍💼</span>
          <span class="nav-ai-text">AI 巴菲特</span>
          <span class="nav-ai-badge">NEW</span>
        </router-link>
      </div>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const sidebarOpen = ref(false)
</script>
