"""
主应用文件
"""

from flask import Flask
from flask_cors import CORS
import os


# 允许所有来源的跨域请求（开发环境）


def create_app():
    """创建Flask应用"""
    # 获取项目根目录
    project_root = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(project_root, 'templates')
    static_dir = os.path.join(project_root, 'static')

    app = Flask(__name__,
                template_folder=template_dir,
                static_folder=static_dir)
    
    CORS(app)
    # 注册主路由
    from .api.routes import main_bp
    from .api.routes.ai_services import ai_bp
    from .api.routes.notes import notes_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(ai_bp, url_prefix='/api')
    app.register_blueprint(notes_bp, url_prefix='/api')

    # 添加全局错误处理器
    app.register_error_handler(500, lambda e: ({'error': str(e)}, 500))

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=8000)