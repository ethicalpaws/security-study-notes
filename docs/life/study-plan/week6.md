---
week: 6
start_date: "2026-07-06"
end_date: "2026-07-12"
status: "进行中"
theme: "Java安全深化（内存马高阶 + JNDI + Spring）"
keywords:
  - 内存马高阶
  - JNDI
  - Spring
  - 望闻问切实战验证
  - 修桥工程LINK测试
---

# 🌟 Period 2-Week 2 学习计划

> **时间**：2026-07-06 - 2026-07-12  
> **阶段目标**：内存马高阶（JVM型/Agent型/线程型），JNDI 高版本绕过，Spring Boot Actuator + SpEL 注入；用修桥工程对 LINK 系统进行持续测试  
> **核心调整**：第1周日远征 SRC 验证了望闻问切框架，本周用同一框架在 Java 漏洞代码上做首次实战；同时补完第1周日未完成的内存马检测笔记与抽象文档

<link rel="stylesheet" href="/asserts/css/weekly.css">
<script src="/asserts/js/weekly.js" defer></script>

---

## 📊 本周打卡表

<div class="weekly-card">
  <div class="weekly-header">
    <span>📅 Week 2 进度</span>
    <span id="progressPercent">0</span><span>%</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
  </div>
  <div class="weekly-stats">
    <div>✅ 已完成: <span id="completedCount">0</span></div>
    <div>📋 总任务: <span id="totalCount">7</span></div>
  </div>
</div>

| 日期 | 任务 | 完成 |
|:----:|------|:----:|
| **周一 7.6** | 补完第1周日未完成：内存马检测笔记 + 抽象文档第一轮 | <input type="checkbox" class="task-check" data-task="w2d1-1"> |
| | Fastjson 收尾（1.2.83 safeMode 分析与绕过）+ 望闻问切在 Java 漏洞链上的首次应用 | <input type="checkbox" class="task-check" data-task="w2d1-2"> |
| **周二 7.7** | JVM 型内存马原理（Instrumentation + VirtualMachine） | <input type="checkbox" class="task-check" data-task="w2d2-1"> |
| | Instrumentation 注册 ClassFileTransformer Demo 与复现 | <input type="checkbox" class="task-check" data-task="w2d2-2"> |
| **周三 7.8** | Agent 型内存马（动态 attach + ClassLoader 注入） | <input type="checkbox" class="task-check" data-task="w2d3-1"> |
| | Thread 型内存马（基于线程的持久化）原理与复现 | <input type="checkbox" class="task-check" data-task="w2d3-2"> |
| **周四 7.9** | JNDI 高版本绕过（trustURLCodebase=false 与本地 Factory 链） | <input type="checkbox" class="task-check" data-task="w2d4-1"> |
| | Spring Boot Actuator 端点未授权访问复现 | <input type="checkbox" class="task-check" data-task="w2d4-2"> |
| **周五 7.10** | Spring SpEL 注入分析与 PoC 构造 | <input type="checkbox" class="task-check" data-task="w2d5-1"> |
| | 修桥工程对 LINK 系统做第一次 Java 漏洞面渗透测试 | <input type="checkbox" class="task-check" data-task="w2d5-2"> |
| **周六 7.11** | Spring 表达式注入框架抽象（SpEL/OGNL/MVEL 对比） | <input type="checkbox" class="task-check" data-task="w2d6-1"> |
| | 望闻问切五步模板首次在 Java 漏洞链实战验证，产出「望闻问切 × FastJSON」实例 | <input type="checkbox" class="task-check" data-task="w2d6-2"> |
| **周日 7.12** | 第2周收尾：内存马检测与防御矩阵整理 + 第2周简报 | <input type="checkbox" class="task-check" data-task="w2d7-1"> |
| | 修桥工程对 LINK 测试总结 + 工具语义错配三连的校准复盘 | <input type="checkbox" class="task-check" data-task="w2d7-2"> |

