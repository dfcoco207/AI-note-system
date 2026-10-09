"""
API 路由模块
"""

from flask import Blueprint, render_template

# 创建主路由蓝本
main_bp = Blueprint('/', __name__, template_folder='templates')

@main_bp.route('/')
def home():
    """首页"""
    return render_template('home.html')

@main_bp.route('/aichat.html')
def chat():
    """聊天页面"""
    return render_template('aichat.html')

@main_bp.route('/notes.html')
def notes():
    """笔记页面"""
    return render_template('notes.html')

@main_bp.route('/home.html')
def home_redirect():
    """重定向到首页"""
    return render_template('home.html')
