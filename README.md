# Tina-巴菲特知识库

基于 70 年投资智慧构建的交互式知识库，集成 AI 巴菲特对话助手。

**在线体验**: [buffet.tina-ai.fun](https://buffet.tina-ai.fun)

## 功能

- **知识浏览** — 245 个知识页面，涵盖核心概念、投资公司、关键人物、股东信、访谈演讲
- **全文搜索** — 基于中文多粒度 n-gram 的即时搜索
- **知识图谱** — D3.js 力导向图，可视化 1400+ 条交叉链接
- **AI 巴菲特** — 基于 RAG 检索的流式对话，以巴菲特风格回答投资问题
- **响应式布局** — 适配桌面、平板和手机

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vue Router + Vite |
| 后端 | Express.js + SSE 流式输出 |
| AI | Anthropic Claude API + RAG 检索 |
| 可视化 | D3.js 力导向图 |
| 部署 | Fly.io (Docker) |

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/Tina2088/buffett-wiki.git
cd buffett-wiki/code/web

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 Anthropic API Key

# 生成知识库数据索引
npm run build:data

# 启动开发服务器
npm run dev      # 前端 http://localhost:5173
npm run server   # 后端 http://localhost:3001
```

## 项目结构

```
buffet0410/
├── code/web/              # 全栈应用
│   ├── src/               # Vue 3 前端
│   │   ├── App.vue        # 主布局（响应式侧边栏）
│   │   ├── style.css      # 全局样式
│   │   └── views/         # 页面组件
│   ├── server.js          # Express 后端 + RAG + SSE
│   ├── scripts/           # 数据构建脚本
│   ├── public/data/       # 生成的 JSON 索引
│   ├── Dockerfile         # 多阶段构建
│   └── fly.toml           # Fly.io 部署配置
├── wiki/                  # 知识库源文件 (245 个 Markdown)
│   ├── concepts/          # 核心概念 (49)
│   ├── companies/         # 投资公司 (61)
│   ├── people/            # 关键人物 (7)
│   ├── interviews/        # 访谈演讲 (26)
│   └── letters/           # 股东信 (98)
└── raw/                   # 原始文本资料
```

## 部署

项目已配置 Fly.io 部署：

```bash
cd code/web

# 设置密钥（不要提交到代码）
fly secrets set ANTHROPIC_API_KEY="your-key"

# 部署
fly deploy
```

## License

MIT
