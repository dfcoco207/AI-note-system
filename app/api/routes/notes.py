"""
笔记相关API路由
"""

"""
1. 添加笔记
    1.1 URL : /note
    1.2 方法: POST
    1.3 请求体:
        {
        "content": "笔记内容",
        "title": "笔记标题",
        "tags": ["标签1", "标签2"](可选)
        }
    1.4 返回:
        {
            "id": "笔记ID"
        }
2. 根据ID获取笔记
    2.1 URL : /notes/<note_id>
    2.2 方法: GET
    2.3 返回:
        {
            "id": "笔记ID",
            "title": "笔记标题",
            "content": "笔记内容",
            "tags": ["标签1", "标签2"],
            "source": "来源",
            "created_at": "创建时间",
            "updated_at": "更新时间"
        }
3. 列出笔记
    3.1 URL : /notes
    3.2 方法: GET
    3.3 查询参数:
        limit: 限制返回数量(可选，默认为50)
        offset: 偏移量(可选，默认为0)
    3.4 返回:
        {
            "result": [
                {
                    "id": "ID",
                    "title": "笔记标题",
                    "content": "笔记内容",
                    "tags": ["标签1", "标签2"],
                    "source": "来源",
                    "created_at": "创建时间",
                    "updated_at": "更新时间"
                }
            ]
        }
4. 删除笔记
    4.1 URL : /note/<note_id>
    4.2 方法: DELETE
    4.3 返回:
        {
            "message": "删除成功"
        }
5. 更新笔记
    5.1 URL : /note/<note_id>
    5.2 方法: PUT
    5.3 请求体:
        {
            "content": "新内容(可选)",
            "title": "新标题(可选)",
            "tags": ["新标签1", "新标签2"](可选),
            "source": "新来源(可选)"
        }
    5.4 返回:
        {
            "message": "更新成功"
        }
6. 搜索笔记
    6.1 URL : /note/search
    6.2 方法: POST
    6.3 请求体:
        {
            "query": "搜索查询",
            "top_k": 5 (可选，默认为5)
        }
    6.4 返回:
        [
            {
                "id": "笔记ID",
                "title": "笔记标题",
                "content": "笔记内容",
                "tags": ["标签1", "标签2"],
                "similarity": 相似度分数
            }
        ]

"""

import datetime
import uuid
from flask import Blueprint, request, jsonify
from app.api.services.notes import note
from app.models.note import Note

# 创建蓝图
notes_bp = Blueprint('notes', __name__)


# 1. 添加笔记
@notes_bp.route('/note', methods=['POST'])
def add_note():
    """
    添加笔记
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid input"}), 400

    title = data.get('title')
    content = data.get('content')
    tags = data.get('tags', [])
    source = data.get('source', '')

    if not title or not content:
        return jsonify({"error": "Title and content are required"}), 400

    try:
        note_id = note.add_note(title=title, content=content, tags=tags, source=source)
        if note_id:
            added_note = note.get_note(note_id)
            return jsonify(added_note), 201
        return jsonify({"error": "Failed to add note"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 2. 根据ID获取笔记
@notes_bp.route('/notes/<note_id>', methods=['GET'])
def get_note(note_id):
    """
    获取特定笔记
    """
    note_data = note.get_note(note_id)
    if not note_data:
        return jsonify({"error": "Note not found"}), 404
    return jsonify(note_data)


# 3. 列出笔记
@notes_bp.route('/notes', methods=['GET'])
def list_notes():
    """
    获取笔记列表
    """
    # 处理查询参数
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 10, type=int)
    tag = request.args.get('tag')
    sort_by = request.args.get('sort_by', 'updated_at')
    order = request.args.get('order', 'desc')

    # 获取所有笔记
    all_notes = note.list_notes()
    total = len(all_notes)
    print(f"查询笔记总数: {total}")

    # 标签过滤
    if tag:
        filtered_notes = [n for n in all_notes if any(tag in t for t in n.get('tags', []))]
        print(f"标签过滤后的笔记总数: {len(filtered_notes)}")
    else:
        filtered_notes = all_notes

    # 排序
    if sort_by in ['created_at', 'updated_at']:
        reverse = (order == 'desc')
        filtered_notes.sort(key=lambda x: x.get(sort_by, ''), reverse=reverse)
    else:
        # 默认按更新时间降序
        filtered_notes.sort(key=lambda x: x.get('updated_at', ''), reverse=True)

    # 分页
    start = (page - 1) * page_size
    end = start + page_size
    paginated_notes = filtered_notes[start:end]
    print(f"分页后的笔记数量: {len(paginated_notes)}")

    total_pages = (len(filtered_notes) + page_size - 1) // page_size

    return jsonify({
        "result": paginated_notes,
        "total": len(filtered_notes),
        "page": page,
        "pages": total_pages
    })


# 4. 删除笔记
@notes_bp.route('/note/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """
    删除笔记
    """
    try:
        success = note.delete_note(note_id)
        if not success:
            return jsonify({"error": "Note not found"}), 404
        return jsonify({"message": "Note deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 5. 更新笔记
@notes_bp.route('/note/<note_id>', methods=['PUT'])
def update_note(note_id):
    """
    更新笔记
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid input"}), 400

    # 更新字段
    title = data.get('title')
    content = data.get('content')
    tags = data.get('tags')
    source = data.get('source')

    try:
        success = note.update_note(note_id, title=title, content=content, tags=tags, source=source)
        if not success:
            return jsonify({"error": "Note not found"}), 404
        updated_note = note.get_note(note_id)
        return jsonify(updated_note)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 6. 搜索笔记
@notes_bp.route('/note/search', methods=['POST'])
def search_notes():
    """
    搜索笔记
    路由配置:
        URL: /note/search
        方法: POST
    请求体:
        {
            "query": "搜索关键词(必填)",
            "tags": ["标签1", "标签2"](可选),
            "limit": 返回结果数量限制(可选，默认为10)
        }
    返回:
        [
            {
                "id": "笔记ID",
                "title": "笔记标题",
                "content": "笔记内容",
                "tags": ["标签1", "标签2"],
                "similarity": "相似度分数"
            }
        ]
    """
    # 从HTTP请求中获取JSON格式的请求体数据
    data = request.get_json()
    
    # 如果没有获取到有效的JSON数据，返回400错误
    if not data:
        return jsonify({"error": "Invalid input"}), 400

    # 从请求体中获取搜索关键词query
    query = data.get('query')
    
    # 从请求体中获取标签过滤条件tags，默认值为空列表
    tags = data.get('tags', [])
    
    # 从请求体中获取结果数量限制limit，默认值为10
    limit = data.get('limit', 10)

    # 如果搜索关键词为空，返回400错误，提示查询不能为空
    if not query:
        return jsonify({"error": "Query is required"}), 400

    # 使用notes服务进行搜索
    try:
        search_results = note.search_notes(query, top_k=limit)
        
        # 标签过滤
        if tags:
            filtered_results = []
            for result in search_results:
                note_tags = result.get('tags', [])
                if all(tag in note_tags for tag in tags):
                    filtered_results.append(result)
            search_results = filtered_results[:limit]
        
        return jsonify(search_results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500