---
title: Java-Web基础（综合）
description: Java Web 安全知识体系全景梳理，涵盖 JSP/ASP/PHP 动态页面技术对比、Web服务器与应用服务器（Apache/Nginx/Tomcat/IIS）分类与关系、Spring框架定位与安全关注点、Java Web 攻击入口类型与完整攻击链推演，以及常见问题解答
tags: [Java-Web, JSP, Servlet, Tomcat, IIS, Nginx, Apache, Spring, 内存马, 反序列化, 攻击链]
status: 已完成
finish-date: 2026-07-12
difficulty: 中等
---

# Java-Web基础

## 基本概念

#### JSP（JavaServer Pages）的本质

JSP的全称为JavaServer Pages，即Java服务器页面。其技术实质是**允许在HTML页面中嵌入Java代码**，从而实现动态内容生成。与静态HTML页面相比，JSP页面能够根据请求参数、时间、数据库状态等因素动态生成响应内容。

**JSP的工作流程**：当用户访问一个JSP文件时，Tomcat容器会将该JSP文件**自动翻译成一个Java类**（该类实际上是一个Servlet），随后编译成class文件并加载执行，最终将生成的HTML内容返回给浏览器。

**JSP与Servlet的关系**：JSP最终会被容器翻译为Servlet，二者本质上等价。区别在于编写方式——Servlet是纯Java类，需要处理输出流以生成HTML；JSP则是在HTML中嵌入Java代码，更接近视图层。

**JSP的核心语法**（针对安全分析场景，仅需掌握以下三种）：

| 语法形式 | 用途 | 示例 |
|----------|------|------|
| `<%@ page import="..." %>` | 导入Java类，类似于Java的import语句 | `<%@ page import="java.io.*" %>` |
| `<%! ... %>` | 声明成员变量或内部类，在Servlet类级别生效 | `<%! class MyFilter implements Filter { ... } %>` |
| `<% ... %>` | 编写执行代码，在`_jspService()`方法中执行 | `<% Runtime.getRuntime().exec("calc"); %>` |

#### 1.2 ASP（Active Server Pages）的定位

ASP是微软公司推出的动态服务器页面技术，可理解为**微软体系下的JSP**。其主要特征如下：

| 对比维度 | JSP | ASP |
|----------|-----|-----|
| 所属体系 | Sun（现Oracle），Java生态 | 微软，.NET生态 |
| 运行环境 | Tomcat、WebLogic等Java容器 | IIS（Internet Information Services） |
| 脚本语言 | Java | VBScript或JavaScript |
| 文件后缀 | `.jsp` | `.asp` |
| 命令执行方式 | `Runtime.exec()` | `CreateObject("WScript.Shell").Exec()` |

ASP在Windows服务器+IIS的组合中仍有遗留系统在使用。ASP内存马的原理与JSP内存马完全一致，只是代码语言从Java变为VBScript，操作对象从Tomcat变为IIS。

#### 1.3 PHP的定位

PHP是一种通用的开源脚本语言，尤其适用于Web开发。在Web安全领域，PHP与JSP、ASP并称为传统Web安全的"老三样"，三者共同特征为：**都能在HTML中嵌入后端代码，动态生成网页内容**。PHP通常运行于Apache或Nginx服务器上，通过mod_php或PHP-FPM处理请求。

---

### Web服务器与应用服务器的分类与关系

#### 2.1 Tomcat：Java应用的容器

Tomcat是由Apache基金会开发的开源Web应用服务器，其核心功能是**运行Java Web程序**，即JSP和Servlet。Tomcat属于Java生态中的应用服务器范畴，跨平台支持Windows、Linux、macOS等操作系统。

**Tomcat在内存马中的作用**：内存马实际寄生在Tomcat的内存结构中，具体而言是`StandardContext`对象所管理的Filter、Servlet或Listener组件。Tomcat处理请求时会经过一个Filter链，若攻击者在此链中插入恶意Filter，即可实现全局请求拦截与命令执行。

