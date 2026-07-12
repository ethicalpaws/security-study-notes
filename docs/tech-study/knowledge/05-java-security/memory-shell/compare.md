---
title: 
description: 
tags: []
status: 
finish-date: 
difficulty: 
---

# 

## 内存马技术栈简易分类图
```text
【内存马技术栈】
        │
        ├── Ⅰ. 容器层（Web容器/应用服务器）
        │       │
        │       ├── ✅ Filter 型
        │       │   └── 寄生位置: Tomcat StandardContext (FilterChain)
        │       │
        │       ├── ✅ Listener 型
        │       │   └── 寄生位置: Tomcat StandardContext (事件监听列表)
        │       │
        │       └── ✅ Servlet 型
        │           └── 寄生位置: Tomcat StandardContext (Wrapper组件)
        │
        ├── Ⅱ. 框架层（Spring / Spring Boot）
        │       │
        │       ├── ✅ Spring Controller 型
        │       │   └── 寄生位置: RequestMappingHandlerMapping (路由映射表)
        │       │
        │       └── ✅ Spring Interceptor 型
        │           └── 寄生位置: InterceptorRegistry (拦截器注册表)
        │
        └── Ⅲ. JVM层（Java虚拟机底层）
                │
                ├── ✅ Agent 型
                │   └── 寄生位置: 已加载类的字节码 (通过 Instrumentation API)
                │
                └── ✅ Thread 型
                    └── 寄生位置: JVM 运行时数据区 (独立/劫持线程栈)
```