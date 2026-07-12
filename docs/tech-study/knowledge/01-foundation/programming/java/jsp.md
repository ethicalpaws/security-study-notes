---
title: Java Web 基础——JSP
description: JSP 的核心概念与本质、与 Servlet 的关系、生命周期、基础语法（指令/脚本/动作元素）、九大内置对象与四大作用域、JSP 与内存马的关系及典型安全风险
tags: [JSP, Java Web, Servlet, 内存马, WebShell, 内置对象, 作用域, 安全风险]
status: 已完成
finish-date: 2026-07-10
difficulty: 中等
---

# jsp基础
>JSP 作为 Java Web 生态中的基础技术，本质上是 Servlet 的一种简化实现。其核心价值在于能够快速生成动态页面内容，但在现代 Web 开发中，随着前后端分离和模板引擎（如 Thymeleaf、FreeMarker）的普及，传统 JSP 的使用场景已逐渐缩减。
>
>然而，由于 JSP 天然具备执行 Java 代码的能力，且在多数遗留系统中仍被广泛使用，其在安全研究领域（尤其是内存马、Webshell 等方向）仍具有重要的分析价值。理解 JSP 的语法、生命周期和内置对象，是掌握 Java Web 安全的基础前提。

## jsp是什么
**全称JavaServer Pages**：是Java平台下一种动态网页技术标准。它允许在HTML页面中嵌入Java代码从而实现页面内容动态生成

**本质**：jsp是一种简化的Servlet，在运行时由Web容器（如Tomcat容器）自动翻译成一个Servlet类，然后编译运行。因此jsp具有Servlet的所有能力，包括访问Java API，操作数据库，处理HTTP请求等

**核心特征**：

    - 文件后缀为jsp
    
    - 运行在支持Servlet规范的Web容器中（如Tomcat、Jetty）
    
    - 在服务端运行，生成JSON、HTML或其他格式响应返回给客户端

## jsp与Servlet的关系

>jsp本质上是Servlet，两者是同一技术在不同层面的表现形式

| 维度 | JSP | Servlet |
|------|-----|---------|
| 文件形式 | `.jsp` 文件，HTML 与 Java 混合 | `.java` 文件，纯 Java 类 |
| 编写难度 | 较低，适合页面渲染 | 较高，需处理大量输出流 |
| 编译方式 | 由容器自动翻译并编译 | 需手动编译为 `.class` |
| 适用场景 | 视图层（页面展示） | 控制层（业务逻辑处理） |
| 本质关系 | JSP 最终会被容器翻译成 Servlet | Java Web 的基础组件 |

## jsp生命周期

JSP 从被访问到响应完成，经历以下阶段：

1. **翻译阶段**：Web容器将.jsp文件翻译成对应的.java源文件

2. **编译阶段**：Web容器将.java源文件编译成.class字节码文件

3. **加载阶段**：将.class文件加载到JVM中

4. **实例化阶段**：创建该Servlet实例对象

5. **初始化阶段**：调用jspInit()方法，初始化

6. **服务阶段**：调用_jspService()方法处理每次请求

7. **销毁阶段**：调用_jspDestory()方法释放资源

>_jspService()方法就对应Servlet的service()方法

## 基础语法
JSP 语法体系由以下三类核心元素构成：

**指令元素**

- 指令用于设置JSP页面的全局属性，作用于整个页面

- 语法格式：`<%@ 指令名 属性="值" %>`

*page指令*：设置页面级属性

```jsp
<%@ page content-Type="text/html;charset=UTF-8" %>
<%@ page import="java.io.*" %>
<%@ page errorPage="/error.jsp" %>
<%@ page isErrorPage="true" %>
```

常用属性说明：

- contentType：设置响应类型及字符编码

- import：导入 Java 类或包

- errorPage：指定发生异常时跳转的页面

- isErrorPage：标记当前页面是否为错误处理页面

- session：是否启用 Session（默认为 true）

*include指令*：静态包含其他文件

`<%@ include file="/header.jsp" %>`
该指令在翻译阶段将目标文件内容合并到当前页面，生成一个 Servlet

*taglib指令*：引入自定义标签库

`<%@ taglib url="http://java.sun.com/jsp/jstl/core" prefix="c" %>`

**脚本元素**

脚本元素用于在 JSP 中嵌入 Java 代码逻辑。

*声明脚本*：<%! %> 定义成员变量和方法

```jsp
<%!
    private int counter = 0;
    public String formatDate(Date d){
        return d.toString();
    }
%>
```
该部分代码被翻译到 Servlet 类的成员位置


*表达式脚本*：<%= %> 输出结果到页面

```jsp
<%= new java.util.Date() %>
<%= request.getParameter("username") %>
```
相当于out.print()

*代码脚本*：<% %> 执行任意Java代码

```jsp
<% 
    String name = request.getParameter("name");
    if (name != null && !name.isEmpty()) {
        out.println("Hello, " + name);
%>

```

