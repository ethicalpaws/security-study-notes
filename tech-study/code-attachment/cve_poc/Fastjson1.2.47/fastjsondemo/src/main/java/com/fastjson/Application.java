package com.fastjson;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
        System.out.println("========================================");
        System.out.println("FastJSON 1.2.47 漏洞调试环境已启动");
        System.out.println("访问地址: http://localhost:8080");
        System.out.println("测试接口: POST http://localhost:8080/parse");
        System.out.println("健康检查: GET  http://localhost:8080/test");
        System.out.println("========================================");
        System.out.println("注意: 1.2.47 需要两步利用");
        System.out.println("第一步: 加载恶意类到缓存");
        System.out.println("第二步: 触发 JNDI 注入");
        System.out.println("========================================");
    }
}