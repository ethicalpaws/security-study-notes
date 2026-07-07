package com.fastjson.controller;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import com.alibaba.fastjson.serializer.MiscCodec;

@RestController
public class FastJsonController {

    /**
     * 漏洞触发接口
     * 支持两种利用方式：
     * 1. 两步利用：先缓存恶意类，再触发 JNDI
     * 2. 直接利用：使用特定 Payload
     */
    @PostMapping("/parse")
    public Map<String, Object> parse(@RequestBody String json) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            System.out.println("========================================");
            System.out.println("[时间] " + new Date());
            System.out.println("[接收] " + json);
            System.out.println("========================================");
            
            // 分析 Payload 类型
            if (json.contains("@type") && json.contains("java.lang.Class")) {
                System.out.println("[检测] 可能是缓存利用 Payload");
            }
            if (json.contains("JdbcRowSetImpl")) {
                System.out.println("[检测] 可能是 JNDI 注入 Payload");
            }
            
            // ===== 漏洞触发点 =====
            // 在这里设置断点进行调试
            Object obj = JSON.parseObject(json);
            // =====================
            
            result.put("success", true);
            result.put("type", obj.getClass().getName());
            result.put("data", obj.toString());
            
            System.out.println("[结果] 解析成功: " + obj.getClass().getName());
            
        } catch (Exception e) {
            System.err.println("[错误] " + e.getMessage());
            e.printStackTrace();
            
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("stack", getStackTrace(e));
        }
        
        return result;
    }

    /**
     * 批量测试接口 - 用于两步利用
     */
    @PostMapping("/batch")
    public Map<String, Object> batch(@RequestBody String json) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            System.out.println("========================================");
            System.out.println("[批量测试] " + json);
            System.out.println("========================================");
            
            // 解析 JSON 数组
            Object obj = JSON.parseObject(json);
            
            result.put("success", true);
            result.put("data", obj);
            
        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return result;
    }

    @GetMapping("/test")
    public String test() {
        return "FastJSON 1.2.47 漏洞调试环境运行正常！";
    }

    private String getStackTrace(Exception e) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            sb.append(element.toString()).append("\n");
        }
        return sb.toString();
    }
}