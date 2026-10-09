"""
错误处理工具
"""

from flask import jsonify


def handle_error(error: Exception):
    """统一错误处理"""
    error_msg = str(error)

    # 根据错误类型返回不同的状态码
    if "Invalid API key" in error_msg or "Unauthorized" in error_msg:
        return jsonify({'error': '认证失败，请检查API密钥'}), 401
    elif "Rate limit exceeded" in error_msg:
        return jsonify({'error': '请求频率过高，请稍后再试'}), 429
    elif "Invalid model" in error_msg:
        return jsonify({'error': '无效的模型名称'}), 400
    else:
        return jsonify({'error': '服务器内部错误'}), 500
