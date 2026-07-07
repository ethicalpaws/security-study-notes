package com.fastjson;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
        System.out.println("========================================");
        System.out.println("FastJSON 1.2.68 漏洞调试环境已启动");
        System.out.println("访问地址: http://localhost:8080");
        System.out.println("测试接口: POST http://localhost:8080/parse");
        System.out.println("健康检查: GET  http://localhost:8080/test");
        System.out.println("========================================");
        System.out.println("1.2.68 漏洞利用原理:");
        System.out.println("  1. 利用 AutoCloseable 接口绕过黑名单");
        System.out.println("  2. 需要配合特定实现类 (如 JDBC4Connection)");
        System.out.println("========================================");
    }  // ← 这个括号闭合 main 方法
}  // ← 这个括号闭合 Application 类（检查是否有这一行！）