package com.fastjson.controller;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.parser.ParserConfig;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@RestController
public class FastJsonController {

    // 开启 AutoType 支持（为了演示漏洞）
    static {
        // 1.2.68 默认关闭 AutoType，需要手动开启
        ParserConfig.getGlobalInstance().setAutoTypeSupport(true);
        System.out.println("[配置] AutoType 支持已开启");
    }

    /**
     * 漏洞触发接口
     * 使用 @type 指定 AutoCloseable 接口和恶意类
     */
    @PostMapping("/parse")
    public Map<String, Object> parse(@RequestBody String json) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            System.out.println("========================================");
            System.out.println("[时间] " + new Date());
            System.out.println("[接收] " + json);
            System.out.println("========================================");
            
            // 检测 Payload 特征
            if (json.contains("AutoCloseable") && json.contains("@type")) {
                System.out.println("[检测] 可能是 AutoCloseable 绕过 Payload");
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
     * 测试接口 - 查看 AutoType 状态
     */
    @GetMapping("/status")
    public String status() {
        boolean autoTypeSupport = ParserConfig.getGlobalInstance().isAutoTypeSupport();
        return "AutoType 支持状态: " + (autoTypeSupport ? "已开启" : "已关闭");
    }

    @GetMapping("/test")
    public String test() {
        return "FastJSON 1.2.68 漏洞调试环境运行正常！";
    }

    private String getStackTrace(Exception e) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            sb.append(element.toString()).append("\n");
        }
        return sb.toString();
    }
}