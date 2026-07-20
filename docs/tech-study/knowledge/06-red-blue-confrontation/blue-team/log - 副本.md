---
title: 
description: 
tags: []
status: 
finish-date: 
difficulty: 
---

# 查找可疑文件

## 攻击者的隐藏手法

- 以.开头

- 藏进隐藏目录

- 文件名添加空格开头

- 文件名添加不可见字符

- 伪造时间戳

## 查找隐藏文件
>只用普通 ls 不足以排查入侵现场。查看 Web 目录时,至少要组合用 ls -a(看隐藏)、ls -lart(看时间)、cat -A(看不可见字符)。隐藏文件、空格文件名、不可见字符文件名、异常时间窗口,都是发现 WebShell 的第一批信号

`ls -lart | cat -A`
![](IR-basic/2026-07-13-15-01-41.png)

- l:详细

- a:显示隐藏

- r:反向排序

- t:按时间排序

- `cat -A`:显示不可见字符
![](IR-basic/2026-07-13-15-05-12.png)
###  IOC（失陷指标）清单
```
可疑文件：
- /tmp/webshell_test/.shell/.shell.php
- /tmp/webshell_test/.shell.php
- /tmp/webshell_test/ shell.php
- /tmp/webshell_test/​config.php
- /tmp/webshell_test/​.config.php

可疑原因：
- 隐藏文件 / 隐藏目录
- 文件名前导空格
- 文件名包含不可见字符（零宽字符）
- Web 目录中出现异常 PHP 文件
- 时间戳异常（攻击时间窗 / 被伪造成很早）

下一步：
- 用 stat 检查真实时间戳
- 用 file 判断真实文件类型
- 用 grep / strings 检查文件内容
```

## 时间戳、inode 与文件元数据排查

>发现可疑文件以后,下一步看时间
>
>从 find 到 stat：判断可疑文件到底是什么时候出现的
>
>攻击者可能把 WebShell 的修改时间伪造成很早以前,让它假装"一直都在"
>
>应急响应不能只看文件名,还要看文件的元数据:修改时间、状态变化时间、创建时间和 inode。

### inux 文件时间四兄弟
>.shell.php 的 Modify(mtime) 是 2020-02-01,但 Change(ctime) 却是 2025-11-29。
>
>内容修改时间很早,元数据变化时间很新 —— 这通常说明文件被 touch 伪造过时间。

| 字段 | 含义 | 应急价值 |
|------|------|----------|
| Access / atime | 最后访问时间 | 可参考，但常被挂载策略影响，不太可靠 |
| Modify / mtime | 文件内容最后修改时间 | 攻击者最常伪造的时间 |
| Change / ctime | 文件元数据最后变化时间 | 普通 `touch` 改不动，排查价值最高 |
| Birth | 文件创建时间 | 部分文件系统支持，可辅助识别假时间线 |

### 文件查询命令

#### find -mtime
>这条命令适合"刚发现入侵"时快速锁定最近被改动的文件。但要警惕:如果攻击者用 touch 把 mtime 伪造成很早,-mtime 就会漏掉真正的 WebShell——所以它不能单独用。

示例：find ./ -type f -mtime 1

- -mtime -1 最近24h

- -type f 只看文件

#### find -newermt查精确时间窗口
>-newermt 按具体日期查找,比 -mtime 更适合复盘某个攻击时间窗口。但全局查找会混进系统文件噪声——不能看到结果就判恶意,要结合目录位置、文件名、类型、时间窗口综合判断

示例：find ./ -newermt "2020-02-01 00:00:00" ! -newermt "2020-02-01 23:59:59"

#### stat：看完整元数据,识破伪造
>判断规则:mtime 很旧 + ctime 很新 = 高度怀疑 touch 时间戳伪造。

示例：stat .shell.php
```
File: .shell.php 
Size: 2097182 
Access: 2020-02-01 11:52:50 +0000 
Modify: 2020-02-01 11:52:50 +0000 ← 内容修改时间（看着很老） 
Change: 2025-11-29 02:46:41 +0000 ← 元数据变化时间（其实很新！） Birth: -
```
![](find-suspicious-files/2026-07-17-22-18-27.png)

*这里 Modify 停在 2020 年,Change 却是 2025 年——文件状态明明在 2025 年才变过,mtime 却谎称 2020,攻击者动了手脚*

#### Birth time 与"改系统时间"造假
>更狡猾的造假是先把系统时间往回调,再创建文件,这样连 ctime 都跟着变早。

示例：
```
timedatectl set-ntp false # 关掉网络对时  
date -s "2020-01-01 12:00:00" # 把系统时间调回2020 
touch time.c 
stat time.c

输出：Access/Modify/Change → 2020-01-01（全被骗） Birth → 2026-03-07（真实创建时间，露馅了）
```

*Birth time 不一定每个文件系统都支持,但只要支持,它能帮你识破"靠改系统时间制造的假时间线"——因为它记录的是文件系统层面的真实创建记录。*

#### inode：文件的身份证
>文件名只是外号,inode 才是文件在文件系统里的身份证。文件可以改名,但 inode 不会因为改名而变。所以排查"被改名、移动、做了硬链接"的文件时,inode 很有用

示例：
```
ls -i .shell.php            先拿到inode号
find /tmp -inum <inode>     然后找出该inode对应的所有路径
```

*注意：改名不改inode*

###  IOC（失陷指标）清单
```
可疑文件：
- /tmp/webshell_test/.shell.php
- /tmp/webshell_test/.shell/
- /var/tmp/.shell/.shell.php

时间异常：
- .shell.php 的 Modify 为 2020-02-01
- .shell.php 的 Change 为 2025-11-29
- mtime 和 ctime 不一致，疑似 touch 伪造

攻击时间窗口：
- 文件表面 mtime 指向 2020-02-01
- 实际状态变化更接近 2025-11-29

下一步（后续章节）：
- 用 file 判断真实文件类型
- 用 strings / grep 检查文件内容
- 结合 Web 日志确认是否被访问
```

