---
title: 
description: 
tags: []
status: 
finish-date: 
difficulty: 
---

# 内存马检测

## 核心检测思路
>一句话概括：内存马一定要“活在某个地方”，找到那个“藏身处”，就能检测它

| 内存马类型 | 藏身处 | 检测思路 |
|------------|--------|----------|
| Filter / Listener / Servlet | Tomcat 的 StandardContext | 遍历组件注册表，找"非预期"组件 |
| Spring Controller / Interceptor | Spring 的 HandlerMapping | 对比启动时的路由表，找新增路由 |
| Agent 型 | JVM 已加载的类字节码 | 对比原始 Class 文件，找字节码差异 |
| Thread 型 | JVM 线程栈 | 监控线程列表和线程堆栈 |

## 容器层检测（Tomcat）

**核心检测逻辑**
```java

```