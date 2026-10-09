# AI模块配置指南

## 1. 概述

AI模块支持多种AI提供商，包括：
- 智谱AI (BigModel) - 默认
- DeepSeek
- OpenAI
- 通义千问 (Qwen)

## 2. 获取API密钥

你需要从相应的AI提供商网站获取API密钥：

- **智谱AI**: https://open.bigmodel.cn/
- **DeepSeek**: https://platform.deepseek.com/
- **OpenAI**: https://platform.openai.com/
- **通义千问**: https://dashscope.aliyun.com/

## 3. 配置API密钥

### 方法1：前端配置（推荐）

1. 打开AI聊天页面：http://localhost:8008/ai
2. 点击左侧边栏的「⚙️ API配置」按钮
3. 在弹出的配置窗口中：
   - 选择AI提供商
   - 输入API密钥
   - 选择模型名称
   - （可选）设置API地址（默认已填写）
   - （可选）填写AI角色设定
   - （可选）勾选是否启用笔记搜索功能
4. 点击「保存」按钮

### 方法2：环境变量配置

你可以通过设置环境变量来配置AI密钥。在项目目录下创建一个 `.env` 文件，内容如下：

```
# 智谱AI
BIGMODEL_API_KEY=your_bigmodel_api_key

# 或 DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key

# 或 OpenAI
OPENAI_API_KEY=your_openai_api_key

# 或 通义千问
QWEN_API_KEY=your_qwen_api_key

# 默认AI提供商
DEFAULT_AI_PROVIDER=bigmodel

# 默认AI性格设定
DEFAULT_AI_PERSONA=你是一个友好的AI助手...
```

## 4. 设置AI性格

AI性格设定（Persona）是一段描述AI行为和特点的文本，它会影响AI的回答风格。

### 示例性格设定：

```
你是一个友好、耐心的AI助手，总是以温暖的语气回答问题。你擅长倾听，能够理解用户的情感，并给予积极的回应。
```

```
你是一个专业的编程导师，擅长用简洁明了的语言解释复杂的技术概念。你注重代码质量和最佳实践，总是给出详细的解释和示例。
```

### 设置方法：

1. 在API配置窗口中，找到「AI 角色设定」输入框
2. 输入你想要的性格描述
3. 点击「保存」按钮

## 5. 使用AI模块

1. 打开AI聊天页面：http://localhost:8008/ai
2. 在输入框中输入你的问题或请求
3. 点击发送按钮或按回车键
4. 等待AI的响应

## 6. 功能说明

- **流式响应**: AI回答会实时显示，不需要等待整个回答生成完成
- **笔记搜索**: 你可以选择是否让AI搜索你的笔记内容，以提供更相关的回答
- **多提供商支持**: 你可以随时切换不同的AI提供商
- **个性化设定**: 通过AI性格设定，你可以定制AI的回答风格

## 7. 常见问题

### Q: AI没有响应怎么办？
A: 请检查：
1. API密钥是否正确
2. 网络连接是否正常
3. AI提供商的服务是否正常

### Q: 如何更改AI提供商？
A: 在API配置窗口中选择不同的提供商，然后保存设置。

### Q: 可以同时使用多个AI提供商吗？
A: 目前一次只能使用一个AI提供商，但你可以随时切换。

## 8. 技术支持

如果遇到问题，请检查浏览器控制台的错误信息，或查看服务器日志。
