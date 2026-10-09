document.addEventListener('DOMContentLoaded', async function() {
    // 定义服务器的默认端口
    const SERVER_PORT = 8008;

    // 变量定义
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const saveNoteButton = document.getElementById('save-note-button');

    const typingIndicator = document.getElementById('typing-indicator');
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const historyList = document.getElementById('history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const mainContent = document.getElementById('main-content');

    // 新增变量
    const settingsTrigger = document.getElementById('settings-trigger');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const clearSettings = document.getElementById('clear-settings');
    const saveSettings = document.getElementById('save-settings');
    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const apiModelInput = document.getElementById('model-name');

    // 添加API设置按钮变量
    const apiSettingsBtn = document.getElementById('api-settings-btn');
    
    // 新增模型参数相关元素
    const providerSelect = document.getElementById('provider-select');
    const temperatureInput = document.getElementById('temperature');
    const maxTokensInput = document.getElementById('max-tokens');
    const personaInput = document.getElementById('persona');
    const searchNotesCheckbox = document.getElementById('search-notes');

    // 在变量定义部分添加
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // 添加用于控制流式响应的变量
    let currentReader = null;
    let isGenerating = false;
    
    // 选择模式相关变量
    let isSelectMode = false;
    let selectedMessages = [];

    // 添加知识库相关变量
    const knowledgeBtn = document.getElementById('knowledge-btn');
    const knowledgeModal = document.getElementById('knowledge-modal');
    const closeKnowledge = document.getElementById('close-knowledge');
    const knowledgeForm = document.getElementById('knowledge-form');
    const knowledgeList = document.getElementById('knowledge-list');
    const searchKnowledgeBtn = document.getElementById('search-knowledge-btn');
    const knowledgeSearchInput = document.getElementById('knowledge-search-input');

    // 添加笔记搜索相关变量
    const searchNotesTrigger = document.getElementById('search-notes-trigger');
    const searchNotesBtn = document.getElementById('search-notes-btn'); // 侧边栏中的搜索笔记按钮
    const searchNotesSubmitBtn = document.getElementById('search-notes-submit-btn'); // 弹窗中的搜索按钮
    const notesSearchModal = document.getElementById('notes-search-modal');
    const closeNotesSearch = document.getElementById('close-notes-search');
    const notesSearchInput = document.getElementById('notes-search-input');
    const notesSearchResults = document.getElementById('notes-search-results');

    // 检查元素是否存在再添加事件监听器
    if (clearHistoryBtn) {
        // 添加清除历史函数
        function clearCurrentConversation() {
            const conversation = conversations.find(c => c.id === currentConversationId);
            if (conversation) {
                conversation.messages = conversation.messages.filter(m => m.sender === 'bot' && m.text.includes('你好！我是你的聊天搭子'));
                chatMessages.innerHTML = '';

                // 保留欢迎消息
                const welcomeMessage = "你好！我是你的聊天搭子。你可以跟我说说你的感受和想法，我会认真倾听并给予温暖的回应。今天有什么想分享的吗？";
                addMessage(welcomeMessage, 'bot');

                // 更新历史列表
                // renderHistoryList();
            }
        }

        // 添加事件监听
        clearHistoryBtn.addEventListener('click', clearCurrentConversation);
    }

    // 加载保存的设置
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('llmSettings')) || {};
        apiUrlInput.value = settings.apiUrl || '';
        apiKeyInput.value = settings.apiKey || '';
        providerSelect.value = settings.provider || 'bigmodel'; // 默认使用智谱
        // temperatureInput.value = settings.temperature || 0.7;
        // maxTokensInput.value = settings.maxTokens || 2048;
        personaInput.value = settings.persona || '';
        searchNotesCheckbox.checked = settings.searchNotes || false;

        // 加载模型列表
        const provider = providerSelect.value || 'bigmodel';
        loadModels(provider).then(() => {
            // 设置模型选择
            apiModelInput.value = settings.modelName || '';
        });
    }

    // 保存设置
    function saveSettingsToStorage() {
        const settings = {
            apiUrl: apiUrlInput.value.trim(),
            apiKey: apiKeyInput.value.trim(),
            modelName: apiModelInput.value, // 这里改为直接获取选择框的值
            provider: providerSelect.value || 'bigmodel', // 确保有默认提供商
            // temperature: parseFloat(temperatureInput.value) || 0.7,
            // maxTokens: parseInt(maxTokensInput.value) || 2048,
            persona: personaInput.value.trim(),
            searchNotes: searchNotesCheckbox.checked
        };
        localStorage.setItem('llmSettings', JSON.stringify(settings));
    }

    // 清除设置
    function clearSettingsFromStorage() {
        localStorage.removeItem('llmSettings');
        apiUrlInput.value = '';
        apiKeyInput.value = '';
        providerSelect.value = 'bigmodel'; // 重置为默认提供商
        temperatureInput.value = 0.7;
        maxTokensInput.value = 2048;
        personaInput.value = '';
        searchNotesCheckbox.checked = false;

        // 重新加载默认提供商的模型
        loadModels('bigmodel').then(() => {
            // 设置默认模型
            if (apiModelInput.options.length > 1) {
                apiModelInput.selectedIndex = 1; // 选择第一个实际模型（跳过"请选择模型"选项）
            }
        });
    }

    // 从后端API获取提供商列表并填充下拉框
    async function loadProviders() {
        try {
            const response = await fetch(`http://localhost:${SERVER_PORT}/api/list_providers`);
            if (response.ok) {
                const providers = await response.json();
                providerSelect.innerHTML = ''; // 清空现有选项

                providers.forEach(provider => {
                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = provider.name;
                    if (provider.id === 'bigmodel') {
                        option.textContent += ' (默认)';
                    }
                    providerSelect.appendChild(option);
                });

                // 获取默认提供商（智谱AI）
                const defaultProvider = 'bigmodel';

                // 加载默认提供商的模型列表
                loadModels(defaultProvider);

                // 设置默认提供商为选中状态
                providerSelect.value = defaultProvider;
            } else {
                console.error('获取提供商列表失败');
                // 出错时使用默认选项
                providerSelect.innerHTML = `
                    <option value="bigmodel">智谱AI (默认)</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="qwen">通义千问</option>
                `;
                // 加载默认提供商的模型列表
                loadModels('bigmodel');
                // 设置默认提供商为选中状态
                providerSelect.value = 'bigmodel';
            }
        } catch (error) {
            console.error('加载提供商列表时出错:', error);
            // 出错时使用默认选项
            providerSelect.innerHTML = `
                <option value="bigmodel">智谱AI (默认)</option>
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
                <option value="qwen">通义千问</option>
            `;
            // 加载默认提供商的模型列表
            loadModels('bigmodel');
            // 设置默认提供商为选中状态
            providerSelect.value = 'bigmodel';
        }
    }

    // 从后端API获取模型列表并填充datalist
    async function loadModels(provider) {
        // 如果没有提供提供商，使用默认提供商
        const actualProvider = provider || 'bigmodel';
        // 获取datalist元素
        const modelOptions = document.getElementById('model-options');

        try {
            const response = await fetch(`http://localhost:${SERVER_PORT}/api/list_models?provider=${actualProvider}`);
            if (response.ok) {
                const models = await response.json();
                modelOptions.innerHTML = ''; // 清空现有选项

                // 添加实际的模型选项到datalist
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    modelOptions.appendChild(option);
                });

                // 如果有保存的设置，设置模型名称
                const settings = JSON.parse(localStorage.getItem('llmSettings')) || {};
                if (settings.modelName) {
                    apiModelInput.value = settings.modelName;
                } else if (models.length > 0) {
                    // 默认选择第一个模型
                    apiModelInput.value = models[0].id;
                }

                // 确保模型输入框可编辑
                apiModelInput.disabled = false;
            } else {
                console.error('获取模型列表失败');
                // 清空datalist
                modelOptions.innerHTML = '';
                // 模型输入框仍可手动输入
                apiModelInput.disabled = false;
            }
        } catch (error) {
            console.error('加载模型列表时出错:', error);
            // 清空datalist
            modelOptions.innerHTML = '';
            // 模型输入框仍可手动输入
            apiModelInput.disabled = false;
        }
    }

    // 当提供商改变时，加载对应的模型列表
    if (providerSelect) {
        providerSelect.addEventListener('change', function() {
            // 如果提供商没有选择，使用默认提供商（智谱AI）
            const provider = this.value || 'bigmodel';

            // 加载对应的模型列表
            loadModels(provider);

            // 启用模型选择框
            apiModelInput.disabled = false;
        });
    }

    // 切换设置弹窗
    function toggleSettingsModal() {
        settingsModal.classList.toggle('active');
        if (settingsModal.classList.contains('active')) {
            loadSettings();
            loadProviders(); // 加载提供商列表
            // 加载模型列表后，确保模型选择框可以输入
            if (apiModelInput) {
                apiModelInput.removeAttribute('disabled');
            }
        }
    }

    // 事件监听
    if (settingsTrigger) {
        settingsTrigger.addEventListener('click', toggleSettingsModal);
    }
    if (apiSettingsBtn) {
        apiSettingsBtn.addEventListener('click', toggleSettingsModal);
    }
    if (closeSettings) {
        closeSettings.addEventListener('click', toggleSettingsModal);
    }
    if (clearSettings) {
        clearSettings.addEventListener('click', clearSettingsFromStorage);
    }
    if (saveSettings) {
        saveSettings.addEventListener('click', function() {
            saveSettingsToStorage();
            toggleSettingsModal();
            showNotification('设置已保存', 'info');
            toggleSidebar()
            // alert('设置已保存！');
        });
    }

    // 点击弹窗外部关闭
    if (settingsModal) {
        settingsModal.addEventListener('click', function(e) {
            if (e.target === settingsModal) {
                toggleSettingsModal();
            }
        });
    }

    // 对话历史数据
    let conversations = [];
    let currentConversationId = null;

    // 初始化 - 创建一个默认对话
    createNewConversation();

    // 自动调整输入框高度
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // 切换侧边栏
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleSidebar);
    }
    if (closeSidebar) {
        closeSidebar.addEventListener('click', toggleSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        mainContent.classList.toggle('sidebar-open');
    }

    // 创建新对话
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            createNewConversation();
            toggleSidebar();
        });
    }

    // 显示通知函数
    function showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
        `;

        // 根据类型设置背景色
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        // 添加到页面
        document.body.appendChild(notification);

        // 触发动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 添加消息到聊天界面
    function addMessage(text, sender) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container', sender);

        const avatar = document.createElement('div');
        avatar.classList.add('avatar', `${sender}-avatar`);
        avatar.textContent = sender === 'user' ? '你' : 'AI';
        messageContainer.appendChild(avatar);

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // 使用Markdown解析器处理文本
        const messageContent = document.createElement('div');
        messageContent.innerHTML = renderMarkdown(text);
        messageDiv.appendChild(messageContent);

        const timeDiv = document.createElement('div');
        timeDiv.classList.add('message-time');

        const now = new Date();
        timeDiv.textContent = formatTime(now);
        messageDiv.appendChild(timeDiv);

        messageContainer.appendChild(messageDiv);
        chatMessages.appendChild(messageContainer);
        

    }

    // 格式化时间
    function formatTime(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes}`;
    }

    // 创建新对话
    function createNewConversation() {
        const newConversation = {
            id: Date.now().toString(),
            title: '新对话 ' + (conversations.length + 1),
            messages: [],
            createdAt: new Date()
        };

        currentConversationId = newConversation.id;
        conversations.unshift(newConversation);

        // 清空聊天界面
        chatMessages.innerHTML = '';

        // 添加欢迎消息
        const welcomeMessage = "你好！今天感觉如何呀？我永远是你忠实的倾听者。无论是想分享一缕阳光，还是倒一倒心里的雨，我都在这里。你的快乐、烦恼或任何小思绪，我都愿意安静地听你说。"
        addMessage(welcomeMessage, 'bot');
        newConversation.messages.push({
            text: welcomeMessage,
            sender: 'bot',
            time: new Date()
        });

        // 更新历史列表
        // renderHistoryList();

        // 设置第一个消息为标题
        setTimeout(() => {
            updateConversationTitle(newConversation.id, welcomeMessage);
        }, 100);
    }

    // 更新当前对话
    function updateCurrentConversation(text, sender) {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (conversation && (sender == 'user' || sender == 'bot')) {
            conversation.messages.push({
                text: text,
                sender: sender,
                time: new Date()
            });

            // 如果是用户的第一条消息，更新对话标题
            if (sender === 'user' && conversation.messages.filter(m => m.sender === 'user').length === 1) {
                updateConversationTitle(conversation.id, text);
            }
        }
    }

    async function generateResponse(userMessage) {
        const currentConversation = conversations.find(c => c.id === currentConversationId);
        if (!currentConversation) return "系统错误：找不到当前对话";

        // 获取保存的设置
        const settings = JSON.parse(localStorage.getItem('llmSettings')) || {};

        try {
            const response = await fetch(`http://localhost:${SERVER_PORT}/api/stream_generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: currentConversation.messages,
                    base_url: settings.apiUrl || undefined,
                    api_key: settings.apiKey || undefined,
                    model: settings.modelName || undefined,
                    provider: settings.provider || undefined,
                    persona: settings.persona,
                    search_notes: settings.searchNotes,
                    new_message: userMessage,
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            currentReader = response.body.getReader();
            const decoder = new TextDecoder();
            let solution = '';
            let responseText = '';
            let currentField = '';
            let buffer = ''; // 用于存储不完整的行

            while (true) {
                // 检查是否需要停止生成
                if (!isGenerating) {
                    currentReader.cancel();
                    currentReader = null;
                    break;
                }

                const { done, value } = await currentReader.read();
                
                if (done) {
                    // 处理剩余的缓冲区内容
                    if (buffer.trim()) {
                        processLine(buffer);
                    }
                    break;
                }

                const chunk = decoder.decode(value);
                console.log('chunk:', chunk);
                buffer += chunk;
                
                // 按换行符分割，但保留不完整的行在缓冲区
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 最后一行可能是不完整的，保留在缓冲区
                
                for (const line of lines) {
                    processLine(line);
                }
            }
            
            // 处理单行数据的函数
            function processLine(line) {
                if (line.startsWith('data:')) {
                    try {
                        const data = JSON.parse(line.substring(5).trim());

                        if (data.reason != null && data.reason) {
                            solution += data.text;
                            currentField = 'solution';
                        } else {
                            responseText += data.text;
                            currentField = 'response';
                        }

                        // 实时更新消息
                        if (currentField === 'solution') {
                            updateStreamingMessage(solution, 'reasoner');
                        } else if (currentField === 'response') {
                            updateStreamingMessage(responseText, 'bot');
                        }
                    } catch (error) {
                        console.error('解析JSON数据失败:', error, '行内容:', line);
                        // 忽略解析错误，继续处理下一行
                    }
                }
            }

            return {
                solution: solution || "抱歉，我还没想好该怎么回答你的问题。",
                response: responseText || "感谢你的分享，我理解你的感受。"
            };
        } catch (error) {
            console.error('请求失败:', error);
            return {
                solution: "请求失败，请稍后再试。",
                response: "请求失败，请稍后再试。"
            };
        } finally {
            currentReader = null;
        }
    }

    // 新增函数：更新流式消息
    function updateStreamingMessage(text, sender) {
        let messageContainer = document.querySelector(`.message-container.${sender}:last-child`);

        if (!messageContainer) {
            // 如果不存在则创建新消息容器
            messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container', sender);

            const avatar = document.createElement('div');
            avatar.classList.add('avatar', `${sender}-avatar`);
            avatar.textContent = sender === 'user' ? '你' : 'AI';
            messageContainer.appendChild(avatar);

            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', `${sender}-message`);
            messageContainer.appendChild(messageDiv);

            chatMessages.appendChild(messageContainer);
        }

        const messageDiv = messageContainer.querySelector('.message');
        messageDiv.innerHTML = renderMarkdown(text);

        // 自动滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 修改sendMessage函数
    async function sendMessage() {
        // 如果正在生成中，点击按钮将停止生成
        if (isGenerating) {
            stopGeneration();
            return;
        }

        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        // 添加用户消息
        addMessage(messageText, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // 更新当前对话
        updateCurrentConversation(messageText, 'user');

        // 显示"正在输入"指示器
        typingIndicator.style.display = 'flex';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 更改按钮为停止按钮
        isGenerating = true;
        sendButton.innerHTML = `
            <svg class="stop-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2"/>
            </svg>
        `;

        // 获取AI回复
        try {
            const aiResponse = await generateResponse(messageText);
            typingIndicator.style.display = 'none';

            // 将AI回复添加到对话历史中
            if (aiResponse && aiResponse.response) {
                updateCurrentConversation(aiResponse.response, 'bot');
                
                // 移除最后一个流式消息，并用完整响应重新渲染
                const lastBotMessage = document.querySelector('.message-container.bot:last-child');
                if (lastBotMessage) {
                    lastBotMessage.remove();
                }
                
                // 添加完整的AI回复
                addMessage(aiResponse.response, 'bot');
            }

            // 添加时间戳
            const now = new Date();
            const timeDiv = document.createElement('div');
            timeDiv.classList.add('message-time');
            timeDiv.textContent = formatTime(now);

            // 为最后一条消息添加时间戳
            const lastMessages = document.querySelectorAll('.message-container:not(.user)');
            if (lastMessages.length > 0) {
                const lastMessage = lastMessages[lastMessages.length - 1].querySelector('.message');
                const existingTime = lastMessage.querySelector('.message-time');
                if (existingTime) {
                    existingTime.textContent = formatTime(now);
                } else {
                    lastMessage.appendChild(timeDiv);
                }
            }

        } catch (error) {
            console.error('获取回复失败:', error);
            typingIndicator.style.display = 'none';
            addMessage("抱歉，我现在无法回复你。请稍后再试。", 'bot');
        } finally {
            // 恢复按钮为发送按钮
            isGenerating = false;
            sendButton.innerHTML = `
                <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }
    }

    // 停止生成函数
    function stopGeneration() {
        isGenerating = false;
        if (currentReader) {
            currentReader.cancel();
            currentReader = null;
        }
        typingIndicator.style.display = 'none';
        
        // 恢复按钮为发送按钮
        sendButton.innerHTML = `
            <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }

    // 更新对话标题
    function updateConversationTitle(conversationId, text) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            // 截取前20个字符作为标题
            const newTitle = text.length > 20 ? text.substring(0, 20) + '...' : text;
            conversation.title = newTitle;
            // renderHistoryList();
        }
    }

    // 渲染历史列表
    function renderHistoryList() {
        historyList.innerHTML = '';

        conversations.forEach(conversation => {
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            const previewText = lastMessage ? lastMessage.text : '无消息';
            console.log()

            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            if (conversation.id === currentConversationId) {
                historyItem.classList.add('active');
            }

            historyItem.innerHTML = `
                <div class="history-item-title">${conversation.title}</div>
                <div class="history-item-preview">${previewText.length > 30 ? previewText.substring(0, 30) + '...' : previewText}</div>
            `;

            historyItem.addEventListener('click', () => {
                loadConversation(conversation.id);
                toggleSidebar();
            });

            historyList.appendChild(historyItem);
        });
    }

    // 加载对话
    function loadConversation(conversationId) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            currentConversationId = conversation.id;

            // 清空聊天界面
            chatMessages.innerHTML = '';

            // 加载所有消息
            conversation.messages.forEach(message => {
                addMessage(message.text, message.sender);
            });

            // 滚动到底部
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 50);

            // 更新历史列表中的活动状态
            // renderHistoryList();
        }
    }

    // 保存对话为笔记
    async function saveConversationAsNote() {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (!conversation) {
            showNotification('当前没有对话内容', 'error');
            return;
        }

        // 获取所有消息
        const allMessages = conversation.messages;
        console.log("allMessages",allMessages)

        // 过滤出用户和AI的消息（排除欢迎消息等系统消息）
        const userMessages = allMessages.filter(m => m.sender === 'user');
        console.log("userMessages", userMessages)
        // 检查是否有足够的对话内容
        if (userMessages.length === 0) {
            showNotification('没有用户提问，无法保存为笔记', 'warning');
            return;
        }

        // 获取最后一个用户提问
        const lastUserMessage = userMessages[userMessages.length - 1];
        console.log("lastUserMessage", lastUserMessage)
        // 查找与最后一个用户提问直接对应的AI回答
        // 从最后一个用户提问的位置开始正向查找，找到紧随其后的第一个AI消息
        const lastUserIndex = allMessages.indexOf(lastUserMessage);
        let correspondingBotAnswer = null;
        console.log("lastUserIndex", lastUserIndex)
        for (let i = lastUserIndex + 1; i < allMessages.length; i++) {
            console.log('checking message:', allMessages[i]);
            console.log('checking sender:', allMessages[i].sender);
            if (allMessages[i].sender === 'bot') {
                // 检查是否是欢迎消息
                // const welcomeMessage = "你好！今天感觉如何呀？我永远是你忠实的倾听者。无论是想分享一缕阳光，还是倒一倒心里的雨，我都在这里。你的快乐、烦恼或任何小思绪，我都愿意安静地听你说。";
                // 如果不是欢迎消息，则认为是有效的AI回答
                // if (allMessages[i].text !== welcomeMessage) {
                    correspondingBotAnswer = allMessages[i];
                    break;
                // }
            }
        }

        // 如果仍然没有AI回答，显示错误
        if (!correspondingBotAnswer) {
            showNotification('没有找到对应的AI回答，无法保存为笔记', 'error');
            return;
        }

        // 准备笔记数据
        const title = lastUserMessage.text.length > 50 ?
            lastUserMessage.text.substring(0, 50) + '...' :
            lastUserMessage.text;

        // 优化内容格式，去除"回答 1:"等编号标记
        let cleanBotAnswer = correspondingBotAnswer.text;
        const answerPrefixRegex = /^(回答\s*\d*[:：]\s*)/;
        if (answerPrefixRegex.test(cleanBotAnswer)) {
            cleanBotAnswer = cleanBotAnswer.replace(answerPrefixRegex, '');
        }

        // const content = `问题：${lastUserMessage.text}\n\n回答：${cleanBotAnswer}`;
        const content = `${cleanBotAnswer}`;

        try {
            // 显示保存中状态
            const originalText = saveNoteButton.title;
            saveNoteButton.title = '保存中...';
            saveNoteButton.disabled = true;

            const response = await fetch('/api/note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    tags: ['对话记录', 'AI问答']
                })
            });

            // 恢复按钮状态
            saveNoteButton.title = originalText;
            saveNoteButton.disabled = false;

            if (response.ok) {
                showNotification('对话已成功保存为笔记！', 'success');
            } else {
                const errorData = await response.json();
                showNotification(`保存失败: ${errorData.error}`, 'error');
            }
        } catch (error) {
            console.error('保存笔记时出错:', error);
            // 恢复按钮状态
            saveNoteButton.title = originalText;
            saveNoteButton.disabled = false;
            showNotification('保存笔记时出错，请稍后重试', 'error');
        }
    }
    
    // 切换选择模式
    function toggleSelectMode() {
        isSelectMode = !isSelectMode;
        
        if (isSelectMode) {
            // 进入选择模式
            selectionToolbar.classList.add('active');
            selectedMessages = [];
            updateSelectedCount();
        } else {
            // 退出选择模式
            exitSelectMode();
        }
    }
    
    // 退出选择模式
    function exitSelectMode() {
        isSelectMode = false;
        selectionToolbar.classList.remove('active');
        document.querySelectorAll('.message-container').forEach(container => {
            container.classList.remove('selectable', 'selected');
        });
        selectedMessages = [];
        updateSelectedCount();
    }
    
    // 切换消息选择状态
    function toggleMessageSelection(container) {
        // 只允许选择用户消息（问题）
        if (!container.classList.contains('user')) {
            return;
        }
        
        const index = selectedMessages.indexOf(container);
        
        if (index === -1) {
            // 选中消息
            container.classList.add('selected');
            selectedMessages.push(container);
        } else {
            // 取消选中消息
            container.classList.remove('selected');
            selectedMessages.splice(index, 1);
        }
        
        updateSelectedCount();
    }
    
    // 更新选中计数
    function updateSelectedCount() {
        selectedCount.textContent = `已选择 ${selectedMessages.length} 项`;
    }
    
    // 保存选中的消息为笔记
    async function saveSelectedMessages() {
        if (selectedMessages.length === 0) {
            alert('请至少选择一条消息');
            return;
        }
        
        // 获取选中的问题
        const selectedQuestion = selectedMessages[0];
        const messageDiv = selectedQuestion.querySelector('.message');
        const title = messageDiv.querySelector('div').textContent.trim();
        
        // 查找对应的AI回答（在问题之后的第一个AI消息）
        let content = '';
        const allMessages = Array.from(chatMessages.children);
        const selectedIndex = allMessages.indexOf(selectedQuestion);
        
        // 在选中的问题之后查找第一个AI回答
        for (let i = selectedIndex + 1; i < allMessages.length; i++) {
            const nextMessage = allMessages[i];
            if (nextMessage.classList.contains('bot')) {
                const nextMessageDiv = nextMessage.querySelector('.message');
                content = nextMessageDiv.querySelector('div').textContent.trim();
                break;
            }
        }
        
        // 如果没有找到AI回答，使用问题后面的所有内容
        if (!content) {
            content = '暂无回答';
        }
        
        try {
            const response = await fetch('/api/note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    tags: ['对话记录']
                })
            });

            if (response.ok) {
                alert('对话已成功保存为笔记！');
                exitSelectMode(); // 保存成功后退出选择模式
            } else {
                const errorData = await response.json();
                alert(`保存失败: ${errorData.error}`);
            }
        } catch (error) {
            console.error('保存笔记时出错:', error);
            alert('保存笔记时出错，请稍后重试');
        }
    }

    // 点击发送按钮
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    // 按Enter键发送消息
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 保存对话为笔记
    if (saveNoteButton) {
        saveNoteButton.addEventListener('click', saveConversationAsNote);

        // 添加快捷键支持：Ctrl+S 保存笔记
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveConversationAsNote();
            }
        });
    }
    
    // 选择模式相关事件
    // if (selectModeButton) {
    //     selectModeButton.addEventListener('click', toggleSelectMode);
    // }
    //
    // if (cancelSelectionButton) {
    //     cancelSelectionButton.addEventListener('click', exitSelectMode);
    // }
    //


    // 知识库功能
    function toggleKnowledgeModal() {
        knowledgeModal.classList.toggle('active');
        if (knowledgeModal.classList.contains('active')) {
            loadKnowledgeList();
        }
    }

    // 加载知识列表
    async function loadKnowledgeList() {
        try {
            const response = await fetch('/api/knowledge');
            if (response.ok) {
                const knowledgeItems = await response.json();
                renderKnowledgeList(knowledgeItems);
            } else {
                console.error('获取知识列表失败');
            }
        } catch (error) {
            console.error('加载知识列表时出错:', error);
        }
    }

    // 渲染知识列表
    function renderKnowledgeList(knowledgeItems) {
        knowledgeList.innerHTML = '';
        knowledgeItems.forEach(item => {
            const knowledgeItem = document.createElement('div');
            knowledgeItem.className = 'knowledge-item';
            knowledgeItem.innerHTML = `
                <div class="knowledge-item-header">
                    <h4>${item.title || '未命名知识'}</h4>
                    <div class="knowledge-item-actions">
                        <button class="btn-edit" data-id="${item.id}">编辑</button>
                        <button class="btn-delete" data-id="${item.id}">删除</button>
                    </div>
                </div>
                <div class="knowledge-item-content">
                    <p>${item.content}</p>
                    <div class="knowledge-item-meta">
                        <span>标签: ${item.tags ? item.tags.join(', ') : '无'}</span>
                        <span>来源: ${item.source || '无'}</span>
                    </div>
                </div>
            `;
            knowledgeList.appendChild(knowledgeItem);
        });

        // 添加编辑和删除事件监听
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editKnowledge(id);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteKnowledge(id);
            });
        });
    }

    // 编辑知识
    async function editKnowledge(id) {
        // 这里可以实现编辑功能
        alert(`编辑知识 ID: ${id}`);
    }

    // 删除知识
    async function deleteKnowledge(id) {
        if (confirm('确定要删除这个知识吗？')) {
            try {
                const response = await fetch(`/api/knowledge/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    loadKnowledgeList();
                } else {
                    console.error('删除知识失败');
                }
            } catch (error) {
                console.error('删除知识时出错:', error);
            }
        }
    }

    // 搜索知识
    async function searchKnowledge() {
        const query = knowledgeSearchInput.value.trim();
        if (!query) return;

        try {
            const response = await fetch('/api/knowledge/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: query })
            });

            if (response.ok) {
                const results = await response.json();
                renderKnowledgeList(results);
            } else {
                console.error('搜索知识失败');
            }
        } catch (error) {
            console.error('搜索知识时出错:', error);
        }
    }

    // 搜索笔记
    async function searchNotesInStorage() {
        const query = notesSearchInput.value.trim();
        if (!query) {
            notesSearchResults.innerHTML = '<div class="no-results">请输入关键词搜索笔记</div>';
            return;
        }

        try {
            notesSearchResults.innerHTML = '<div class="searching">搜索中...</div>';
            
            const response = await fetch('/api/note/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    query: query,
                    top_k: 10
                })
            });

            if (response.ok) {
                const results = await response.json();
                renderNotesSearchResults(results);
            } else {
                notesSearchResults.innerHTML = '<div class="no-results">搜索失败，请稍后重试</div>';
                console.error('搜索笔记失败');
            }
        } catch (error) {
            notesSearchResults.innerHTML = '<div class="no-results">搜索出错，请稍后重试</div>';
            console.error('搜索笔记时出错:', error);
        }
    }

    // 渲染笔记搜索结果
    function renderNotesSearchResults(notes) {
        if (!notes || notes.length === 0) {
            notesSearchResults.innerHTML = '<div class="no-results">未找到相关笔记</div>';
            return;
        }

        notesSearchResults.innerHTML = '';
        notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-search-item';
            noteItem.innerHTML = `
                <div class="note-search-item-header">
                    <h4>${note.title || '无标题'}</h4>
                    <span class="similarity-score">相似度: ${note.similarity ? note.similarity.toFixed(4) : 'N/A'}</span>
                </div>
                <div class="note-search-item-content">
                    <p>${note.content}</p>
                </div>
                <div class="note-search-item-meta">
                    <span>创建时间: ${note.created_at ? new Date(note.created_at).toLocaleString() : 'N/A'}</span>
                    <span>更新时间: ${note.updated_at ? new Date(note.updated_at).toLocaleString() : 'N/A'}</span>
                </div>
                <div class="note-search-item-actions">
                    <button class="btn-send-to-ai" data-note-id="${note.id}" data-note-title="${encodeURIComponent(note.title || '无标题')}" data-note-content="${encodeURIComponent(note.content)}">发送到AI</button>
                </div>
            `;
            
            // 添加点击事件，取消跳转，仅关闭搜索模态框
            noteItem.addEventListener('click', (e) => {
                // 如果点击的是"发送到AI"按钮，则不关闭模态框
                if (e.target.classList.contains('btn-send-to-ai')) {
                    return;
                }
                // 关闭搜索模态框
                hideNotesSearchModal();
            });
            
            notesSearchResults.appendChild(noteItem);
        });
        
        // 添加"发送到AI"按钮的点击事件监听
        document.querySelectorAll('.btn-send-to-ai').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                const noteId = btn.getAttribute('data-note-id');
                const noteTitle = decodeURIComponent(btn.getAttribute('data-note-title'));
                const noteContent = decodeURIComponent(btn.getAttribute('data-note-content'));
                sendNoteToAI(noteTitle, noteContent);
            });
        });
    }

    // 切换笔记搜索弹窗
    function toggleNotesSearchModal() {
        notesSearchModal.classList.toggle('active');
        if (notesSearchModal.classList.contains('active')) {
            notesSearchInput.value = '';
            notesSearchResults.innerHTML = '<div class="no-results">请输入关键词搜索笔记</div>';
        }
    }

    // 添加一个新的函数专门用于隐藏笔记搜索弹窗
    function hideNotesSearchModal() {
        notesSearchModal.classList.remove('active');
    }
    
    // 将笔记内容发送给AI
    function sendNoteToAI(noteTitle, noteContent) {
        // 关闭搜索模态框
        hideNotesSearchModal();
        
        // 构建问题内容，包含笔记信息
        const question = `请基于以下笔记内容回答问题：\n\n标题：${noteTitle}\n\n内容：${noteContent}\n\n我的问题是：请分析和总结这条笔记的内容`;
        
        // 设置发送给AI的消息
        messageInput.value = question;
        
        // 自动发送消息
        sendMessage();
    }

    // 添加知识
    async function addKnowledge(event) {
        event.preventDefault();
        const formData = new FormData(knowledgeForm);
        const knowledgeData = {
            title: formData.get('title'),
            content: formData.get('content'),
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
            source: formData.get('source')
        };

        try {
            const response = await fetch('/api/knowledge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(knowledgeData)
            });

            if (response.ok) {
                knowledgeForm.reset();
                loadKnowledgeList();
            } else {
                console.error('添加知识失败');
            }
        } catch (error) {
            console.error('添加知识时出错:', error);
        }
    }

    // 事件监听
    if (knowledgeBtn) {
        knowledgeBtn.addEventListener('click', toggleKnowledgeModal);
    }
    if (closeKnowledge) {
        closeKnowledge.addEventListener('click', toggleKnowledgeModal);
    }
    if (searchKnowledgeBtn) {
        searchKnowledgeBtn.addEventListener('click', searchKnowledge);
    }
    if (knowledgeForm) {
        knowledgeForm.addEventListener('submit', addKnowledge);
    }

    // 点击弹窗外部关闭知识库弹窗
    if (knowledgeModal) {
        knowledgeModal.addEventListener('click', function(e) {
            if (e.target === knowledgeModal) {
                toggleKnowledgeModal();
            }
        });
    }

    // 事件监听 - 搜索笔记功能
    if (searchNotesTrigger) {
        searchNotesTrigger.addEventListener('click', toggleNotesSearchModal);
    }
    
    // 侧边栏中的搜索笔记按钮
    if (searchNotesBtn) {
        searchNotesBtn.addEventListener('click', toggleNotesSearchModal);
    }
    
    if (closeNotesSearch) {
        closeNotesSearch.addEventListener('click', toggleNotesSearchModal);
    }
    if (searchNotesSubmitBtn) {
        searchNotesSubmitBtn.addEventListener('click', searchNotesInStorage);
    }
    if (notesSearchInput) {
        notesSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchNotesInStorage();
            }
        });
    }

    // 点击弹窗外部关闭笔记搜索弹窗
    if (notesSearchModal) {
        notesSearchModal.addEventListener('click', function(e) {
            if (e.target === notesSearchModal) {
                toggleNotesSearchModal();
            }
        });
    }

    // Markdown渲染函数
    function renderMarkdown(text) {
        // 简单的Markdown解析实现
        if (!text) return '';
        
        let result = text;
        
        // 保存代码块，避免后续处理影响
        const codeBlocks = [];
        result = result.replace(/```([\s\S]*?)```/g, function(match, code) {
            // 转义代码块内的HTML特殊字符
            const escapedCode = code.replace(/&/g, '&amp;')
                                   .replace(/</g, '&lt;')
                                   .replace(/>/g, '&gt;');
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(`<pre><code>${escapedCode}</code></pre>`);
            return placeholder;
        });
        
        // 处理行内代码 (`code`)
        const inlineCodes = [];
        result = result.replace(/`([^`]+)`/g, function(match, code) {
            // 转义行内代码中的HTML特殊字符
            const escapedCode = code.replace(/&/g, '&amp;')
                                   .replace(/</g, '&lt;')
                                   .replace(/>/g, '&gt;');
            const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
            inlineCodes.push(`<code>${escapedCode}</code>`);
            return placeholder;
        });
        
        // 转义HTML特殊字符（除了Markdown语法中的）
        result = result.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
        
        // 处理粗体 (**bold** 或 __bold__)
        result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // 处理斜体 (*italic* 或 _italic_)
        result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
        result = result.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // 处理链接 [text](url)
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // 处理换行：将换行符转换为<br>，但保留空行作为段落分隔
        // 先将文本按空行分割成段落
        const paragraphs = result.split(/\n\s*\n/);
        
        // 对每个段落进行处理
        const processedParagraphs = paragraphs.map(paragraph => {
            // 处理段落内的单个换行，转换为<br>
            const processedText = paragraph.replace(/\n/g, '<br>');
            return `<p>${processedText}</p>`;
        });
        
        // 合并所有段落
        result = processedParagraphs.join('');
        
        // 恢复代码块
        result = result.replace(/__CODE_BLOCK_(\d+)__/g, function(match, index) {
            return codeBlocks[index];
        });
        
        // 恢复行内代码
        result = result.replace(/__INLINE_CODE_(\d+)__/g, function(match, index) {
            return inlineCodes[index];
        });
        
        return result;
    }
});