<div class="weekly-summary">
  <h4>📝 周记</h4>
  <textarea id="weeklyNotes" rows="3" placeholder="记录本周的收获、卡点、碎碎念..."></textarea>
  <button id="saveWeeklyBtn" class="weekly-save">💾 保存周记</button>
</div>

---

## 📋 本周概览

| 维度 | 内容 | 优先级 |
|------|------|:------:|
| 技术 | 内存马高阶（JVM/Agent/Thread 三型）原理与复现 | 🔴 高 |
| 技术 | JNDI 高版本绕过 + Spring Actuator + SpEL 注入 | 🔴 高 |
| 收尾 | 第1周日未完成项（内存马检测笔记 + 抽象文档第一轮） | 🟡 中 |
| 方法论 | 望闻问切在 Java 漏洞链首次实战验证 | 🔴 高 |
| 工程 | 修桥工程对 LINK 系统第一次渗透测试 | 🟡 中 |

---

## 🗓️ 每日安排

### 第1天（周一 / 7.6）：Fastjson 收尾 + 第1周欠账

| 时间段 | 任务 |
|:------:|------|
| 上午 | 补完第1周日未完成：内存马检测笔记（静态+运行时） + 抽象文档第一轮 |
| 下午 | Fastjson 1.2.83 safeMode 分析与绕过思路，1.2.x 演化收尾 |
| 晚上 | 望闻问切五步模板在 FastJSON 调用链上的首次应用尝试 |

**产出：**
- [ ] 内存马检测笔记（运行时特征 + 静态特征）
- [ ] 抽象文档第一轮（Servlet/Filter 内存马抽象层）
- [ ] FastJSON 演化收尾图

---

### 第2天（周二 / 7.7）：JVM 型内存马

| 时间段 | 任务 |
|:------:|------|
| 上午 | JVM TI 与 Instrumentation 原理 |
| 下午 | VirtualMachine.attach + ClassFileTransformer Demo |
| 晚上 | JVM 型内存马优缺点与适用场景 |

**产出：**
- [ ] JVM 型内存马原理笔记
- [ ] Instrumentation Demo

---

### 第3天（周三 / 7.8）：Agent 型 + Thread 型内存马

| 时间段 | 任务 |
|:------:|------|
| 上午 | Java Agent 动态 attach + ClassLoader 注入 |
| 下午 | Thread 型内存马（基于线程持久化）原理 |
| 晚上 | 三型内存马对比矩阵（Servlet/Filter/JVM/Agent/Thread） |

**产出：**
- [ ] Agent 型内存马 Demo
- [ ] Thread 型内存马 Demo
- [ ] 五型内存马对比矩阵

---

### 第4天（周四 / 7.9）：JNDI 高版本绕过 + Spring Actuator

| 时间段 | 任务 |
|:------:|------|
| 上午 | JNDI 高版本绕过（trustURLCodebase=false + 本地 Factory 链） |
| 下午 | Spring Boot Actuator 端点未授权访问复现 |
| 晚上 | 端点列表 + 利用方式矩阵 |

**产出：**
- [ ] JNDI 高版本绕过笔记
- [ ] Spring Boot Actuator 未授权访问 PoC

---

### 第5天（周五 / 7.10）：SpEL 注入 + LINK 系统渗透测试

| 时间段 | 任务 |
|:------:|------|
| 上午 | Spring SpEL 注入分析与 PoC 构造 |
| 下午 | 修桥工程对 LINK 系统做第一次 Java 漏洞面渗透测试 |
| 晚上 | LINK 测试发现 + 望闻问切实战记录 |

**产出：**
- [ ] SpEL 注入 PoC
- [ ] LINK 系统首次测试报告

---

### 第6天（周六 / 7.11）：SpEL 框架抽象 + 望闻问切实战验证

| 时间段 | 任务 |
|:------:|------|
| 上午 | Spring 表达式注入框架抽象（SpEL/OGNL/MVEL 对比） |
| 下午 | 望闻问切五步模板首次在 Java 漏洞链实战验证 |
| 晚上 | 产出「望闻问切 × FastJSON」完整实例 |