**Tomcat的关键内部组件**：

- `StandardContext`：Web应用上下文，每个应用对应一个实例，管理Filter、Servlet、Listener
- `ApplicationFilterChain`：当前请求的过滤器链，包含实际执行的Filter数组
- `FilterDef`：Filter的定义描述，包含类名和实例
- `FilterMap`：Filter的映射规则，定义URL路径与Dispatcher类型

#### 2.2 IIS：微软应用的容器

IIS（Internet Information Services）是微软公司的Web服务器软件，专用于Windows操作系统，核心功能为**运行ASP和.NET程序**。在内存马场景下，IIS中的寄生位置为`HttpApplication`或`IHttpModule`，原理与Tomcat内存马类似。

#### 2.3 Apache与Nginx：前置Web服务器

Apache（全称Apache HTTP Server）与Nginx（读作"Engine X"）属于**Web服务器**软件，功能定位为请求分发与静态资源处理。与Tomcat/IIS这类应用服务器形成前后端协作关系。

**Apache与Nginx的核心差异**：

| 对比维度 | Apache | Nginx |
|----------|--------|-------|
| 诞生时间 | 1995年 | 2004年 |
| 请求处理模型 | 一个请求占用一个线程 | 事件驱动，单线程处理海量请求 |
| 并发能力 | 相对较低 | 极高 |
| 配置复杂度 | 较复杂 | 简洁优雅 |

**实际部署中的组合方式**：Nginx（或Apache）在前端处理静态资源（图片、CSS、JS）并做负载均衡，Tomcat在后端专注运行业务逻辑（JSP/Servlet）。这种架构发挥了两者的优势：Nginx的高并发处理能力与Tomcat的Java代码执行能力。

#### 2.4 四者关系总结

| 组件 | 类型 | 职责 | 典型运行环境 |
|------|------|------|--------------|
| Apache | Web服务器 | 静态资源、反向代理、负载均衡 | 跨平台 |
| Nginx | Web服务器（高性能） | 静态资源、反向代理、负载均衡、API网关 | 跨平台 |
| Tomcat | Java应用服务器 | 运行JSP/Servlet（Java业务代码） | 跨平台 |
| IIS | 微软应用服务器 | 运行ASP/.NET（微软业务代码） | 仅Windows |

---

### Spring框架的定位与机制

Spring框架是Java企业级应用开发的事实标准，其核心功能通过**控制反转（IoC）** 和**面向切面编程（AOP）** 简化了Java应用的开发流程。

在Web层，Spring MVC通过注解（如`@Controller`、`@RequestMapping`、`@PostMapping`）将HTTP请求自动映射到Java方法。这种映射机制极大地提高了开发效率，但从安全视角引入了一个关键特征：**`@RequestBody`注解会自动将HTTP Body中的JSON/XML数据反序列化为Java对象**。这一过程是反序列化漏洞在JavaWeb环境中的主要入口点。

Spring Boot框架进一步简化了配置，通过"约定大于配置"的原则，内嵌Tomcat容器并自动配置各种组件。在Spring环境中，内存马除了可以寄生在Filter链中，还可以通过动态注册Controller方法实现更隐蔽的后门，即**Controller型内存马**，其无Filter特征，检测难度更高。

---


### 攻击入口的完整形态

在JavaWeb环境中，获得代码执行权限是实施进一步攻击的前提。以下是常见且具备实际利用价值的入口类型及其触发条件。

| 入口类型 | 典型触发场景 | 直接后果 |
|----------|--------------|----------|
| 文件上传 | 上传包含恶意代码的JSP文件 | 获得传统Webshell或注入内存马 |
| 反序列化 | 解析JSON/XML/YAML格式的请求体 | 远程代码执行 |
| 表达式注入 | 用户输入被解析为SpEL/OGNL/EL表达式 | 远程代码执行 |
| JNDI注入 | 可控参数传递至`lookup()`方法 | 加载远程恶意类 |
| SQL注入 | 用户输入拼接至SQL语句 | 存储过程/命令执行 |
| 模板注入 | 用户控制模板引擎的输入内容 | 远程代码执行 |
| 命令注入 | `Runtime.exec()`拼接用户输入 | 直接执行系统命令 |

