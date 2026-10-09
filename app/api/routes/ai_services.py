"""
AI相关API路由
"""

from flask import Blueprint, request, jsonify, render_template, Response
from ..services.ai_services import AIService
from app.utils.error_handler import handle_error
from .notes import notes_bp

role = {
    'bot': 'assistant',
    'user': 'user'
}

ai_bp = Blueprint('ai', __name__)

"""
1. 流式生成AI响应
    1.1 URL : /stream_generate
    1.2 方法: POST
    1.3 请求体:
        {
            "messages": [
                {
                    "sender": "user",
                    "text": "用户消息内容"
                }
            ],
            "base_url": "https://api.openai.com"(可选),
            "api_key": "your-api-key"(可选),
            "model": "gpt-3.5-turbo"(可选),
            "provider": "openai"(可选),
            "newMessage": "新的用户消息"
        }
    1.4 返回:
        事件流格式的数据(SSE - Server-Sent Events)
        data: {"id": "chatcmpl-123", "object": "chat.completion.chunk", "content": "流式响应内容"}
2. 列出可用的AI提供商
    2.1 URL : /list_providers
    2.2 方法: GET
    2.3 返回:
        [
            {
                "id": "提供商ID",
                "name": "提供商名称"
            }
        ]
3. 根据提供商列出可用的AI模型
    3.1 URL : /list_models
    3.2 方法: GET
    3.3 参数:
        provider: 提供商ID
    3.4 返回:
        [
            {
                "id": "模型ID",
                "name": "模型名称"
            }
        ]            
"""

# 注册笔记路由
ai_bp.register_blueprint(notes_bp, url_prefix='/api')


@ai_bp.route('/')
def index():
    return render_template('aichat.html')


@ai_bp.route('/stream_generate', methods=['POST'])
def stream_generate():
    """
    流式生成AI响应的API接口

    请求体:
        {
            "messages": [
                {
                    "sender": "user",
                    "text": "用户消息内容"
                }
            ],
            "base_url": "https://api.openai.com"(可选),
            "api_key": "your-api-key"(可选),
            "model": "gpt-3.5-turbo"(可选),
            "provider": "openai"(可选),
            "newMessage": "新的用户消息"
        }

    返回:
        事件流格式的数据(SSE - Server-Sent Events)
        data: {"id": "chatcmpl-123", "object": "chat.completion.chunk", "content": "流式响应内容"}
    """
    try:
        # 获取请求体数据
        data = request.get_json()
        

        messages = data.get('messages', [])
        formatted_messages = []
        for msg in messages:

            if 'sender' in msg and 'text' in msg:
                formatted_role = role.get(msg['sender'], 'user')
                formatted_content = msg['text']
            elif 'role' in msg and 'content' in msg:
                formatted_role = msg['role']
                formatted_content = msg['content']
            else:
                formatted_role = 'user'
                formatted_content = msg.get('content', msg.get('text', ''))
            
            formatted_messages.append({
                'role': formatted_role,
                'content': formatted_content
            })

        persona = data.get('persona', '')

        new_message = data.get('newMessage', '')
        if not new_message:
            # 从消息列表中找到最后一条用户消息
            for i in range(len(formatted_messages) - 1, -1, -1):
                if formatted_messages[i]['role'] == 'user':
                    new_message = formatted_messages[i]['content']
                    # 从消息列表中移除该消息，因为它将作为new_message传递
                    formatted_messages.pop(i)
                    break
        
        # 构建请求数据
        request_data = {
            'messages': formatted_messages,
            'new_message': new_message,
            'provider': data.get('provider'),  # 不设置默认值，让AI_SERVICE处理默认值
            'enable_note_search': data.get('search_notes', False),
            'persona': persona
        }
        
        # 添加配置信息
        # 初始化config，优先使用data中直接传递的配置，然后使用data.config中的配置
        config = {}
        
        # 1. 首先添加data.config中的配置（如果存在）
        if data.get('config'):
            config.update(data['config'])
        
        # 2. 然后添加data中直接传递的配置，这些配置具有更高优先级
        if data.get('base_url'):
            config['base_url'] = data.get('base_url')
        if data.get('api_key'):
            config['api_key'] = data.get('api_key')
        if data.get('model'):
            config['model'] = data.get('model')
        if data.get('provider'):
            config['provider'] = data.get('provider')
        if data.get('temperature') is not None:
            config['temperature'] = data.get('temperature')
        if data.get('max_tokens') is not None:
            config['max_tokens'] = data.get('max_tokens')
        
        # 如果provider在config中，优先使用config中的provider
        if config.get('provider'):
            request_data['provider'] = config['provider']
        
        # 如果有配置，添加到request_data中
        if config:
            request_data['config'] = config
        
        # 创建AI服务实例并生成响应
        ai_service = AIService()
        response = ai_service.generate_response(request_data, stream=True)
        
        # 定义流式响应生成器
        def generate():
            try:
                for chunk in response:
                    yield f"data: {{\"text\": \"{chunk.replace('\\', '').replace('\"', '\\\"')}\"}}\n\n"
            except Exception as e:
                yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
        
        # 返回SSE响应
        return Response(generate(), content_type='text/event-stream')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/list_providers', methods=['GET'])
def list_providers():
    """
    列出可用的AI提供商

    返回:
        [
            {
                "id": "提供商ID",
                "name": "提供商名称"
            }
        ]
    """
    ai_service = AIService()
    providers = ai_service.list_providers()
    return jsonify(providers), 200


@ai_bp.route('/list_models', methods=['GET'])
def list_models():
    """
    根据提供商列出可用的AI模型

    参数:
        provider: 提供商ID

    返回:
        [
            {
                "id": "模型ID",
                "name": "模型名称"
            }
        ]
    """
    provider = request.args.get('provider')
    if not provider:
        return jsonify({'error': 'Provider parameter is required'}), 400
    
    ai_service = AIService()
    models = ai_service.list_models_by_provider(provider)
    return jsonify(models), 200