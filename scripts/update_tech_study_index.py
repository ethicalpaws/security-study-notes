#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
update_tech_study_index.py - 更新 tech-study/index.md
汇总 knowledge、practice、weekly-check 三个板块的统计信息
"""

import os
import sys
import io
import re
import json
import yaml
from datetime import datetime
from typing import Dict

# 修复 Windows 控制台编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ==================== 配置 ====================
PROJECT_ROOT = r"E:\youth-sandbox\docs"
TECH_STUDY_PATH = os.path.join(PROJECT_ROOT, "tech-study")
INDEX_PATH = os.path.join(TECH_STUDY_PATH, "index.md")

KNOWLEDGE_PATH = os.path.join(TECH_STUDY_PATH, "knowledge")
PRACTICE_PATH = os.path.join(TECH_STUDY_PATH, "practice")
WEEKLY_PATH = os.path.join(TECH_STUDY_PATH, "weekly-check")
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CHARACTER_FILE = os.path.join(DATA_DIR, "character.json")

# ==================== 辅助函数 ====================

def parse_front_matter(content: str) -> Dict:
    """解析 Front Matter"""
    if not content.startswith('---'):
        return {}
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}
    try:
        return yaml.safe_load(parts[1]) or {}
    except:
        return {}

def read_index_metadata(index_path: str) -> Dict:
    """读取 index.md 的 Front Matter"""
    if not os.path.exists(index_path):
        return {}
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return parse_front_matter(content)

def scan_knowledge_stats() -> tuple:
    """
    扫描 knowledge 板块统计
    返回：(统计字符串, 链接路径)
    """
    if not os.path.exists(KNOWLEDGE_PATH):
        return "0篇笔记", "knowledge/"
    
    # 从 knowledge/index.md 的 Front Matter 读取 knowledge_notes
    index_path = os.path.join(KNOWLEDGE_PATH, "index.md")
    metadata = read_index_metadata(index_path)
    total_notes = metadata.get('knowledge_notes', 0)
    
    # 如果 Front Matter 没有，实际扫描
    if total_notes == 0:
        total_notes = 0
        for root, dirs, files in os.walk(KNOWLEDGE_PATH):
            for f in files:
                if f.endswith('.md') and f != 'index.md':
                    total_notes += 1
    
    return f"{total_notes}篇笔记", "knowledge/"

def scan_practice_stats() -> tuple:
    """扫描 practice 板块统计"""
    if not os.path.exists(PRACTICE_PATH):
        return "0个目标", "practice/"
    
    index_path = os.path.join(PRACTICE_PATH, "index.md")
    metadata = read_index_metadata(index_path)
    total_all = metadata.get('total_all', 0)
    
    return f"{total_all}个目标", "practice/"

def scan_weekly_stats() -> tuple:
    """扫描 weekly-check 板块统计"""
    if not os.path.exists(WEEKLY_PATH):
        return "0周", "weekly-check/"
    
    weeks = []
    for week_dir in os.listdir(WEEKLY_PATH):
        if week_dir.startswith('week') and os.path.isdir(os.path.join(WEEKLY_PATH, week_dir)):
            detection_path = os.path.join(WEEKLY_PATH, week_dir, "detection.md")
            if os.path.exists(detection_path):
                weeks.append(week_dir)
    
    if not weeks:
        return "0周", "weekly-check/"
    
    completed = 0
    for week_dir in weeks:
        detection_path = os.path.join(WEEKLY_PATH, week_dir, "detection.md")
        try:
            with open(detection_path, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r'id="totalScore">(\d+)</span>', content)
            if not match:
                match = re.search(r'得分[：:]\s*(\d+)(?:/100)?', content)
            if match and int(match.group(1)) > 0:
                completed += 1
        except:
            continue
    
    return f"{completed}/{len(weeks)}周", "weekly-check/"

def get_total_notes() -> int:
    """
    从 character.json 获取总笔记数
    包含：knowledge + practice + weekly-check 的所有笔记
    """
    if not os.path.exists(CHARACTER_FILE):
        return 0
    try:
        with open(CHARACTER_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('auto', {}).get('stats', {}).get('notes_count', 0)
    except Exception:
        return 0

def get_total_exp() -> int:
    """从 character.json 获取总经验值"""
    if not os.path.exists(CHARACTER_FILE):
        return 0
    try:
        with open(CHARACTER_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('auto', {}).get('total_exp', 0)
    except Exception:
        return 0

def generate_tech_study_index(dry_run: bool = False) -> None:
    """生成 tech-study/index.md"""
    print("=" * 60)
    print("📚 tech-study 板块总览 index.md 生成")
    print("=" * 60)
    print(f"路径: {INDEX_PATH}")
    print(f"模式: {'DRY RUN' if dry_run else '实际运行'}\n")
    
    # 获取统计数据（现在返回 (统计字符串, 链接路径)）
    knowledge_stats, knowledge_link = scan_knowledge_stats()
    practice_stats, practice_link = scan_practice_stats()
    weekly_stats, weekly_link = scan_weekly_stats()
    total_notes = get_total_notes()
    total_exp = get_total_exp()
    update_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"📖 知识笔记统计: {knowledge_stats}")
    print(f"🎯 实战练习统计: {practice_stats}")
    print(f"📋 每周检测统计: {weekly_stats}")
    print(f"📊 总笔记数: {total_notes}")
    print(f"⭐ 总经验值: {total_exp}")
    
    # 生成内容 - 板块名称改为链接
    content = f"""# 📚 技术学习

> 网络安全知识体系，从基础到进阶，理论与实践结合。

## 📖 学习板块

| 板块 | 说明 | 统计 |
|------|------|:----:|
| [📖 知识笔记]({knowledge_link}) | 网络安全知识体系，从基础到进阶 | {knowledge_stats} |
| [🎯 实战练习]({practice_link}) | CTF、CVE、SRC 实战记录 | {practice_stats} |
| [📋 每周检测]({weekly_link}) | 每周学习成果自测 | {weekly_stats} |

## 📊 统计

- **总笔记数**：{total_notes}（包含知识笔记 + 实战 WriteUp + 周报）
- **总经验值**：{total_exp}
- **最后更新**：{update_time}

---
*自动更新*
"""
    
    if dry_run:
        print("\n[DRY RUN] 将写入以下内容:")
        print("-" * 40)
        print(content)
        print("-" * 40)
    else:
        with open(INDEX_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ 已生成: {INDEX_PATH}")
    
    print("=" * 60)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="更新 tech-study/index.md")
    parser.add_argument("--dry-run", action="store_true", help="模拟运行，不实际写入")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    args = parser.parse_args()
    
    dry_run = args.dry_run or os.environ.get("DRY_RUN", "0") == "1"
    generate_tech_study_index(dry_run)