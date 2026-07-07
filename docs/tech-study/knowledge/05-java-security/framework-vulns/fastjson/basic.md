---
title: Fastjson 基础知识
description: Fastjson 的核心功能（序列化/反序列化）、基本用法示例、@type 特性与安全风险、版本演化历程（1.2.24 至 2.0.x）
tags: [Fastjson, 序列化, 反序列化, @type, AutoType, 版本演化, Java]
status: 已完成
finish-date: 2026-06-29
difficulty: 简单
---

# Fastjson相关基础知识
## 是什么

- 阿里巴巴的一个java库，专门用来在json格式数据和java对象之间转换

- 它最大卖点就是 快。通过一系列底层优化，它的解析速度通常优于其他同类库（比如 Google 的 Gson），在追求性能的国内互联网公司中曾一度非常流行。

## 核心功能：序列化与反序列化

1. 序列化 (Fast + Serialization)：把 Java 对象 转换成 JSON 字符串。比如，你把一个 User 对象（有 name 和 age 属性）交给它，它会吐出一串文本，像这样：{"age":30, "name":"小明"}。这在给前端或第三方系统发送数据时非常常用。

2. 反序列化 (Fast + Deserialization)：把 JSON 字符串 转换回 Java 对象。这是它的逆过程，常用于接收并解析外部发来的数据。

## 基本用法示例

**序列化**

```java
User user=new User("小明",30);
String jsonstring=JSON.toJSONString(user);
System.out.println(jsonstring);
// 输出: {"age":30,"name":"小明"}
```

**反序列化**

```java
String jsonstring"{\"age\":30,\"name\":\"小明\"}";
User parseuser=JSON.parseObject(jsonstring,User.class);
System.out.println(parseuser.getName());
// 输出: 小明
```

## 独特功能和主要风险

**功能**：它有一个其他 JSON 库不常见的特色功能，支持通过 `@type` 字段在 JSON 里直接指定类名，这让反序列化更灵活。

**风险**：这个强大的功能，成了所有安全风险的根源——攻击者可以伪造 `@type` 指向一些危险类，从而执行恶意代码

**示例**：

```java
"a":{
    "@type":"java.lang.class"
    "val":"com.sun.rowset.JdbcRowSetImpl"
}
```

- 指定要加载的类为`java.lang.Class`是 Java 里所有类的"元类"，用来描述类本身

- 并给`java.lang.Class`对象的val 属性赋值的。在 Java 里，java.lang.Class 类有一个 forName(String className) 方法，作用是加载指定的类。

- 这一行合起来的含义是：调用 java.lang.Class.forName("com.sun.rowset.JdbcRowSetImpl")

## 总结与现状
总的来说，Fastjson 是一个性能强悍、使用简单，但历史安全风险突出的 JSON 处理库。

- 优点：性能极高，API 设计人性化，功能丰富。

- 缺点：因为太“万能”而引入了严重的安全隐患，虽然官方持续在修，但升级和维护需要格外留心。

## 版本演化的核心逻辑

- 1.2.24	无防御，@type 任意类加载
 	
- 1.2.25-1.2.41	引入 AutoType 黑名单 + 白名单机制

- 1.2.42-1.2.46	黑名单加强，加密类名绕过被堵

- 1.2.47	利用 cache 字段两次绕过 checkAutoType()	

- 1.2.48-1.2.67	修复 1.2.47 的 cache 绕过	

- 1.2.68	引入 expectClass、safeMode	

- 1.2.69+	持续加固	

- 1.2.80+	最新绕过（依赖绕过、黑名单扩展）

- 2.0.x     架构变化

