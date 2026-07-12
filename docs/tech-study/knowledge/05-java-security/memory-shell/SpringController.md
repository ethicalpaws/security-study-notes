---
title: 
description: 
tags: []
status: 
finish-date: 
difficulty: 
---

# SpringController型内存马

## 为什么需要 Spring Controller 型内存马
## Spring 请求处理的核心组件

## Spring Controller 型内存马的核心思路

## 正常 Controller 的注册过程

## Spring Controller 型内存马的完整流程

## 与 Filter 型内存马的关键差异

## Spring Controller 型内存马的优势

## 总结
>Spring Controller 型内存马的本质是：利用代码执行入口，获取 Spring 的 RequestMappingHandlerMapping，在运行时动态注册一个恶意 Controller 方法并绑定到指定 URL，使其融入 Spring 应用的正常请求处理流程，实现无文件后门。

| 要点 | 说明 |
|------|------|
| 获取上下文 | 从 `request.getServletContext()` 或 `WebApplicationContextUtils` 获取 |
| 获取 HandlerMapping | `context.getBean(RequestMappingHandlerMapping.class)` |
| 注册方法 | `handlerMapping.registerMapping(mappingInfo, controller, method)` |
| 路径选择 | 尽量伪装成正常业务路径（如 `/api/status`、`/admin/health`） |
| 版本兼容 | Spring 4.x 和 5.x 的 API 基本一致 |
