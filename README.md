# AI PPT Editor

基于现代技术栈构建的AI驱动的PPT编辑器，支持与AI对话来编辑演示文稿。

## 技术栈

### 前端
- **React 18** + **TypeScript** - 现代React开发
- **Vite** - 快速构建工具
- **TailwindCSS** - 实用优先的CSS框架
- **Zustand** - 轻量级状态管理
- **React Query** - 服务端状态管理
- **Lucide React** - 图标库

### 后端
- **Node.js** + **Express** + **TypeScript** - 后端API服务
- **Vercel AI SDK** - AI集成
- **OpenAI/Anthropic** - AI模型支持
- **Zod** - 类型验证
- **fs-extra** - 文件操作

## 功能特性

### 核心功能
- 🤖 **AI聊天助手** - 与AI对话来编辑PPT
- 📱 **现代界面** - 左侧聊天，右侧预览的分栏布局
- 🖼️ **实时预览** - 多张幻灯片网格预览
- ✏️ **在线编辑** - AI驱动的内容编辑
- 💾 **自动保存** - 编辑后自动保存到文件

### AI功能
- 📝 **内容编辑** - AI理解指令修改幻灯片内容
- 🎨 **样式调整** - 保持或修改CSS样式
- ✨ **内容生成** - AI生成新的幻灯片内容
- 🔄 **智能对话** - 上下文感知的AI助手

### 界面功能
- 🔍 **缩放控制** - 50%-200%缩放预览
- 📋 **批量选择** - 支持多选幻灯片操作
- 🎯 **当前页面** - 高亮显示当前编辑的幻灯片
- ⚡ **流式响应** - AI回复实时显示

## 快速开始

### 1. 安装依赖

```bash
# 安装所有依赖
npm run setup
```

### 2. 配置环境变量

在 `backend/` 目录创建 `.env` 文件：

```env
# AI Provider Configuration
OPENAI_API_KEY=your_openai_api_key_here
# 或者
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Slides Configuration (相对于backend/src的路径)
SLIDES_DIR=../slides
```

### 3. 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:3001
```

## API接口

### Slides API

```bash
GET    /api/slides           # 获取所有幻灯片
GET    /api/slides/:index    # 获取特定幻灯片内容
PUT    /api/slides/:index    # 更新幻灯片内容
POST   /api/slides           # 创建新幻灯片
DELETE /api/slides/:index    # 删除幻灯片
```

### AI API

```bash
GET  /api/ai/models          # 获取可用的AI模型
POST /api/ai/chat            # AI聊天对话
POST /api/ai/edit-slide      # AI编辑幻灯片
POST /api/ai/generate-slide  # AI生成新幻灯片
```

## 项目结构

```
ai-editor/
├── package.json                 # 根package.json
├── frontend/                    # React前端
│   ├── src/
│   │   ├── components/         # React组件
│   │   │   ├── ChatPanel.tsx   # 聊天面板
│   │   │   ├── PreviewPanel.tsx # 预览面板
│   │   │   └── SlidePreview.tsx # 单个幻灯片预览
│   │   ├── hooks/              # React Hooks
│   │   │   ├── useSlides.ts    # 幻灯片数据管理
│   │   │   └── useAI.ts        # AI功能集成
│   │   ├── stores/             # Zustand状态管理
│   │   │   └── useAppStore.ts  # 全局应用状态
│   │   ├── types/              # TypeScript类型定义
│   │   ├── utils/              # 工具函数
│   │   └── App.tsx             # 主应用组件
│   ├── vite.config.ts          # Vite配置
│   └── tailwind.config.js      # Tailwind配置
└── backend/                     # Node.js后端
    ├── src/
    │   ├── routes/             # API路由
    │   │   ├── slides.ts       # 幻灯片管理API
    │   │   └── ai.ts           # AI功能API
    │   └── index.ts            # 服务器入口
    ├── tsconfig.json           # TypeScript配置
    └── .env.example            # 环境变量示例
```

## 使用方法

### 基本使用

1. 启动应用后，左侧显示AI聊天界面，右侧显示幻灯片预览
2. 与AI聊天，例如："帮我修改第1张幻灯片的标题"
3. AI会理解你的需求并执行相应操作
4. 修改会自动保存到对应的HTML文件中

### AI对话示例

```
用户: 帮我修改第一张幻灯片，把标题改成"欢迎使用AI编辑器"
AI: 我来帮你修改第一张幻灯片的标题...

用户: 创建一张关于技术架构的新幻灯片
AI: 我来为你创建一张技术架构的幻灯片...

用户: 把第二张幻灯片的背景色改成蓝色
AI: 我来修改第二张幻灯片的背景色...
```

## 兼容性

- 与现有的html-slide-player框架完全兼容
- 支持现有的slides.js配置格式
- 保持1280x720的幻灯片尺寸标准
- 维护现有的CSS样式规范

## 开发说明

### 添加新的AI功能

在 `backend/src/routes/ai.ts` 中添加新的路由：

```typescript
router.post('/new-feature', async (req, res) => {
  // 新的AI功能实现
});
```

### 添加新的UI组件

在 `frontend/src/components/` 中创建新组件：

```typescript
export const NewComponent: React.FC = () => {
  // 组件实现
};
```

### 状态管理

使用Zustand进行全局状态管理，在 `useAppStore.ts` 中添加新状态：

```typescript
interface AppState {
  newState: SomeType;
  setNewState: (value: SomeType) => void;
}
```

## 许可证

MIT License