**产出：**
- [ ] 表达式注入框架抽象文档
- [ ] 望闻问切 × FastJSON 实战实例

---

### 第7天（周日 / 7.12）：收尾 + 周总结

| 时间段 | 任务 |
|:------:|------|
| 上午 | 内存马检测与防御矩阵整理 |
| 下午 | 修桥工程对 LINK 测试总结 + 工具语义错配三连的校准复盘 |
| 晚上 | 第2周简报撰写 |

**产出：**
- [ ] 内存马检测与防御矩阵
- [ ] 工具语义错配校准复盘
- [ ] 第2周简报

---

## 📊 本周产出清单

| 类别 | 产出 | 状态 |
|------|------|:----:|
| **漏洞复现** | Fastjson 1.2.83 safeMode 绕过分析 | ⬜ |
| | JNDI 高版本绕过 | ⬜ |
| | Spring Boot Actuator 未授权访问 | ⬜ |
| | Spring SpEL 注入 | ⬜ |
| **内存马** | JVM 型内存马 Demo | ⬜ |
| | Agent 型内存马 Demo | ⬜ |
| | Thread 型内存马 Demo | ⬜ |
| | 五型内存马对比矩阵 | ⬜ |
| | 内存马检测与防御矩阵 | ⬜ |
| **方法论** | 望闻问切 × FastJSON 实战实例 | ⬜ |
| | 表达式注入框架抽象（SpEL/OGNL/MVEL） | ⬜ |
| **工程** | LINK 系统首次渗透测试报告 | ⬜ |
| | 工具语义错配校准复盘 | ⬜ |
| **文档** | 第1周欠账（内存马检测笔记 + 抽象文档） | ⬜ |
| | 第2周简报 | ⬜ |

---

## 🎯 里程碑检查点

| 时间 | 检查点 | 通过标准 |
|:----:|--------|----------|
| 第1天 | 第1周欠账清零 | 内存马检测笔记 + 抽象文档第一轮完成 |
| 第3天 | 内存马家族完整 | 五型内存马（Servlet/Filter/JVM/Agent/Thread）对比矩阵完成 |
| 第5天 | 修桥工程首战 | LINK 系统首次渗透测试报告产出 |
| 第6天 | 望闻问切实战 | 「望闻问切 × FastJSON」完整实例产出 |
| 第7天 | 周简报 | 第2周简报完成 |

---

## ⚠️ 注意事项

### 资源准备

| 资源 | 说明 | 状态 |
|------|------|:----:|
| JDK 1.8+ | 编译内存马 PoC | ⬜ |
| Java 动态调试环境 | IDEA + JEB / arthas | ⬜ |
| Spring Boot 测试靶场 | vulfocus / vulhub Spring 相关 CVE 环境 | ⬜ |
| LINK 系统本地副本 | 修桥工程对 LINK 渗透测试的合法对象 | ⬜ |

### 学习建议

- **第1天先清欠账**：第1周日的远征很值，但三件未完成项不能拖过第2周周一
- **内存马家族化理解**：不要单独看每一型，要画对比矩阵（注入位置、持久化方式、检测难度、攻击面）
- **修桥工程早介入**：周五对 LINK 系统测试，本质是把前6天学的内容在真实系统上跑一遍——别等学完再测
- **望闻问切别脱离代码**：本周六的实战验证是「方法论闭环」的关键事件，必须在真实调用链上走完五步，不能只写理论

---

<div class="weekly-tips">
  <h4>💪 本周寄语</h4>
  <p>第1周用远征验证了侦察方法论，第2周用同一方法论回到代码本身。望闻问切不是只在 SRC 里有用——在反序列化链、SpEL 表达式、内存马注入里，它同样是起点。</p>
  <p>修桥工程的桥，不只向外修（打目标），也向内修（审自己的代码）。</p>
</div>