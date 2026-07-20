---
title: 
description: 
tags: []
status: 
finish-date: 
difficulty: 
---

# Agent型内存马
## 核心思路
>不新增任何组件，而是直接修改 JVM 中已加载类的字节码，在正常的业务代码中植入恶意逻辑。

这意味着什么？

- 不注册任何 Filter/Listener/Servlet/Controller

- 不增加任何新的类或对象

- 直接在 Tomcat/Spring 的核心类（如 HttpServlet）中插入命令执行代码

- 即使应用重启，只要 Agent 被重新加载，后门依然存在

- 检测难度极高，因为没有新组件可查

## Java Agent 基础概念
### 什么是 Java Agent？
>Java Agent 是一个特殊的 Java 程序，可以在 JVM 启动时或运行时修改已加载类的字节码。

```
正常流程：
    Java 代码 → 编译成 .class → JVM 加载 → 执行

Agent 介入后：
    Java 代码 → 编译成 .class → 【Agent 修改字节码】→ JVM 加载修改后的类 → 执行
```

### Agent 的两种模式

| 模式 | 触发时机 | 入口方法 | 适用场景 |
|------|----------|----------|----------|
| `premain` | JVM 启动时 | `public static void premain(String args, Instrumentation inst)` | 启动时挂载 |
| `agentmain` | JVM 运行时 | `public static void agentmain(String args, Instrumentation inst)` | 动态挂载（内存马用这个） |

内存马使用的是 agentmain，因为它可以在应用运行时动态挂载，不需要重启。

### 核心工具：Instrumentation
>java.lang.instrument.Instrumentation 是 Java 提供的字节码修改 API

- addTransformer(ClassFileTransformer transformer)	添加字节码转换器

- retransformClasses(Class<?>... classes)	重新定义已加载的类

- getAllLoadedClasses()	获取 JVM 中所有已加载的类

## Agent 型内存马的工作流程
```
【攻击者视角】

1. 找到代码执行入口（JSP/反序列化/表达式注入）
2. 在目标 JVM 中动态加载 Agent Jar 包
3. Agent 通过 Instrumentation API 修改目标类的字节码
4. 在目标类的方法中插入恶意代码（如命令执行）
5. 目标类被重新定义，所有调用都会执行恶意代码

【用户视角】

用户访问正常页面 → 目标方法执行 → 恶意代码被执行 → 正常逻辑继续执行 → 用户无感知
```

## Agent 型内存马的完整实现
### 第一步：编写 Agent 类
### 第二步：打包成 Jar
### 第三步：动态加载 Agent
### or:使用 Javassist 简化字节码修改
## 完整 Agent 型内存马注入器（JSP）

## 核心流程图
```
用户访问任意页面 ?cmd=whoami
    ↓
Tomcat 接收请求
    ↓
调用 HttpServlet.service() 方法
    ↓
【已修改的字节码】先执行插入的恶意代码
    ↓
检测到 cmd 参数 → 执行命令 → 返回结果
    ↓
继续执行原始 service() 逻辑（或直接返回）
```

## Agent 型内存马的优势与局限性
### 优势

- 无新增组件	不添加任何 Filter/Controller/Interceptor，检测工具无从发现

- 跨容器	只要目标类存在，Tomcat/Jetty/WebLogic 都适用

- 深入 JVM	直接修改字节码，在最底层植入后门

- 持久化	如果 Agent 被保存并重新加载，重启后仍有效

### 局限性

- 技术门槛高	需要理解字节码、JVM 底层机制

- 需要字节码库	需要引入 Javassist 或 ASM 库

- 权限要求高	需要足够的 JVM 权限

- 环境依赖	需要 Agent Jar 或通过 JVM 参数启动

- 可能影响稳定性	字节码修改错误可能导致应用崩溃

## 总结
>Agent 型内存马的本质是：利用 Java Instrumentation API，在 JVM 运行时动态修改已加载类的字节码，在正常业务代码中植入恶意逻辑，不新增任何组件，实现最高级别的隐蔽后门。

