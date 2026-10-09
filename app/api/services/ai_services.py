# backend/api/services/ai_service.py
"""
AI服务核心类
"""

import json
import requests
from typing import Dict, List, Any, Optional, Generator
from abc import ABC, abstractmethod
from enum import Enum

from app.config.settings import settings

role = {
    'bot': 'assistant',
    'user': 'user'
}


class AIProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    CLAUDE = "claude"
    QWEN = "qwen"
    DEEPSEEK = "deepseek"
    BIGMODEL = "bigmodel"


class AIPluginInterface(ABC):
    """AI插件接口"""

    @abstractmethod
    def get_name(self) -> str:
        """获取插件名称"""
        pass

    @abstractmethod
    def get_description(self) -> str:
        """获取插件描述"""
        pass

    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证配置"""
        pass

    @abstractmethod
    def generate_response(self, messages: List[Dict], new_message: str, **kwargs) -> Dict[str, Any]:
        """生成响应"""
        pass


class OpenAIPlugin(AIPluginInterface):
    """OpenAI插件实现"""

    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url = base_url
        self.api_key = api_key
        self.model = model

    def get_name(self) -> str:
        return "OpenAI"

    def get_description(self) -> str:
        return "OpenAI API服务"

    def validate_config(self, config: Dict[str, Any]) -> bool:
        return all([config.get('base_url'), config.get('api_key'), config.get('model')])

    def generate_response(self, messages, new_message: str, **kwargs) -> Generator[str, Any, dict[str, Any]]:
        """
        生成AI响应，支持流式返回
        """
        try:
            # 合并messages和new_message
            if new_message:
                messages = messages.copy()
                messages.append({
                    'role': 'user',
                    'content': new_message
                })
            
            # 构建请求
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            request_body = {
                "model": self.model,
                "messages": messages,
                "stream": True
            }
            
            # 发送请求
            response = requests.post(url, headers=headers, json=request_body, stream=True)
            response.raise_for_status()
            
            # 处理响应
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        line = line[6:]
                    if line == '[DONE]':
                        break
                    try:
                        chunk_data = json.loads(line)
                        delta = chunk_data.get('choices', [{}])[0].get('delta', {})
                        content = delta.get('content', '')
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            yield f"Error: {str(e)}"


class DeepSeekPlugin(OpenAIPlugin):
    """DeepSeek插件实现
    1. 继承自OpenAIPlugin，复用其方法
    2. 重写get_name和get_description方法
    3. 重写validate_config方法
    4. 其他方法保持不变
    """
    def get_name(self) -> str:
        return "DeepSeek"

    def get_description(self) -> str:
        return "DeepSeek API服务"


class BigModelPlugin(OpenAIPlugin):
    """BigModel 智谱AI
    1. 继承自OpenAIPlugin，复用其方法
    2. 重写get_name和get_description方法
    3. 重写validate_config方法
    4. 重写generate_response方法，使用正确的认证方式
    """
    def get_name(self) -> str:
        return "智谱AI"

    def get_description(self) -> str:
        return "智谱AI API服务"

    def generate_response(self, messages, new_message: str, **kwargs) -> Generator[str, Any, dict[str, Any]]:
        """
        生成AI响应，支持流式返回
        智谱AI使用的认证方式与OpenAI不同，不需要Bearer前缀
        """
        try:
            # 合并messages和new_message
            if new_message:
                messages = messages.copy()
                messages.append({
                    'role': 'user',
                    'content': new_message
                })
            
            # 构建请求 - 智谱AI不需要Bearer前缀
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"{self.api_key}",  # 智谱AI只需要API密钥，不需要Bearer前缀
                "Content-Type": "application/json"
            }
            request_body = {
                "model": self.model,
                "messages": messages,
                "stream": True
            }
            
            # 发送请求
            response = requests.post(url, headers=headers, json=request_body, stream=True)
            
            # 尝试获取响应内容，即使有错误
            if response.status_code != 200:
                error_text = response.text
                yield f"Error: 请求失败，状态码: {response.status_code}，错误信息: {error_text}"
                return
            
            response.raise_for_status()
            
            # 处理响应
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        line = line[6:]
                    if line == '[DONE]':
                        break
                    try:
                        chunk_data = json.loads(line)
                        delta = chunk_data.get('choices', [{}])[0].get('delta', {})
                        content = delta.get('content', '')
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            yield f"Error: {str(e)}"


class QwenPlugin(OpenAIPlugin):
    """通义千问插件实现
    1. 继承自OpenAIPlugin，复用其方法
    2. 重写get_name和get_description方法
    3. 重写validate_config方法
    4. 其他方法保持不变
    """
    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url = base_url
        self.api_key = api_key
        self.model = model

    def get_name(self) -> str:
        return "通义千问"

    def get_description(self) -> str:
        return "通义千问 API服务"


class AIService:
    """AI服务管理类
    1. 初始化并注册所有支持的AI插件(选其一)
        1.1 支持OpenAI插件
        1.2 支持DeepSeek插件
        1.3 支持智谱AI插件
        1.4 支持通义千问插件
    2. 提供获取插件实例的方法
        2.1 根据提供商获取插件实例
        2.2 根据提供商列出模型
    3. 提供列出所有可用AI提供商和模型的方法
        3.1 列出所有可用的AI提供商
        3.2 列出所有可用的模型
    4. 提供生成AI响应的方法
        4.1 处理消息和配置
        4.2 获取对应的插件
        4.3 生成响应（支持流式返回）
    5. 处理配置优先级：前端配置 > 后端默认配置
        5.1 支持前端传递的base_url、api_key、model等配置
        5.2 支持后端默认配置
    6. 支持笔记的集成以增强回答质量
        6.1 支持启用笔记搜索
        6.2 支持结合笔记内容回答用户问题
        6.3 支持前端控制是否搜索笔记
    """

    def __init__(self):
        self.plugins: Dict[str, AIPluginInterface] = {}
        self._register_plugins()

    def _register_plugins(self):
        """注册所有支持的AI插件"""
        # 注册OpenAI插件
        openai_config = settings.AI_PROVIDERS.get('openai', {})
        if openai_config.get('api_key'):  # 只有在配置了API密钥时才注册
            self.plugins["openai"] = OpenAIPlugin(
                base_url=openai_config.get('base_url', 'https://api.openai.com/v1'),
                api_key=openai_config.get('api_key', ''),
                model=openai_config.get('model', 'gpt-3.5-turbo')
            )

        # 注册DeepSeek插件
        deepseek_config = settings.AI_PROVIDERS.get('deepseek', {})
        if deepseek_config.get('api_key'):  # 只有在配置了API密钥时才注册
            self.plugins["deepseek"] = DeepSeekPlugin(
                base_url=deepseek_config.get('base_url', "https://api.deepseek.com"),
                api_key=deepseek_config.get('api_key'),
                model=deepseek_config.get('model', "deepseek-chat")
            )

        # 注册智谱AI插件
        bigmodel_config = settings.AI_PROVIDERS.get('bigmodel', {})
        if bigmodel_config.get('api_key'):  # 只有在配置了API密钥时才注册
            self.plugins["bigmodel"] = BigModelPlugin(
                base_url=bigmodel_config.get('base_url', "https://open.bigmodel.cn/api/paas/v4"),
                api_key=bigmodel_config.get('api_key'),
                model=bigmodel_config.get('model', "glm-4-flash")
            )

        # 注册Qwen插件
        qwen_config = settings.AI_PROVIDERS.get('qwen', {})
        if qwen_config.get('api_key'):  # 只有在配置了API密钥时才注册
            self.plugins["qwen"] = QwenPlugin(
                base_url=qwen_config.get('base_url', "https://dashscope.aliyuncs.com"),
                api_key=qwen_config.get('api_key', ''),
                model=qwen_config.get('model', "qwen-turbo")
            )

    def get_plugin(self, provider: str) -> Optional[AIPluginInterface]:
        """根据提供商获取插件实例"""
        return self.plugins.get(provider)

    def list_providers(self) -> List[Dict[str, str]]:
        """列出所有可用的AI提供商
        1. 遍历已注册的插件
        2. 获取每个插件的名称和描述
        3. 返回提供商列表
        Returns:
            提供商列表
            [
                {
                    'id': 'provider_id',
                    'name': 'Provider Name',
                    'description': 'Provider Description'
                }
            ]

        """
        providers = []
        for provider_id, plugin in self.plugins.items():
            providers.append({
                'id': provider_id,
                'name': plugin.get_name(),
                'description': plugin.get_description()
            })
        return providers

    def list_models_by_provider(self, provider: str) -> List[Dict[str, str]]:
        """
        根据提供商列出模型
        1. 检查提供商是否在配置中定义了模型列表
        2. 如果定义了，返回配置的模型列表
        3. 否则返回插件的默认模型
        4. 如果提供商不存在，返回空列表

        Args:
            provider: 提供商ID

        Returns:
            模型列表
            [
                {
                    'id': 'model_id',
                    'name': 'Model Name'
                }
            ]
        """
        from app.config.settings import settings
        # 检查提供商是否存在于模型配置中
        if provider in settings.PROVIDER_MODELS:
            return settings.PROVIDER_MODELS[provider]
        return []

    def generate_response(self, data: Dict[str, Any], stream: bool = True) -> Any:
        """
        生成AI响应

        1. 处理消息和配置
            1.1 获取提供商和配置
            1.2 获取前端传递的配置，如果未传递则使用后端默认配置
            1.3 获取模型参数
            1.4 获取角色设定
            1.5 构建消息列表
        2. 获取对应的插件
            2.1 根据提供商获取插件实例
            2.2 验证配置
            2.3 设置插件配置
        3. 生成响应（支持流式返回）
            3.1 如果启用流式返回，设置stream参数
            3.2 调用插件的generate_response方法生成响应
        4. 处理配置优先级：前端配置 > 后端默认配置
            4.1 支持前端传递的base_url、api_key、model等配置
            4.2 支持后端默认配置

        5. 支持笔记的集成以增强回答质量
            5.1 支持启用笔记搜索
            5.2 支持结合笔记内容回答用户问题
            5.3 支持前端控制是否搜索笔记
        6. 返回响应结果

        Args:
            data: 包含消息、配置等信息的字典
            stream: 是否启用流式返回

        Returns:
            响应结果
        """
        from app.config.settings import settings

        # 添加调试日志
        with open('ai_debug.log', 'a') as f:
            f.write(f"[DEBUG] 生成响应: data={data}, stream={stream}\n")

        # 1. 处理消息和配置
        provider = data.get('provider')
        # 如果provider为None或空字符串，使用默认值
        if not provider:
            provider = settings.DEFAULT_PROVIDER
        messages = data.get('messages', [])
        new_message = data.get('new_message', '')
        config = data.get('config', {})
        
        with open('ai_debug.log', 'a') as f:
            f.write(f"[DEBUG] 处理后的基础配置: provider={provider}, messages={messages}, new_message={new_message}\n")
        
        # 获取性格设定：前端传递的 > 后端默认配置
        persona = data.get('persona', settings.DEFAULT_PERSONA)
        
        # 2. 处理性格设定：如果有性格设定，将其作为系统提示词添加到消息列表开头
        processed_messages = messages.copy()
        
        # 检查是否已经有系统提示词
        has_system_prompt = any(msg.get('role') == 'system' for msg in processed_messages)
        
        # 如果有性格设定且没有系统提示词，添加系统提示词
        if persona and not has_system_prompt:
            processed_messages.insert(0, {
                'role': 'system',
                'content': persona
            })
            # 更新has_system_prompt标志
            has_system_prompt = True

        # 2. 获取对应的插件配置模板
        plugin_template = self.get_plugin(provider)
        if not plugin_template:
            raise ValueError(f"Provider {provider} not found or not configured")

        # 3. 创建插件实例的深拷贝，避免多个请求共享同一个插件实例导致配置冲突
        import copy
        plugin = copy.deepcopy(plugin_template)

        # 4. 处理配置：前端配置 > 后端默认配置
        # 检查插件是否有相应的属性，如果有则更新
        # 处理直接从data中获取的配置
        # 同时检查config对象和顶层data对象，确保配置能正确传递
        base_url = config.get('base_url') or data.get('base_url')
        api_key = config.get('api_key') or data.get('api_key')
        model = config.get('model') or data.get('model')
        temperature = config.get('temperature') or data.get('temperature')
        max_tokens = config.get('max_tokens') or data.get('max_tokens')
        
        if base_url and hasattr(plugin, 'base_url'):
            plugin.base_url = base_url
        if api_key and hasattr(plugin, 'api_key'):
            plugin.api_key = api_key
        if model and hasattr(plugin, 'model'):
            plugin.model = model
        # 处理temperature和max_tokens
        if temperature and hasattr(plugin, 'temperature'):
            plugin.temperature = temperature
        if max_tokens and hasattr(plugin, 'max_tokens'):
            plugin.max_tokens = max_tokens


        relevant_notes = []
        enable_note_search = data.get('enable_note_search', False)
        
        with open('ai_debug.log', 'a') as f:
            f.write(f"[DEBUG] 笔记搜索配置: enable_note_search={enable_note_search}, new_message={new_message}\n")
        
        if new_message and enable_note_search:

            from app.api.services.notes import note

            search_results = note.search_notes(new_message, top_k=10)

            notes_with_similarity = []
            for note_dict in search_results:
                # 计算相似度
                similarity = note_dict.get('similarity', 0)
                note_title = note_dict['title'].lower()
                note_content = note_dict['content'].lower()
                message_lower = new_message.lower()
                
                # 增强相似度计算
                # 如果消息包含在标题或内容中，增加相似度
                if message_lower in note_title:
                    similarity += 5  # 完整匹配标题权重最高
                elif message_lower in note_content:
                    similarity += 3  # 完整匹配内容权重次之

                # 简单的关键词匹配（Flask相关）
                if 'flask' in message_lower and ('flask' in note_title or 'flask' in note_content):
                    similarity += 2
                
                note_dict['similarity'] = similarity
                notes_with_similarity.append(note_dict)
            
            # 按相似度降序排序
            notes_with_similarity.sort(key=lambda x: x['similarity'], reverse=True)
            
            # 取前3个最相关的笔记
            relevant_notes = notes_with_similarity[:3]
            
            with open('ai_debug.log', 'a') as f:
                f.write(f"[DEBUG] 找到相关笔记: {relevant_notes}\n")
        
        # 4. 将匹配的笔记内容融入提示词构建
        if relevant_notes:
            # 构建参考笔记内容
            reference_notes_content = "参考笔记：\n"
            for i, ref_note in enumerate(relevant_notes, 1):
                reference_notes_content += f"\n{i}. 标题：{ref_note['title']}\n"
                reference_notes_content += f"   内容：{ref_note['content'][:500]}...\n"  # 限制内容长度
            
            # 将参考笔记内容添加到新消息中，不修改messages列表
            new_message = reference_notes_content + "\n\n用户问题：" + new_message
              
            with open('ai_debug.log', 'a') as f:
                f.write(f"[DEBUG] 增强后的用户消息: {new_message}\n")
        
        # 5. 生成响应（支持流式返回）
        with open('ai_debug.log', 'a') as f:
            f.write(f"[DEBUG] 调用插件生成响应: plugin={plugin.get_name()}, processed_messages={processed_messages}, new_message={new_message}\n")
        return plugin.generate_response(processed_messages, new_message, search_notes=enable_note_search)
