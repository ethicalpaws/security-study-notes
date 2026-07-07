# 📋 每周检测

> 每周学习成果自测与复盘

这里记录我每周的学习检测和收获总结，用于：

- ✅ **自我检验**：通过检测题评估本周知识掌握程度
- 📝 **复盘总结**：记录本周的学习成果、卡点与突破
- 🔄 **持续改进**：根据检测结果调整下周学习计划

---

> 自动汇总各周学习成果与自测得分

## 📊 周次概览

| 周次 | 时间 | 得分 | 经验值 | 状态 | 详细 |
|:----:|------|:----:|:------:|:----:|:----:|
| 第1周 | 2026.05.09-05.15 | 95/100 | 19 | ✅ 优秀 | [查看](week1/) |
| 第2周 | 2026.05.16-05.22 | 93/100 | 19 | ✅ 优秀 | [查看](week2/) |
| 第3周 | 2026.05.23-05.29 | 87/100 | 17 | 🔄 良好 | [查看](week3/) |
| 第4周 | 2026.05.30-06.05 | 0/100 | 0 | 🔄 进行中 | [查看](week4/) |
| 第5周 | 2026.06.29-07.05 | 0/100 | 0 | 🔄 进行中 | [查看](week5/) |

## 📈 统计信息

- **平均得分**：91.7
- **最高分**：第1周（95分）
- **总经验值**：55
- **已完成周数**：3




<div id="weekly-tip" style="background: #0f172a; padding: 1rem 1.25rem; border-radius: 8px; border-left: 5px solid #10b981; margin: 1rem 0; font-family: 'Courier New', monospace;">
<span style="color: #15cb04;">$></span>
<span id="tip-text" style="color: #15cb04; margin-left: 0.5rem;">加载中...</span>
<span style="color: #00ff41; animation: blink 1s infinite;">_</span>
</div>

<style>
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>

<script>
const tips = [
  "每周一测，见证成长 📈",
  "得分越高，经验值越多 ⭐",
  "持续学习，持续进步 💪",
  "每一次检测都是自我突破 🎯",
  "知识复利，时间看得见 ⏰"
];

function getWeeklyTip() {
  const date = new Date();
  const weekNum = Math.ceil(date.getDate() / 7);
  const tipIndex = weekNum % tips.length;
  return tips[tipIndex];
}

document.addEventListener('DOMContentLoaded', function() {
  const tipElement = document.getElementById('tip-text');
  if (tipElement) {
    tipElement.textContent = getWeeklyTip();
  }
});
</script>