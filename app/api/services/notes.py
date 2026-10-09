"""
笔记模块
负责笔记的存储、检索、管理
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional

class Notes:


    def __init__(self, storage: str = "notes_storage"):

        self.storage_path = storage
        self.notes: Dict[str, Dict] = {}

        if not os.path.exists(self.storage_path):
            os.makedirs(self.storage_path)

        self._load_notes()

    def _load_notes(self) -> None:

        try:
            for filename in os.listdir(self.storage_path):
                if filename.endswith('.json'):
                    note_id = filename[:-5]  
                    file_path = os.path.join(self.storage_path, filename)

                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            note_data = json.load(f)
                            self.notes[note_id] = note_data
                    except Exception as e:
                        print(f"加载笔记 {note_id} 失败: {e}")
        except Exception as e:
            print(f"加载笔记时发生错误: {e}")

    def _save_note(self, note_id: str, note_data: Dict) -> bool:

        try:
            file_path = os.path.join(self.storage_path, f"{note_id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(note_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存笔记 {note_id} 失败: {e}")
            return False

    def _delete_note_file(self, note_id: str) -> bool:

        try:
            file_path = os.path.join(self.storage_path, f"{note_id}.json")
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            print(f"删除笔记 {note_id} 失败: {e}")
            return False

    def add_note(self, title: str, content: str, tags: Optional[List[str]] = None,
                source: str = "") -> Optional[str]:

        if not title or not content:
            return None

        # 生成唯一ID
        note_id = str(uuid.uuid4())

        # 创建笔记数据
        now = datetime.utcnow().isoformat() + "Z"
        note_data = {
            "id": note_id,
            "title": title,
            "content": content,
            "tags": tags or [],
            "source": source,
            "created_at": now,
            "updated_at": now
        }

        # 保存笔记
        if self._save_note(note_id, note_data):
            self.notes[note_id] = note_data
            return note_id
        return None

    def get_note(self, note_id: str) -> Optional[Dict]:

        return self.notes.get(note_id)

    def update_note(self, note_id: str, title: Optional[str] = None,
                   content: Optional[str] = None, tags: Optional[List[str]] = None,
                   source: Optional[str] = None) -> bool:

        if note_id not in self.notes:
            return False

        note_data = self.notes[note_id].copy()

        # 更新字段
        if title is not None:
            note_data["title"] = title
        if content is not None:
            note_data["content"] = content
        if tags is not None:
            note_data["tags"] = tags
        if source is not None:
            note_data["source"] = source

        # 更新时间戳
        note_data["updated_at"] = datetime.utcnow().isoformat() + "Z"

        # 保存更新
        if self._save_note(note_id, note_data):
            self.notes[note_id] = note_data
            return True
        return False

    def delete_note(self, note_id: str) -> bool:

        if note_id not in self.notes:
            return False

        # 删除文件和内存中的笔记
        if self._delete_note_file(note_id):
            del self.notes[note_id]
            return True
        return False

    def list_notes(self, limit: int = 50, offset: int = 0) -> List[Dict]:

        # 按更新时间降序排序
        sorted_notes = sorted(
            self.notes.values(),
            key=lambda x: x["updated_at"],
            reverse=True
        )

        # 应用分页
        start = max(0, offset)
        end = start + limit
        return sorted_notes[start:end]

    def calculate_similarity(self, query: str, note_title: str, note_content: str) -> float:
        """
        计算查询与笔记之间的相似度
        使用改进的关键词匹配算法，考虑词频和权重
        
        :param query: 查询字符串
        :param note_title: 笔记标题
        :param note_content: 笔记内容
        :return: 相似度分数（0-1之间）
        """
        if not query:
            return 0.0
        
        # 转换为小写并分割为单词
        query_words = set(query.lower().split())
        title_words = note_title.lower().split()
        content_words = note_content.lower().split()
        
        # 计算匹配的关键词数量
        title_matches = len(query_words.intersection(set(title_words)))
        content_matches = len(query_words.intersection(set(content_words)))
        
        # 计算总匹配分数，标题权重更高
        title_weight = 2.0
        content_weight = 1.0
        
        total_score = (title_matches * title_weight) + (content_matches * content_weight)
        
        # 归一化分数到0-1范围
        max_possible_score = len(query_words) * (title_weight + content_weight)
        if max_possible_score == 0:
            return 0.0
        
        similarity = total_score / max_possible_score
        return round(similarity, 3)
    
    def search_notes(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        搜索笔记
        :param query: 搜索关键词
        :param top_k: 返回前k个结果
        :return: 搜索结果列表
        """
        if not query:
            return []

        results = []

        for note in self.notes.values():
            # 使用改进的相似度算法计算相似度
            similarity = self.calculate_similarity(query, note["title"], note["content"])
            
            if similarity > 0:
                result = note.copy()
                result["similarity"] = similarity
                results.append(result)

        # 按相似度降序排序并取前top_k个
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def get_note_count(self) -> int:
        """获取笔记总数"""
        return len(self.notes)

    def get_all_tags(self) -> List[str]:
        """获取所有标签"""
        tags = set()
        for note in self.notes.values():
            tags.update(note["tags"])
        return sorted(tags)

# 创建笔记实例
note = Notes()