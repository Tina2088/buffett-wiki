<template>
  <!-- 密码验证 -->
  <div v-if="!authenticated" class="auth-overlay">
    <div class="auth-card">
      <div class="auth-icon">🔐</div>
      <h2 class="auth-title">访问密码</h2>
      <p class="auth-desc">请输入访问密码以使用 AI 巴菲特</p>
      <div class="auth-input-wrap">
        <input
          v-model="password"
          type="password"
          class="auth-input"
          placeholder="请输入密码"
          @keydown.enter="checkPassword"
          autofocus
        />
      </div>
      <div v-if="authError" class="auth-error">密码错误，请重试</div>
      <button class="auth-btn" @click="checkPassword">确认进入</button>
    </div>
  </div>

  <!-- 对话页面 -->
  <div v-else class="chat-container">
    <div class="hero" style="margin-bottom: 0;">
      <div class="hero-title" style="font-size: 24px;">AI 巴菲特</div>
      <div class="hero-subtitle" style="font-size: 14px;">基于知识库回答投资哲学、公司分析与人生建议</div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div v-if="!messages.length" style="text-align: center; padding: 60px 0;">
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.8;">🎩</div>
        <p style="color: var(--text-secondary); margin-bottom: 6px;">你好，我是 AI 巴菲特。</p>
        <p style="color: var(--text-tertiary); font-size: 13px;">
          试试问：「什么是护城河？」「你为什么投资可口可乐？」「投资中最重要的品质是什么？」
        </p>
      </div>

      <div v-for="(msg, i) in messages" :key="i" :class="['chat-message', msg.role]">
        <div :class="['chat-avatar', msg.role]">{{ msg.role === 'ai' ? '🎩' : '👤' }}</div>
        <div class="chat-bubble" v-html="msg.html || msg.content"></div>
      </div>
    </div>

    <div class="chat-input-area">
      <input
        v-model="input"
        class="chat-input"
        placeholder="问巴菲特一个问题..."
        @keydown.enter="send"
        :disabled="loading"
      />
      <button class="chat-send" @click="send" :disabled="loading || !input.trim()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt()
const messages = ref([])
const input = ref('')
const loading = ref(false)
const messagesContainer = ref(null)

const authenticated = ref(false)
const password = ref('')
const authError = ref(false)

function checkPassword() {
  if (password.value === 'win@2021') {
    authenticated.value = true
    authError.value = false
  } else {
    authError.value = true
    password.value = ''
  }
}

async function send() {
  if (!input.value.trim() || loading.value) return
  const question = input.value.trim()
  messages.value.push({ role: 'user', content: question })
  input.value = ''
  loading.value = true
  await scrollToBottom()

  // 先插入"思考中..."占位，流式填充
  messages.value.push({ role: 'ai', content: '', html: '<span style="color:var(--text-tertiary)">思考中...</span>' })
  const idx = messages.value.length - 1

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    if (!resp.ok) throw new Error('API error')

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = JSON.parse(line.slice(6))
        if (data.text) {
          fullText += data.text
          messages.value[idx] = { role: 'ai', content: fullText, html: md.render(fullText) }
          await scrollToBottom()
        }
      }
    }
  } catch {
    messages.value[idx] = {
      role: 'ai',
      content: '抱歉，暂时无法回答。',
      html: '<p style="color:var(--text-secondary)">抱歉，暂时无法回答。请确保后端服务正在运行。</p>',
    }
  }
  loading.value = false
  await scrollToBottom()
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}
</script>

<style scoped>
.auth-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
}

.auth-card {
  text-align: center;
  padding: 48px 40px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 380px;
  width: 100%;
}

.auth-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.auth-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.auth-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.auth-input-wrap {
  margin-bottom: 12px;
}

.auth-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  text-align: center;
  letter-spacing: 2px;
  transition: border-color 0.2s;
}

.auth-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59, 125, 216, 0.1);
}

.auth-error {
  font-size: 13px;
  color: var(--color-letter);
  margin-bottom: 12px;
}

.auth-btn {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

@media (max-width: 768px) {
  .auth-card { padding: 32px 24px; margin: 0 16px; }
  .auth-overlay { min-height: calc(100vh - 120px); }
  .chat-container { height: calc(100vh - 120px); }
}
</style>
