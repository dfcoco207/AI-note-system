"""
笔记数据模型
"""

import datetime
import uuid

class Note(dict):
    def __init__(self, id=None, title="", content="", tags=None, source="", created_at=None, updated_at=None):
        # 初始化字典内容
        super().__init__()
        self['id'] = id or str(uuid.uuid4())
        self['title'] = title
        self['content'] = content
        self['tags'] = tags or []
        self['source'] = source
        self['created_at'] = created_at or datetime.datetime.utcnow()
        self['updated_at'] = updated_at or datetime.datetime.utcnow()
        
    # 保留属性访问方式，确保兼容性
    @property
    def id(self):
        return self['id']
    
    @id.setter
    def id(self, value):
        self['id'] = value
    
    @property
    def title(self):
        return self['title']
    
    @title.setter
    def title(self, value):
        self['title'] = value
    
    @property
    def content(self):
        return self['content']
    
    @content.setter
    def content(self, value):
        self['content'] = value
    
    @property
    def tags(self):
        return self['tags']
    
    @tags.setter
    def tags(self, value):
        self['tags'] = value
    
    @property
    def source(self):
        return self['source']
    
    @source.setter
    def source(self, value):
        self['source'] = value
    
    @property
    def created_at(self):
        return self['created_at']
    
    @created_at.setter
    def created_at(self, value):
        self['created_at'] = value
    
    @property
    def updated_at(self):
        return self['updated_at']
    
    @updated_at.setter
    def updated_at(self, value):
        self['updated_at'] = value
    
    def to_dict(self):
        """将模型转换为字典（保持兼容性）"""
        return {
            "id": self['id'],
            "title": self['title'],
            "content": self['content'],
            "tags": self['tags'],
            "source": self['source'],
            "created_at": self['created_at'].isoformat() + "Z",
            "updated_at": self['updated_at'].isoformat() + "Z"
        }
    
    def to_search_result(self, similarity=1.0):
        """将模型转换为搜索结果格式"""
        result = self.to_dict()
        result["similarity"] = similarity
        return result
    
    @classmethod
    def from_dict(cls, data):
        """从字典创建Note实例"""
        # 处理时间字段
        created_at = data.get('created_at')
        if created_at and isinstance(created_at, str):
            created_at = datetime.datetime.fromisoformat(created_at.rstrip('Z'))
            
        updated_at = data.get('updated_at')
        if updated_at and isinstance(updated_at, str):
            updated_at = datetime.datetime.fromisoformat(updated_at.rstrip('Z'))
        
        return cls(
            id=data.get('id'),
            title=data.get('title', ''),
            content=data.get('content', ''),
            tags=data.get('tags', []),
            source=data.get('source', ''),
            created_at=created_at,
            updated_at=updated_at
        )