# 🚀 启动 AI PPT Editor

## 前提条件
确保使用 Node.js 20+ 版本：

```bash
# 检查当前版本
node --version

# 如果不是 20+，使用 fnm 切换
fnm use 20
# 或
fnm use latest
```

## 快速启动

### 1. 配置环境变量
```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，添加你的AI API密钥：
```env
# OpenAI (推荐)
OPENAI_API_KEY=your_openai_api_key_here

# 或 Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. 安装依赖
```bash
npm run setup
```

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 访问应用
- 前端：http://localhost:3000
- 后端API：http://localhost:3001

## 🎯 功能测试

1. **查看现有幻灯片** - 右侧应该显示来自 `../slides/` 的幻灯片预览
2. **AI聊天** - 左侧输入："帮我创建一张关于技术架构的新幻灯片"
3. **编辑幻灯片** - 点击任意幻灯片的"编辑"按钮，然后在聊天中说："把标题改成新标题"
4. **缩放预览** - 使用右上角的放大/缩小按钮

## 🔧 独立启动（调试用）

```bash
# 仅启动前端
npm run dev:frontend

# 仅启动后端  
npm run dev:backend
```

## 📝 注意
- 确保 `../slides/` 目录存在且包含 `slides.js` 配置文件
- AI功能需要网络连接和有效的API密钥
- 修改的幻灯片会自动保存到对应的HTML文件中