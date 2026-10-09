#!/usr/bin/env python
"""
启动脚本
"""

import sys
import os
import logging
from dotenv import load_dotenv

# 配置日志
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)
logger.info(f"项目根目录: {project_root}")

# 加载.env文件
logger.info("加载ai.env文件...")
load_dotenv(dotenv_path=os.path.join(project_root, 'ai.env'))
logger.info("ai.env文件加载成功")

# 导入配置
from app.config.settings import settings
logger.info(f"服务配置: host={settings.SERVER_HOST}, port={settings.SERVER_PORT}")

from app import create_app

if __name__ == '__main__':
    try:
        logger.info("创建Flask应用...")
        app = create_app()
        logger.info("Flask应用创建成功")
        
        logger.info("启动服务器...")
        app.run(debug=True, host=settings.SERVER_HOST, port=settings.SERVER_PORT)
    except Exception as e:
        logger.error(f"服务器启动失败: {str(e)}", exc_info=True)
        sys.exit(1)