**动作元素**

采用XML语法用于控制JSP页面的行为逻辑

- <jsp:include>：动态包含页面（运行时包含）
  
  `<jsp:include page="/footer.jsp" />`
  与 <%@ include %> 不同，该动作在请求处理阶段执行，每次都会重新包含目标页面。

- <jsp:forward>：请求转发

  `<jsp:forward page="/success.jsp" />`

  将请求转发给另一个页面处理，客户端地址栏不变

- <jsp:param>：传递参数

  ```jsp
    <jsp:forward page="/detail.jsp">
        <jsp:param name="id" value="123" />
    </jsp:forward>
  ```

- <jsp:useBean>、<jsp:setProperyt>、<jsp:getProperty>：JavaBean操作

  ```jsp
    <jsp:useBean id="user" class="com.example.User" scope="request" />
    <jsp:setProperty name="user" property="name" value="张三" />
    <jsp:getProperty name="user" property="name" />
  ``` 

**注释**

- *JSP注释*：<%-- 注释内容 --%> 只在服务端可见，不会输出到客户端

- *HTML注释*：<!-- 注释内容 --!> 会输出到客户端源码中

- *Java注释*：在脚本元素中使用 // 或 /* ... */

## 内置对象
JSP 容器自动为每个 JSP 页面提供九个内置对象，开发者可直接使用，无需手动创建。

| 对象名称 | 类型 | 作用域 | 说明 |
|----------|------|--------|------|
| `request` | HttpServletRequest | Request | 封装客户端请求信息 |
| `response` | HttpServletResponse | Response | 封装服务器响应信息 |
| `out` | JspWriter | Page | 向客户端输出内容 |
| `session` | HttpSession | Session | 维护用户会话状态 |
| `application` | ServletContext | Application | 全局上下文，跨用户共享 |
| `pageContext` | PageContext | Page | 当前页面上下文，可操作其他作用域 |
| `page` | Object（当前 Servlet 实例） | Page | 当前 JSP 页面实例，即 `this` |
| `config` | ServletConfig | Page | 当前 JSP 的配置信息 |
| `exception` | Throwable | Page | 仅在错误页面中可用，表示异常对象 |

操作示例：
```jsp
<%
    // request：获取请求参数
    String username = request.getParameter("username");
    
    // session：存储用户信息
    session.setAttribute("user", username);
    
    // application：全局计数器
    Integer count = (Integer) application.getAttribute("count");
    if (count == null) count = 0;
    application.setAttribute("count", ++count);
    
    // out：输出内容
    out.println("访问次数：" + count);
%>
```

## JSP作用域

| 作用域 | 对应对象 | 有效范围 |
|--------|----------|----------|
| page | `pageContext` | 当前页面内有效 |
| request | `request` | 同一次请求内有效（含转发） |
| session | `session` | 同一用户会话内有效 |
| application | `application` | 整个应用运行期间有效 |

操作示例：
```jsp
<%
    // 设置属性
    pageContext.setAttribute("msg1", "page数据");
    request.setAttribute("msg2", "request数据");
    session.setAttribute("msg3", "session数据");
    application.setAttribute("msg4", "application数据");
    
    // 获取属性（按 page → request → session → application 顺序查找）
    Object value = pageContext.findAttribute("msg2");
    
    // 指定作用域获取
    Object val = pageContext.getAttribute("msg3", PageContext.SESSION_SCOPE);
%>
```

## JSP 与内存马的关系
>在内存马的研究与实践中，JSP 通常扮演注入器的角色，而非后门本体。

**核心逻辑**

1. 攻击者通过文件上传或其它途径将注入型 JSP 文件写入目标服务器

2. 访问该 JSP 文件，触发其中的 Java 代码执行

3. 该代码通过反射等技术动态注册恶意组件（如 Filter、Servlet、Listener）到 Web 容器内存中

4. 注入完成后，注入器 JSP 文件可被删除

5. 已注入的恶意组件常驻内存，不依赖文件系统，具备较高的隐蔽性和持久性

**JSP 作为注入器的优势**：

- 语法简单，可直接嵌入 Java 代码

- 与 Java Web 生态完全兼容

- 支持反射 API，能够操纵容器内部对象（如 StandardContext）

## JSP 的典型安全风险

1. 文件上传漏洞：攻击者可上传恶意 JSP 文件，直接获取服务器权限

2. 任意文件写入：结合路径遍历漏洞，可将 JSP 写入 Web 目录

3. 表达式注入：某些框架（如 OGNL、SpEL）漏洞可间接执行 JSP 逻辑

4. 模板注入：某些模板引擎允许执行 Java 代码

**防御建议**

- 限制上传文件的类型与内容

- 避免直接将用户输入作为 JSP 路径或代码片段

- 定期审计 Web 目录中的 JSP 文件

- 部署 RASP 监控 JSP 编译与加载行为