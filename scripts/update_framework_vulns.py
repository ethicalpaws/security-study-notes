#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
framework-vulns 模块 index.md 自动生成脚本
优化版：使用 common.py 公共模块
递归处理二级及更深层子模块
"""

import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from common import (
    logger, load_config, read_metadata,
    get_status_emoji, get_current_time, safe_write,
    get_knowledge_path, progress_bar
)

# ==================== 配置 ====================
KNOWLEDGE_PATH = get_knowledge_path()
FRAMEWORK_PATH = os.path.join(KNOWLEDGE_PATH, "05-java-security", "framework-vulns")

# 子模块模板
SUB_MODULE_TEMPLATE = '''---
module_name: {module_name}
description: {description}
status: {module_status}
total_notes: {total_notes}
completed: {completed}
in_progress: {in_progress}
not_started: {not_started}
completion_rate: {completion_rate}
last_updated: {last_updated}
---

# {module_name}

> {description}

## 模块状态：{module_status}

## 📊 学习统计

| 指标 | 数值 |
|------|:----:|
| 总笔记数 | {total_notes} |
| ✅ 已完成 | {completed} |
| 🔄 进行中 | {in_progress} |
| ⬜ 未开始 | {not_started} |
| 完成率 | {progress_bar} |

## 📖 学习内容

| 笔记 | 描述 | 状态 |
|------|------|:----:|
{notes_table}

---
*自动更新：{update_time}
'''

# 父模块汇总模板 - 子模块名称改为链接
PARENT_TEMPLATE = '''---
total_modules: {total_modules}
total_notes: {total_notes}
completed: {completed}
in_progress: {in_progress}
not_started: {not_started}
completion_rate: {completion_rate}
last_updated: {last_updated}
---

# 📚 框架漏洞

> Java框架漏洞学习汇总

## 📊 学习统计

| 指标 | 数值 |
|------|:----:|
| 子模块数 | {total_modules} |
| 总笔记数 | {total_notes} |
| ✅ 已完成 | {completed} |
| 🔄 进行中 | {in_progress} |
| ⬜ 未开始 | {not_started} |
| 完成率 | {progress_bar} |

## 📖 子模块列表

| 模块 | 笔记数 | 已完成 | 完成率 | 状态 |
|------|:------:|:------:|:------:|:----:|
{module_rows}

---
*自动更新：{update_time}
'''

def normalize_date(value):
    """将日期值统一转换为字符串，用于排序和显示"""
    if value is None:
        return ''
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%d')
    if isinstance(value, str):
        return value
    return str(value)

def collect_notes_recursive(module_dir: str) -> list:
    """递归收集模块目录下所有笔记的元数据"""
    notes_data = []
    
    for root, dirs, files in os.walk(module_dir):
        if root == module_dir:
            md_files = [f for f in files if f.endswith('.md') and f != 'index.md']
        else:
            md_files = [f for f in files if f.endswith('.md')]
        
        for note_file in md_files:
            note_path = os.path.join(root, note_file)
            metadata = read_metadata(note_path)
            
            title = metadata.get('title', note_file.replace('.md', ''))
            description = metadata.get('description', '')
            status_cn = metadata.get('status', '未开始')
            finish_date = metadata.get('finish-date', '')
            
            # 统一转换日期为字符串
            finish_date_str = normalize_date(finish_date)
            
            rel_path = os.path.relpath(note_path, module_dir)
            
            notes_data.append({
                'file': rel_path,
                'title': title,
                'description': description,
                'status_cn': status_cn,
                'finish_date': finish_date_str
            })
    
    return notes_data

def update_sub_module(module_dir: str, module_name: str, dry_run: bool = False) -> dict:
    """更新单个子模块的 index.md"""
    logger.info(f"  处理子模块: {module_name}")
    
    notes_data = collect_notes_recursive(module_dir)
    
    if not notes_data:
        logger.warning(f"    跳过：未找到笔记文件")
        return None
    
    total = len(notes_data)
    completed = sum(1 for n in notes_data if n['status_cn'] == '已完成')
    in_progress = sum(1 for n in notes_data if n['status_cn'] == '进行中')
    not_started = sum(1 for n in notes_data if n['status_cn'] == '未开始')
    completion_rate = int(completed / total * 100) if total > 0 else 0
    progress = progress_bar(completion_rate)
    
    if completed == total:
        module_status = "♻️"
    elif completed > 0 or in_progress > 0:
        module_status = "🔄"
    else:
        module_status = "⬜"
    
    # 生成笔记表格（按完成日期倒序，字符串排序安全）
    notes_data.sort(key=lambda x: x.get('finish_date', ''), reverse=True)
    
    notes_table_lines = []
    for n in notes_data:
        status_emoji = get_status_emoji(n['status_cn'])
        desc_short = n['description'][:50] + "..." if len(n['description']) > 50 else n['description']
        notes_table_lines.append(f"| [{n['title']}]({n['file']}) | {desc_short} | {status_emoji} |")
    notes_table = "\n".join(notes_table_lines)
    
    update_time = get_current_time()
    
    content = SUB_MODULE_TEMPLATE.format(
        module_name=module_name,
        description=f"{module_name} 框架漏洞学习笔记",
        module_status=module_status,
        total_notes=total,
        completed=completed,
        in_progress=in_progress,
        not_started=not_started,
        completion_rate=completion_rate,
        progress_bar=progress,
        notes_table=notes_table,
        update_time=update_time,
        last_updated=update_time
    )
    
    index_path = os.path.join(module_dir, 'index.md')
    
    if safe_write(index_path, content, dry_run):
        logger.info(f"    ✅ 已生成 {module_name}/index.md (总笔记: {total}, 完成: {completed}, 完成率: {completion_rate}%)")
    
    return {
        'name': module_name,
        'total_notes': total,
        'completed': completed,
        'in_progress': in_progress,
        'not_started': not_started,
        'completion_rate': completion_rate,
        'module_status': module_status
    }

def update_parent_index(sub_modules_data: list, dry_run: bool = False) -> None:
    """更新父模块 framework-vulns/index.md"""
    if not sub_modules_data:
        logger.warning("  跳过：无子模块数据")
        return
    
    total_modules = len(sub_modules_data)
    total_notes = sum(m['total_notes'] for m in sub_modules_data)
    completed = sum(m['completed'] for m in sub_modules_data)
    in_progress = sum(m['in_progress'] for m in sub_modules_data)
    not_started = sum(m['not_started'] for m in sub_modules_data)
    completion_rate = int(completed / total_notes * 100) if total_notes > 0 else 0
    progress = progress_bar(completion_rate)
    
    # 生成子模块表格 - 模块名改为链接
    module_rows = []
    for m in sub_modules_data:
        # 模块名作为链接，指向子模块的 index.md
        module_link = f"[{m['name']}]({m['name']}/index.md)"
        module_rows.append(f"| {module_link} | {m['total_notes']} | {m['completed']} | {m['completion_rate']}% | {m['module_status']} |")
    
    update_time = get_current_time()
    
    content = PARENT_TEMPLATE.format(
        total_modules=total_modules,
        total_notes=total_notes,
        completed=completed,
        in_progress=in_progress,
        not_started=not_started,
        completion_rate=completion_rate,
        progress_bar=progress,
        module_rows="\n".join(module_rows),
        update_time=update_time,
        last_updated=update_time
    )
    
    index_path = os.path.join(FRAMEWORK_PATH, 'index.md')
    
    if safe_write(index_path, content, dry_run):
        logger.info(f"\n  ✅ 已生成 framework-vulns/index.md (总模块: {total_modules}, 总笔记: {total_notes}, 完成: {completed})")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="模拟运行")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    args = parser.parse_args()
    
    dry_run = args.dry_run or os.environ.get("DRY_RUN", "0") == "1"
    
    logger.info("=" * 60)
    logger.info("framework-vulns 模块 index.md 自动生成脚本")
    logger.info("=" * 60)
    logger.info(f"目标模块: {FRAMEWORK_PATH}")
    logger.info(f"模式: {'DRY RUN' if dry_run else '实际运行'}")
    
    if not os.path.exists(FRAMEWORK_PATH):
        logger.error(f"路径不存在: {FRAMEWORK_PATH}")
        return
    
    # 获取所有子模块目录（一级）
    sub_modules = [d for d in os.listdir(FRAMEWORK_PATH)
                   if os.path.isdir(os.path.join(FRAMEWORK_PATH, d))
                   and not d.startswith('.')]
    
    logger.info(f"\n发现子模块: {sub_modules}")
    logger.info("\n开始更新子模块...")
    
    sub_modules_data = []
    for module_name in sub_modules:
        module_dir = os.path.join(FRAMEWORK_PATH, module_name)
        data = update_sub_module(module_dir, module_name, dry_run)
        if data:
            sub_modules_data.append(data)
    
    logger.info("\n开始更新父模块汇总...")
    update_parent_index(sub_modules_data, dry_run)
    
    logger.info("\n" + "=" * 60)
    logger.info("完成！")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()