反序列化漏洞在JavaWeb环境中的具体入口点包括：
1. HTTP Body通过`@RequestBody`注解或`request.getInputStream()`读取并解析
2. Cookie或Header值被反序列化处理
3. Session对象钝化与活化触发`readObject()`

---

### 常见问题解答

**Q1：内存马是否必须依赖JSP上传入口？**

并非必须。JSP上传是最常见的注入方式，但在高级攻防中，任何能够执行代码的入口均可用于注入内存马，包括反序列化漏洞（如Log4j2、FastJSON）、表达式注入（如OGNL、SpEL）等。这些方式全程不需要上传任何文件。

**Q2：JSP与HTML的本质区别是什么？**

| 对比维度 | HTML | JSP |
|----------|------|-----|
| 内容性质 | 静态 | 动态 |
| 能否执行代码 | 不能 | 能执行Java代码 |
| 文件后缀 | `.html` | `.jsp` |
| 处理方式 | 浏览器直接渲染 | Tomcat先执行后生成HTML |

**Q3：Servlet与JSP的关系是什么？**

Servlet是纯Java类（`.java`文件），JSP是包含HTML的Java页面（`.jsp`文件）。JSP会被Tomcat自动翻译成Servlet，二者在运行时本质相同。

**Q4：内存马的入口是否必须依赖代码执行漏洞？**

是的。无论后门是落地文件还是内存马，攻击者都必须先获得一个能够执行代码的入口。区别在于：传统Webshell将入口本身作为后门，内存马则将入口作为注入工具，执行后丢弃入口。

**Q5：Spring框架在安全场景中的核心关注点是什么？**

Spring框架的安全关注点集中在三个方面：`@RequestBody`自动反序列化过程可能引入反序列化漏洞；框架历史漏洞（如Spring4Shell）可导致远程代码执行；Controller型内存马通过动态注册Controller实现更隐蔽的后门。

---

### 攻击链的综合推演

综合上述各个环节，一次完整的JavaWeb渗透与内存马植入流程可概括为以下步骤：

1. **侦察阶段**：识别目标使用的Web服务器（Tomcat/IIS）、框架（Spring/Struts2）及组件版本，确认是否存在已知漏洞。

2. **入口构造**：根据侦察结果选择攻击入口，如文件上传点、`@RequestBody`接口、表达式注入参数等。

3. **利用执行**：发送构造的恶意请求，触发反序列化、表达式注入或文件上传漏洞，获得代码执行权限。

4. **内存马植入**：在代码执行上下文中，通过反射获取`StandardContext`，注册恶意Filter、Servlet或Controller组件。

5. **清理与持久化**：验证内存马生效后，删除注入器文件及攻击日志。内存马将持续生效直至应用重启。

---

### 总结

JavaWeb安全分析的完整知识体系包含以下层次：

- **基础概念层**：理解JSP、Servlet、ASP、PHP的区别，明确各自运行环境与执行方式
- **服务器架构层**：区分Web服务器（Apache/Nginx）与应用服务器（Tomcat/IIS）的功能边界与协作关系
- **框架机制层**：理解Spring的IoC与MVC原理，定位`@RequestBody`自动反序列化等关键攻击面
- **攻击技术层**：掌握从代码执行入口到内存马植入的完整攻击链，熟悉各类内存马（Filter型、Servlet型、Listener型、Controller型）的寄生位置与注入逻辑
- **防御检测层**：基于对容器内部结构的理解，明确Filter链与`StandardContext`的检测关键点，定位日志审计的聚焦方向

从攻击者视角来看，获得代码执行权限后，通过反射操作Tomcat的`StandardContext`和Filter链实现内存马植入，是持久化控制的最有效手段。而从防御者视角来看，理解这一完整链条是进行有效检测与阻断的前提。