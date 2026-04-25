# Claw Code 项目全景报告

> **版本**: 基于主分支 `a389f8d` (2026-04-25)
> **定位**: 新手入门手册 & 老手字典工具

---

## 目录

1. [项目概述](#1-项目概述)
2. [哲学与生态](#2-哲学与生态)
3. [快速上手](#3-快速上手)
4. [仓库结构总览](#4-仓库结构总览)
5. [架构全景图](#5-架构全景图)
6. [Crate 详解](#6-crate-详解)
   - 6.1 [rusty-claude-cli — CLI 入口](#61-rusty-claude-cli--cli-入口)
   - 6.2 [runtime — 核心运行时](#62-runtime--核心运行时)
   - 6.3 [api — Provider 客户端](#63-api--provider-客户端)
   - 6.4 [tools — 工具系统](#64-tools--工具系统)
   - 6.5 [commands — 斜杠命令](#65-commands--斜杠命令)
   - 6.6 [plugins — 插件系统](#66-plugins--插件系统)
   - 6.7 [telemetry — 遥测追踪](#67-telemetry--遥测追踪)
   - 6.8 [compat-harness — 兼容性测试](#68-compat-harness--兼容性测试)
   - 6.9 [mock-anthropic-service — Mock 服务](#69-mock-anthropic-service--mock-服务)
7. [核心流程详解](#7-核心流程详解)
   - 7.1 [对话循环 (Turn Loop)](#71-对话循环-turn-loop)
   - 7.2 [权限系统](#72-权限系统)
   - 7.3 [MCP 协议](#73-mcp-协议)
   - 7.4 [会话持久化](#74-会话持久化)
   - 7.5 [配置系统](#75-配置系统)
   - 7.6 [流式渲染](#76-流式渲染)
   - 7.7 [Prompt 缓存](#77-prompt-缓存)
8. [工具清单 (50 个)](#8-工具清单-50-个)
9. [斜杠命令清单 (139 个)](#9-斜杠命令清单-139-个)
10. [Provider 与模型路由](#10-provider-与模型路由)
11. [测试体系](#11-测试体系)
12. [关键 Trait 一览](#12-关键-trait-一览)
13. [数据流图](#13-数据流图)
14. [常见场景速查](#14-常见场景速查)

---

## 1. 项目概述

**Claw Code** 是 Claude Code (Anthropic 官方 CLI) 的 **Rust 开源重写实现**。它提供了一个名为 `claw` 的命令行工具，可以：

- 以 **交互式 REPL** 或 **单次提示** 模式与 AI 模型对话
- 调用 **50 个内置工具**（文件读写、Bash 执行、Web 搜索等）
- 通过 **MCP (Model Context Protocol)** 连接外部工具服务器
- 支持 **Anthropic / OpenAI / xAI / DashScope** 等多个 Provider
- 管理 **会话持久化**、**权限控制**、**插件系统**、**Prompt 缓存** 等企业级特性

```
简单理解：claw = 终端里的 AI 编程助手，用 Rust 写的，支持多 Provider
```

---

## 2. 哲学与生态

Claw Code 不仅仅是一个代码库，它是一个**自主软件开发**的演示项目。核心理念：

> **人类设定方向，AI 执行劳动。**

它属于 UltraWorkers 生态的三个组成部分：

```
┌─────────────────────────────────────────────────────────┐
│                    UltraWorkers 生态                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   OmX        │  │  clawhip     │  │    OmO       │  │
│  │ oh-my-codex  │  │  事件路由器   │  │ oh-my-open   │  │
│  │              │  │              │  │   -agent     │  │
│  │ 工作流层     │  │ 通知/监控    │  │ 多Agent协调  │  │
│  │ 短指令→结构化│  │ Git/tmux/GH  │  │ 规划/交接/   │  │
│  │ 执行协议     │  │ 事件路由     │  │ 冲突解决     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  人类接口 = Discord 频道（不是终端）                       │
│  人类角色 = 决定"做什么"，AI 角色 = 执行"怎么做"          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 快速上手

```bash
# 1. 克隆并构建
git clone https://github.com/ultraworkers/claw-code
cd claw-code/rust
cargo build --workspace

# 2. 设置 API Key
export ANTHROPIC_API_KEY="sk-ant-..."

# 3. 健康检查
./target/debug/claw doctor

# 4. 运行一次提示
./target/debug/claw prompt "say hello"

# 5. 进入交互式 REPL
./target/debug/claw

# 6. 运行测试
cargo test --workspace
```

**Windows 用户注意**: 二进制文件是 `claw.exe`，使用 `.\target\debug\claw.exe`。

**重要**: 不要使用 `cargo install claw-code`，那是 crates.io 上的废弃包。

---

## 4. 仓库结构总览

```
claw-code/
├── .claude/                  # Claude Code 会话数据
├── .claude.json              # 权限配置 (defaultMode: "dontAsk")
├── .claw.json                # Claw 配置 (模型别名等)
├── CLAUDE.md                 # AI 助手指引
├── README.md                 # 项目概览
├── USAGE.md                  # 使用指南
├── PHILOSOPHY.md             # 项目哲学
├── PARITY.md                 # Rust 移植对等状态
├── ROADMAP.md                # 路线图 (~700K)
├── docs/                     # 额外文档
│   ├── MODEL_COMPATIBILITY.md
│   └── container.md
├── assets/                   # 图片资源
├── install.sh                # 安装脚本
├── Containerfile             # 容器构建
├── prd.json                  # 产品需求文档
│
├── rust/                     # ★ 主 Rust 工作空间
│   ├── Cargo.toml            # 工作空间根 (members = ["crates/*"])
│   ├── Cargo.lock
│   ├── crates/
│   │   ├── api/              # Provider 客户端、SSE、Auth、流式
│   │   ├── commands/         # 斜杠命令注册、解析、帮助
│   │   ├── compat-harness/   # 上游 TS 清单提取
│   │   ├── mock-anthropic-service/  # 确定性 Mock 服务
│   │   ├── plugins/          # 插件元数据、安装、Hook
│   │   ├── runtime/          # 核心: 会话、配置、权限、MCP、Prompt
│   │   ├── rusty-claude-cli/ # 主 CLI 二进制 (`claw`) — 13,105 行
│   │   ├── telemetry/        # 会话追踪、用量遥测
│   │   └── tools/            # 50 个工具规格 + 执行分发 — 9,686 行
│   └── scripts/              # Mock 对等测试脚本
│
├── src/                      # Python 参考工作空间 (非主运行时)
│   ├── main.py               # CLI 摘要和对等审计入口
│   ├── runtime.py            # Python 运行时参考
│   ├── parity_audit.py       # 对等审计运行器
│   └── reference_data/       # 上游命令/工具的 JSON 快照
│
└── tests/                    # Python 测试: test_porting_workspace.py
```

---

## 5. 架构全景图

### 5.1 Crate 依赖关系图

```
                    ┌─────────────────────────┐
                    │    rusty-claude-cli      │  ← 入口 (`claw` 二进制)
                    │    main.rs (13,105 行)    │
                    └──┬─────┬─────┬─────┬─────┘
                       │     │     │     │
           ┌───────────┘     │     │     └────────────┐
           │                 │     │                   │
           v                 v     v                   v
     ┌──────────┐   ┌────────────┐   ┌──────────────────┐
     │   api    │   │  commands   │   │      tools       │
     │ Provider │   │ 斜杠命令    │   │ 50 工具规格      │
     │ SSE/Auth │   │ 139 命令    │   │ 执行分发         │
     └──┬───┬───┘   └─────┬──────┘   └──┬──┬──┬─────────┘
        │   │              │              │  │  │
        v   v              v              v  v  v
     ┌──────────────────────────────────────────────────────┐
     │                     runtime                           │
     │  会话 · 配置 · 权限 · MCP · Prompt · Bash · 文件操作  │
     │  Worker · Hook · 沙箱 · OAuth · 恢复 · 策略引擎      │
     │                    (~25K 行)                          │
     └──────────┬──────────────────────────┬────────────────┘
                │                          │
                v                          v
          ┌──────────┐              ┌─────────────┐
          │ plugins  │              │  telemetry  │
          │ 清单/安装│              │ 追踪/遥测   │
          │ Hook     │              │             │
          └──────────┘              └─────────────┘

     ┌──────────────────┐     ┌──────────────────────────┐
     │  compat-harness  │     │ mock-anthropic-service   │
     │  TS 清单提取     │     │ 确定性 Mock (12 场景)    │
     └──────────────────┘     └──────────────────────────┘
```

### 5.2 运行时数据流

```
用户输入 ──→ REPL/OneShot ──→ LiveCli ──→ ConversationRuntime
                                              │
                                              ├──→ ApiClient.stream() ──→ Provider (Anthropic/OpenAI/xAI)
                                              │                              │
                                              │                              ├──→ SSE 流式响应
                                              │                              └──→ 非流式响应
                                              │
                                              ├──→ ToolExecutor.execute() ──→ GlobalToolRegistry
                                              │                                    │
                                              │                                    ├──→ 内置工具 (bash, read_file, ...)
                                              │                                    ├──→ 插件工具
                                              │                                    └──→ MCP 工具 (via McpServerManager)
                                              │
                                              ├──→ PermissionPolicy.authorize() ──→ 允许/拒绝/提示
                                              │
                                              ├──→ HookRunner (PreToolUse / PostToolUse)
                                              │
                                              └──→ Session 持久化 (JSONL)
```

### 5.3 代码规模统计

| 指标 | 数值 |
|------|------|
| Rust 总行数 | ~80,691 |
| Rust 源文件 | 67 个 `.rs` |
| 工作空间 Crate | 9 个 |
| 最大单文件 | `main.rs` (13,105 行) |
| 工具规格 | 50 个 |
| 斜杠命令 | 139 个 |
| Mock 测试场景 | 12 个 |
| 默认模型 | `claude-opus-4-6` |
| 二进制名称 | `claw` |

---

## 6. Crate 详解

### 6.1 rusty-claude-cli — CLI 入口

**文件**: `rust/crates/rusty-claude-cli/src/main.rs` (13,105 行)

这是整个项目的入口点，编译为 `claw` 二进制。

#### CliAction 枚举 — 顶层分发

```
CliAction
├── Repl              # 交互式 REPL 模式
├── Prompt            # 单次提示模式
├── ResumeSession     # 恢复已保存的会话
├── Status            # 工作区/模型/权限快照
├── Sandbox           # 沙箱状态
├── Doctor            # 诊断健康检查
├── Acp               # ACP 服务模式
├── State             # Worker 状态
├── Init              # 初始化 CLAUDE.md
├── Version           # 版本信息
├── Help / HelpTopic  # 帮助
├── Config            # 配置内省
├── Diff              # Git diff
├── Export            # 会话导出
├── Agents/Mcp/Skills/Plugins  # 发现子命令
├── DumpManifests     # 清单转储
├── BootstrapPlan     # 启动计划
└── PrintSystemPrompt # 系统提示词打印
```

#### LiveCli 结构 — 会话编排器

```rust
struct LiveCli {
    model: String,                    // 解析后的模型名
    allowed_tools: Option<AllowedToolSet>,  // 工具白名单
    permission_mode: PermissionMode,  // 当前权限模式
    system_prompt: Vec<String>,       // 组装的系统提示词
    runtime: BuiltRuntime,            // ConversationRuntime + 插件/MCP 状态
    session: SessionHandle,           // 会话持久化句柄
    prompt_history: Vec<PromptHistoryEntry>,  // 提示历史
}
```

#### 两种运行模式对比

| 特性 | REPL 模式 | 单次提示模式 |
|------|-----------|-------------|
| 触发方式 | `claw` (无参数) | `claw "prompt"` / `claw -p "..."` |
| 生命周期 | 多轮循环 | 单轮退出 |
| 输出格式 | 交互式文本流 | Text / JSON / Compact |
| Stdin | 交互输入 | 可管道输入 (仅 DangerFullAccess) |
| 流式输出 | 始终流式 | 可选 compact 模式 |
| 会话持久化 | 每轮后保存 | 单轮后保存 |

#### 模型解析链

```
1. --model 标志 → 2. .claw/settings.json aliases → 3. 内置别名表 → 4. ANTHROPIC_MODEL 环境变量
   → 5. .claw.json model 字段 → 6. 默认值 "claude-opus-4-6"

内置别名:
  "opus"  → "claude-opus-4-6"
  "sonnet" → "claude-sonnet-4-6"
  "haiku"  → "claude-haiku-4-5-20251213"
```

---

### 6.2 runtime — 核心运行时

**文件**: `rust/crates/runtime/src/` (~25K 行, 35 个源文件)

这是最核心的 Crate，包含会话管理、配置加载、权限评估、MCP 通信、Prompt 组装等所有运行时基础设施。

#### 模块地图

```
runtime/src/
├── conversation.rs      (1,811 行)  对话循环核心
├── config.rs            (2,121 行)  配置加载与合并
├── mcp_stdio.rs         (2,928 行)  MCP 服务器管理
├── worker_boot.rs       (1,708 行)  Worker 启动与信任门
├── session.rs           (1,545 行)  会话持久化 (JSONL)
├── session_control.rs   (1,028 行)  会话管理 (fork/clear)
├── bash_validation.rs   (1,004 行)  Bash 命令验证 (9 个子模块)
├── lane_events.rs       (1,087 行)  Lane 事件与去重
├── hooks.rs             (1,116 行)  Hook 运行器
├── prompt.rs            (905 行)    系统提示词构建
├── mcp_tool_bridge.rs   (920 行)    MCP 工具调用桥
├── mcp_lifecycle_hardened.rs (843 行) MCP 生命周期验证
├── compact.rs           (825 行)    会话压缩
├── file_ops.rs          (839 行)    文件操作 (read/write/edit/glob/grep)
├── config_validate.rs   (901 行)    配置验证
├── mcp_server.rs        (440 行)    MCP 服务器定义
├── permissions.rs       (683 行)    权限策略
├── permission_enforcer.rs (585 行)  权限执行器
├── plugin_lifecycle.rs  (533 行)    插件生命周期
├── policy_engine.rs     (581 行)    策略引擎
├── recovery_recipes.rs  (633 行)    恢复配方
├── oauth.rs             (603 行)    OAuth PKCE 流程
├── task_registry.rs     (507 行)    任务注册表
├── team_cron_registry.rs (509 行)   Team/Cron 注册表
├── lsp_client.rs        (747 行)    LSP 客户端
├── sandbox.rs           (385 行)    沙箱检测
├── git_context.rs       (324 行)    Git 上下文
├── usage.rs             (313 行)    用量追踪
├── bash.rs              (402 行)    Bash 执行
└── remote.rs            (401 行)    远程代理
```

#### ConversationRuntime — 对话循环引擎

```rust
struct ConversationRuntime<C, T> {
    session: Session,                    // 对话状态
    api_client: C,                       // ApiClient 实现
    tool_executor: T,                    // ToolExecutor 实现
    permission_policy: PermissionPolicy, // 权限规则
    system_prompt: Vec<String>,          // 系统提示词
    max_iterations: usize,               // 内循环上限 (默认 usize::MAX)
    usage_tracker: UsageTracker,         // Token 用量
    hook_runner: HookRunner,             // Hook 执行器
    auto_compaction_input_tokens_threshold: u32,  // 自动压缩阈值 (默认 100,000)
    // ...
}
```

#### Session — 会话状态

```rust
struct Session {
    version: u32,                        // Schema 版本 (当前 1)
    session_id: String,                  // 格式: "session-{millis}-{counter}"
    messages: Vec<ConversationMessage>,  // 消息历史
    compaction: Option<SessionCompaction>,  // 压缩元数据
    fork: Option<SessionFork>,           // 分叉来源
    workspace_root: Option<PathBuf>,     // 绑定工作树
    model: Option<String>,               // 使用的模型
    persistence: Option<SessionPersistence>,  // 文件路径
    // ...
}
```

**ContentBlock 枚举**:
```
ContentBlock
├── Text { text }
├── ToolUse { id, name, input }
└── ToolResult { tool_use_id, tool_name, output, is_error }
```

---

### 6.3 api — Provider 客户端

**文件**: `rust/crates/api/src/` (~6K 行)

#### 模块结构

```
api/src/
├── providers/
│   ├── mod.rs           (1,144 行)  Provider 路由、模型检测、别名解析
│   ├── anthropic.rs     (1,717 行)  Anthropic 原生客户端
│   └── openai_compat.rs (2,210 行)  OpenAI 兼容层 (xAI/OpenAI/DashScope)
├── client.rs            (238 行)    AnthropicClient, ProviderClient trait
├── sse.rs               (330 行)    SSE 解析器
├── types.rs             (310 行)    请求/响应类型
├── prompt_cache.rs      (735 行)    Prompt 缓存管理
├── http_client.rs       (344 行)    HTTP 客户端与代理配置
└── error.rs             (596 行)    ApiError 变体
```

#### Provider 路由逻辑

```
detect_provider_kind(model)
  │
  ├── 1. metadata_for_model() — 前缀路由
  │     ├── "claude*"     → Anthropic
  │     ├── "grok*"       → xAI
  │     ├── "openai/*"    → OpenAI
  │     ├── "gpt-"        → OpenAI
  │     ├── "qwen/*"      → DashScope
  │     └── "kimi/*"      → DashScope
  │
  ├── 2. OPENAI_BASE_URL + OPENAI_API_KEY → OpenAI (本地 Provider)
  ├── 3. Anthropic 认证存在 → Anthropic
  ├── 4. OPENAI_API_KEY → OpenAI
  ├── 5. XAI_API_KEY → xAI
  └── 6. 默认 → Anthropic
```

#### AuthSource — 认证来源

```
AuthSource
├── None                          # 无认证
├── ApiKey(String)                # x-api-key 头
├── BearerToken(String)           # Authorization: Bearer 头
└── ApiKeyAndBearer { api_key, bearer_token }  # 双重认证
```

#### SSE 解析器

```
SseParser
  │
  ├── push(chunk) → 解析 SSE 帧
  │     ├── 搜索 \n\n 分隔符
  │     ├── 提取 event: 和 data: 行
  │     ├── 跳过 ping 和 [DONE]
  │     └── 反序列化为 StreamEvent
  │
  └── finish() → 处理剩余缓冲区

StreamEvent
├── MessageStart
├── MessageDelta
├── ContentBlockStart
├── ContentBlockDelta (TextDelta / InputJsonDelta / ThinkingDelta / SignatureDelta)
├── ContentBlockStop
└── MessageStop
```

---

### 6.4 tools — 工具系统

**文件**: `rust/crates/tools/src/lib.rs` (9,686 行)

这是第二大源文件，包含所有 50 个内置工具的规格定义和执行分发。

#### GlobalToolRegistry — 工具注册中心

```rust
struct GlobalToolRegistry {
    plugin_tools: Vec<PluginTool>,       // 插件工具
    runtime_tools: Vec<RuntimeToolDefinition>,  // 运行时工具
    enforcer: Option<PermissionEnforcer>,  // 权限执行器
}
```

#### 工具执行流程

```
GlobalToolRegistry::execute(name, input)
  │
  ├── 内置工具 → execute_tool_with_enforcer(enforcer, name, input)
  │     │
  │     ├── maybe_enforce_permission_check()  ← 大多数工具
  │     ├── maybe_enforce_permission_check_with_mode()  ← bash/PowerShell (动态分类)
  │     └── 跳过权限检查  ← WebFetch/WebSearch/Skill/Agent 等高层工具
  │
  └── 插件工具 → plugin_tool.execute()
```

#### Bash/PowerShell 动态权限分类

```
classify_bash_permission(command)
  │
  ├── 识别只读命令 (cat, head, tail, ls, find, grep, rg, ...)
  │     └── 工作区内路径 → WorkspaceWrite
  │
  └── 其他命令 → DangerFullAccess
        └── 检测危险路径 (绝对路径/../../遍历)
```

#### 延迟加载工具

6 个核心工具始终加载，其余 44 个按需通过 `ToolSearch` 加载：

```
始终加载: bash, read_file, write_file, edit_file, glob_search, grep_search
按需加载: 其余 44 个工具 (通过 ToolSearch 发现)
```

#### 全局单例注册表

```
OnceLock 模式:
  global_lsp_registry()   → LspRegistry
  global_mcp_registry()   → McpToolRegistry
  global_team_registry()  → TeamRegistry
  global_cron_registry()  → CronRegistry
  global_task_registry()  → TaskRegistry
  global_worker_registry() → WorkerRegistry
```

---

### 6.5 commands — 斜杠命令

**文件**: `rust/crates/commands/src/lib.rs` (5,769 行)

#### 命令分类

```
SlashCommand 分类
├── Session (会话管理)
│     help, status, cost, resume, session, version, usage, stats,
│     rename, clear, compact, history, tokens, cache, exit, summary,
│     tag, thinkback, copy, share, feedback, rewind, pin, unpin,
│     bookmarks, context, files, focus, unfocus, retry, stop, undo
│
├── Config (配置)
│     model, permissions, config, memory, theme, vim, voice, color,
│     effort, fast, brief, output-style, keybindings, privacy-settings,
│     stickers, language, profile, max-tokens, temperature, system-prompt,
│     api-key, terminal-setup, notifications, telemetry, providers,
│     env, project, reasoning, budget, rate-limit, workspace, reset,
│     ide, desktop, upgrade
│
├── Debug (调试)
│     debug-tool-call, doctor, sandbox, diagnostics, tool-details,
│     changelog, metrics
│
└── Tools (工具)
      commit, pr, issue, bughunter, ultraplan, teleport, review,
      mcp, agents, skills, plugin, init, diff, export, doctor,
      tasks, plan, security-review, release-notes, ... (其余所有)
```

#### 命令解析

```
validate_slash_command_input(input)
  │
  ├── 去除前导 "/"
  ├── 按空白分割
  ├── match 命令名 → SlashCommand 枚举变体
  ├── 未知命令 → SlashCommand::Unknown(name)
  └── 拼写建议 → Levenshtein 距离匹配 suggest_slash_commands()
```

---

### 6.6 plugins — 插件系统

**文件**: `rust/crates/plugins/src/lib.rs` (3,657 行) + `hooks.rs` (564 行)

#### Plugin Trait

```rust
trait Plugin {
    fn metadata(&self) -> PluginMetadata;
    fn hooks(&self) -> PluginHooks;
    fn lifecycle(&self) -> PluginLifecycle;
    fn tools(&self) -> Vec<PluginTool>;
    fn validate(&self) -> Result<(), PluginError>;
    fn initialize(&mut self) -> Result<(), PluginError>;
    fn shutdown(&mut self) -> Result<(), PluginError>;
}
```

#### 插件类型

```
PluginKind
├── Builtin    # 内置插件
├── Bundled    # 捆绑插件 (随二进制分发)
└── External   # 外部插件 (用户安装)
```

#### Hook 系统

```
HookEvent
├── PreToolUse          # 工具调用前
├── PostToolUse         # 工具调用成功后
└── PostToolUseFailure  # 工具调用失败后

HookRunResult
├── Continue            # 继续
├── ModifiedInput       # 修改了工具输入
├── OverrideDecision    # 覆盖权限决定
└── Abort               # 中止
```

---

### 6.7 telemetry — 遥测追踪

**文件**: `rust/crates/telemetry/src/lib.rs` (526 行)

```
TelemetryEvent
├── HttpRequestStarted
├── HttpRequestSucceeded
├── HttpRequestFailed
├── Analytics
└── SessionTrace

TelemetrySink trait
├── MemoryTelemetrySink    # 内存收集 (测试用)
└── JsonlTelemetrySink     # JSONL 文件写入
```

---

### 6.8 compat-harness — 兼容性测试

**文件**: `rust/crates/compat-harness/src/lib.rs` (363 行)

从上游 TypeScript 源文件提取工具/Prompt/命令清单，用于跟踪 Rust 移植覆盖率。

```
extract_manifest()  → 从 src/commands.ts, src/tools.ts 提取
extract_commands()  → 命令清单
extract_tools()     → 工具清单
extract_bootstrap_plan() → 启动计划
```

---

### 6.9 mock-anthropic-service — Mock 服务

**文件**: `rust/crates/mock-anthropic-service/src/lib.rs` (1,123 行)

确定性 Anthropic 兼容 Mock HTTP 服务，用于端到端 CLI 对等测试。

**12 个脚本化场景**:

| 场景 | 描述 |
|------|------|
| `streaming_text` | 流式文本响应 |
| `read_file_roundtrip` | 文件读取往返 |
| `grep_chunk_assembly` | Grep 分块组装 |
| `write_file_allowed` | 文件写入允许 |
| `write_file_denied` | 文件写入拒绝 |
| `multi_tool_turn_roundtrip` | 多工具轮次往返 |
| `bash_stdout_roundtrip` | Bash 标准输出往返 |
| `bash_permission_prompt_approved` | Bash 权限提示批准 |
| `bash_permission_prompt_denied` | Bash 权限提示拒绝 |
| `plugin_tool_roundtrip` | 插件工具往返 |
| `auto_compact_triggered` | 自动压缩触发 |
| `token_cost_reporting` | Token 费用报告 |

---

## 7. 核心流程详解

### 7.1 对话循环 (Turn Loop)

这是整个系统最核心的算法，`ConversationRuntime::run_turn()`:

```
run_turn(user_input)
  │
  ├── 1. 健康探测: 如果有压缩元数据，探测 tool_executor 是否可用
  │
  ├── 2. 记录 turn 开始 (tracer)
  │
  ├── 3. 推送用户文本到 Session
  │
  ├── 4. 进入内循环 (max_iterations 限制)
  │     │
  │     ├── 4a. 构建 ApiRequest (session.messages + system_prompt)
  │     ├── 4b. api_client.stream(request) → Vec<AssistantEvent>
  │     ├── 4c. build_assistant_message(events)
  │     │       ├── 累积 TextDelta → ContentBlock::Text
  │     │       ├── 收集 ToolUse 块
  │     │       └── 验证 MessageStop 和至少一个内容块
  │     │
  │     ├── 4d. 记录 usage 和 prompt_cache 事件
  │     ├── 4e. 推送 assistant 消息到 Session
  │     │
  │     ├── 4f. 如果没有 ToolUse → 跳出循环
  │     │
  │     └── 4g. 对每个 ToolUse:
  │           │
  │           ├── 运行 PreToolUse Hook
  │           │     └── 可能修改输入或覆盖权限决定
  │           │
  │           ├── 评估权限
  │           │     ├── Hook 拒绝 → Deny
  │           │     ├── Deny 规则匹配 → Deny
  │           │     ├── Ask 规则匹配 → 提示用户
  │           │     ├── Allow 规则或模式足够 → Allow
  │           │     └── 模式不足 → 提示或拒绝
  │           │
  │           ├── Allow 路径:
  │           │     ├── tool_executor.execute(name, input)
  │           │     ├── PostToolUse Hook (成功)
  │           │     └── 构建 ToolResult (is_error: false)
  │           │
  │           └── Deny 路径:
  │                 └── 构建 ToolResult (is_error: true, reason)
  │
  ├── 5. 自动压缩检查
  │     └── 累计 input tokens > 阈值 → compact session
  │
  └── 6. 返回 TurnSummary
```

---

### 7.2 权限系统

#### PermissionMode 层级

```
权限层级 (从低到高):

ReadOnly ──→ WorkspaceWrite ──→ DangerFullAccess ──→ Prompt ──→ Allow
  │               │                    │                 │          │
  只读           工作区内写          完全访问          总是提示    总是允许
```

#### 权限评估流程

```
authorize_with_context(tool_name, input, context)
  │
  ├── 1. Deny 规则优先 — 任何匹配立即拒绝
  │
  ├── 2. Hook 覆盖检查
  │     ├── Deny → 立即拒绝
  │     ├── Ask  → 强制提示
  │     └── Allow → 继续 (但 Ask 规则仍可覆盖)
  │
  ├── 3. Ask 规则 — 匹配则强制提示用户
  │
  ├── 4. Allow 规则或模式足够 → 允许
  │
  ├── 5. 模式升级提示
  │     ├── Prompt 模式 → 提示用户
  │     └── WorkspaceWrite + 需要 DangerFullAccess → 提示用户
  │
  └── 6. 硬拒绝 — 模式不匹配且无规则覆盖
```

#### 规则语法

```
规则字符串格式: "tool_name(matcher)"

示例:
  "bash(git:*)"        → bash 工具，git 前缀匹配
  "write_file(src/*)"  → write_file 工具，src/ 前缀匹配
  "bash"               → bash 工具，任意匹配
  "bash(*)"            → 同上

匹配器类型:
  * 或空   → Any (匹配所有)
  prefix:* → Prefix (前缀匹配)
  literal  → Exact (精确匹配)
```

#### 输入主体提取

```
extract_permission_subject(input_json)
  │
  └── 按优先级查找 JSON 键:
      command → path → file_path → filePath → notebook_path →
      notebookPath → url → pattern → code → message
      │
      └── 未找到 → 返回原始输入字符串
```

---

### 7.3 MCP 协议

MCP (Model Context Protocol) 是 Claw Code 连接外部工具服务器的协议。

#### 传输方式

```
McpTransport
├── Stdio         ← 当前唯一完整实现
├── Sse           ← 记录但未启动
├── Http          ← 记录但未启动
├── Ws            ← 记录但未启动
├── Sdk           ← 记录但未启动
└── ManagedProxy  ← 记录但未启动
```

#### JSON-RPC 帧

```
写入: Content-Length: {len}\r\n\r\n{JSON payload}
读取: 解析头 → 提取 Content-Length → 读取 N 字节
验证: jsonrpc == "2.0" && response.id == request.id
```

#### 服务器生命周期

```
ensure_server_ready(server_name)
  │
  ├── 1. 检查进程是否已退出 → reset_server()
  │
  ├── 2. 如果 process == None → 启动新进程
  │     └── McpStdioProcess { child, stdin, stdout }
  │
  ├── 3. 如果 initialized == false → 发送 "initialize" 请求
  │     ├── 成功 → initialized = true
  │     ├── 可重试错误 (Transport/Timeout) → reset + 重试一次
  │     └── 不可重试错误 → reset + 失败
  │
  └── 4. 就绪

工具发现:
  discover_tools_best_effort()
    └── 对每个服务器: ensure_server_ready → tools/list (分页) → 注册到 tool_index

工具调用:
  call_tool(qualified_name, arguments)
    └── 查找 ToolRoute → ensure_server_ready → tools/call → 返回结果
        └── 错误时: Transport/Timeout/InvalidResponse → reset_server
```

#### 超时常量

| 常量 | 生产环境 | 测试环境 |
|------|---------|---------|
| MCP_INITIALIZE_TIMEOUT_MS | 10,000ms | 200ms |
| MCP_LIST_TOOLS_TIMEOUT_MS | 30,000ms | 300ms |

---

### 7.4 会话持久化

#### 存储格式

```
JSONL 格式 (主要):
  每行一个 JSON 对象，通过 "type" 字段区分:

  {"type":"session_meta","version":1,"session_id":"session-...","created_at_ms":...}
  {"type":"compaction","count":1,"removed_message_count":5,"summary":"..."}
  {"type":"prompt_history","timestamp_ms":...,"text":"..."}
  {"type":"message","message":{"role":"user","blocks":[...],"usage":null}}
  {"type":"message","message":{"role":"assistant","blocks":[...],"usage":{...}}}

旧版 JSON 格式 (兼容读取):
  单个 JSON 对象，顶层 "messages" 键
```

#### 增量追加 vs 完整快照

```
push_message() → 增量追加单条 JSONL 记录到文件
save_to_path() → 完整快照重写 (原子写入: temp → rename)
```

#### 文件轮转

```
ROTATE_AFTER_BYTES = 256 KB
MAX_ROTATED_FILES  = 3

当文件超过 256KB:
  1. 重命名为 {stem}.rot-{timestamp}.jsonl
  2. 写入新快照
  3. 清理最老的轮转文件 (保留最多 3 个)
```

#### 时间戳保证

```
current_time_millis() 使用全局 AtomicU64 + compare-exchange 循环
→ 保证单调递增，即使并发调用也不会重复
```

---

### 7.5 配置系统

#### 配置发现顺序 (后者覆盖前者)

```
1. ~/.claw.json                              (User, 旧版)
2. ~/.config/claw/settings.json              (User, 新版)
3. {cwd}/.claw.json                          (Project, 旧版)
4. {cwd}/.claw/settings.json                 (Project, 新版)
5. {cwd}/.claw/settings.local.json           (Local, 本地覆盖)
```

#### 配置合并策略

```
deep_merge_objects():
  ├── 嵌套对象 → 递归合并
  └── 叶子值 → 后者覆盖前者

MCP 服务器 → 作用域感知合并 (同名的后作用域覆盖前作用域)
```

#### RuntimeFeatureConfig — 解析后的结构化配置

```
RuntimeFeatureConfig
├── hooks: RuntimeHookConfig
│     ├── pre_tool_use: Vec<String>
│     ├── post_tool_use: Vec<String>
│     └── post_tool_use_failure: Vec<String>
│
├── plugins: RuntimePluginConfig
│     ├── enabled_plugins: BTreeMap<String, bool>
│     ├── external_directories
│     ├── install_root
│     └── bundled_root
│
├── mcp: McpConfigCollection
│     └── servers: BTreeMap<String, ScopedMcpServerConfig>
│
├── oauth: Option<OAuthConfig>
├── model: Option<String>
├── aliases: BTreeMap<String, String>
├── permission_mode: Option<ResolvedPermissionMode>
├── permission_rules: RuntimePermissionRuleConfig
├── sandbox: SandboxConfig
├── provider_fallbacks: ProviderFallbackConfig
└── trusted_roots: Vec<String>
```

#### 权限模式别名

```
"default", "plan", "read-only"           → ReadOnly
"acceptEdits", "auto", "workspace-write" → WorkspaceWrite
"dontAsk", "danger-full-access"          → DangerFullAccess
```

---

### 7.6 流式渲染

#### Markdown 流式状态机

```
MarkdownStreamState
  │
  ├── push(renderer, delta)
  │     ├── 累积文本
  │     ├── 检测流安全边界 (空行 / 完成的代码围栏)
  │     ├── 找到边界 → 渲染累积块 → 返回 Some(rendered_ansi)
  │     └── 未找到 → 返回 None (等待更多数据)
  │
  └── flush(renderer)
        └── 强制渲染剩余文本

流安全边界检测:
  ├── 追踪打开的代码围栏 (```)
  ├── 围栏内 → 不刷新 (等待围栏关闭)
  └── 围栏外 + 空行 → 安全刷新
```

#### TerminalRenderer

```
Markdown → ANSI 转换:
  ├── 标题 (h1-h6)
  ├── 强调/粗体
  ├── 行内代码
  ├── 链接
  ├── 列表 (有序/无序/嵌套)
  ├── 引用块
  ├── 代码块 (╭─ language / ╰─ 边框 + syntect 高亮)
  ├── 表格
  └── 任务列表

语法高亮: syntect + "base16-ocean.dark" 主题
```

#### Spinner 动画

```
帧: ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
tick(): 保存光标 → 清行 → 打印帧+标签 → 恢复光标
finish(): 绿色 ✓ + 标签
fail(): 红色 ✗ + 标签
```

#### 工具调用渲染

```
工具调用开始:
  ╭─ bash ─╮
  │ $ git status
  ╰───────╯

  ╭─ read_file ─╮
  │ Reading src/main.rs...
  ╰─────────────╯

  ╭─ edit_file ─╮
  │ Editing src/main.rs
  │ - old_string
  │ + new_string
  ╰─────────────╯

工具结果:
  ✓ bash (exit 0)
    stdout output...

  ✗ write_file (denied)
    Permission denied: workspace-write required
```

---

### 7.7 Prompt 缓存

#### 缓存架构

```
PromptCache (Arc<Mutex<PromptCacheInner>>)
  │
  ├── config: PromptCacheConfig
  │     ├── session_id
  │     ├── completion_ttl: 30s
  │     ├── prompt_ttl: 5min
  │     └── cache_break_min_drop: 2,000 tokens
  │
  ├── stats: PromptCacheStats (累计计数器)
  │
  └── previous: Option<TrackedPromptState> (上次追踪状态)
        ├── model_hash, system_hash, tools_hash, messages_hash
        └── cache_read_input_tokens
```

#### 缓存命中/未命中流程

```
lookup_completion(request)
  │
  ├── 计算 request_hash (FNV-1a, v1- 前缀)
  ├── 读取磁盘 CompletionCacheEntry
  ├── 缺失/版本不匹配 → miss (删除过期文件)
  ├── 过期 (>30s) → miss (删除文件)
  └── 有效 → hit (应用用量到统计)

record_response(request, response)
  │
  ├── 计算 request_hash 和 TrackedPromptState
  ├── detect_cache_break(previous, current)
  │     ├── token_drop < 2000 → 无缓存中断
  │     ├── hash 变化 → 预期中断 (如 "system prompt changed")
  │     ├── TTL 过期 → 预期中断
  │     ├── hash 稳定但 token_drop ≥ 2000 → 意外中断 (基础设施问题)
  │     └── 版本变化 → 预期中断
  │
  └── 写入 CompletionCacheEntry 到磁盘
```

#### 磁盘布局

```
$CLAUDE_CONFIG_HOME/cache/prompt-cache/  (或 $HOME/.claude/cache/prompt-cache/)
├── {session_id}/
│   ├── stats.json              # 累计统计
│   ├── session-state.json      # 会话状态
│   └── completions/
│       ├── v1-{hash1}.json     # 单个缓存条目
│       └── v1-{hash2}.json
```

---

## 8. 工具清单 (50 个)

### 核心 I/O (6 个，始终加载)

| # | 名称 | 权限 | 描述 |
|---|------|------|------|
| 1 | `bash` | DangerFullAccess* | 执行 Shell 命令 (*动态分类: 只读命令降级) |
| 2 | `read_file` | ReadOnly | 读取文本文件 |
| 3 | `write_file` | WorkspaceWrite | 写入文本文件 |
| 4 | `edit_file` | WorkspaceWrite | 替换文件中的文本 |
| 5 | `glob_search` | ReadOnly | 按 Glob 模式查找文件 |
| 6 | `grep_search` | ReadOnly | 按正则搜索文件内容 |

### Web 工具 (2 个)

| # | 名称 | 权限 | 描述 |
|---|------|------|------|
| 7 | `WebFetch` | ReadOnly | 获取 URL 内容并回答问题 |
| 8 | `WebSearch` | ReadOnly | 搜索 Web 并返回引用结果 |

### 任务管理 (7 个)

| # | 名称 | 权限 | 描述 |
|---|------|------|------|
| 9 | `TaskCreate` | DangerFullAccess | 创建后台任务 |
| 10 | `RunTaskPacket` | DangerFullAccess | 从结构化数据包创建任务 |
| 11 | `TaskGet` | ReadOnly | 获取任务状态 |
| 12 | `TaskList` | ReadOnly | 列出所有任务 |
| 13 | `TaskStop` | DangerFullAccess | 停止任务 |
| 14 | `TaskUpdate` | DangerFullAccess | 更新任务 |
| 15 | `TaskOutput` | ReadOnly | 获取任务输出 |

### Worker 生命周期 (9 个)

| # | 名称 | 权限 | 描述 |
|---|------|------|------|
| 16 | `WorkerCreate` | DangerFullAccess | 创建编码 Worker 启动会话 |
| 17 | `WorkerGet` | ReadOnly | 获取 Worker 启动状态 |
| 18 | `WorkerObserve` | ReadOnly | 输入终端快照到启动检测 |
| 19 | `WorkerResolveTrust` | DangerFullAccess | 解决信任提示 |
| 20 | `WorkerAwaitReady` | ReadOnly | 等待 Worker 就绪 |
| 21 | `WorkerSendPrompt` | DangerFullAccess | 发送任务提示 |
| 22 | `WorkerRestart` | DangerFullAccess | 重启 Worker |
| 23 | `WorkerTerminate` | DangerFullAccess | 终止 Worker |
| 24 | `WorkerObserveCompletion` | DangerFullAccess | 报告会话完成 |

### Team/Cron (5 个)

| # | 名称 | 权限 | 描述 |
|---|------|------|------|
| 25 | `TeamCreate` | DangerFullAccess | 创建子 Agent 团队 |
| 26 | `TeamDelete` | DangerFullAccess | 删除团队 |
| 27 | `CronCreate` | DangerFullAccess | 创建定时任务 |
| 28 | `CronDelete` | DangerFullAccess | 删除定时任务 |
| 29 | `CronList` | ReadOnly | 列出定时任务 |

### LSP/MCP (6 个)

| # | 名称 | 权限 | 描述 |
|---|------|------|------|
| 30 | `LSP` | ReadOnly | 查询语言服务器协议 |
| 31 | `ListMcpResources` | ReadOnly | 列出 MCP 资源 |
| 32 | `ReadMcpResource` | ReadOnly | 读取 MCP 资源 |
| 33 | `McpAuth` | DangerFullAccess | MCP 服务器认证 |
| 34 | `MCP` | DangerFullAccess | 执行 MCP 工具 |
| 35 | `TestingPermission` | DangerFullAccess | 测试权限执行 |

### Agent/Skill/UI (15 个)

| # | 名称 | 权限 | 描述 |
|---|------|------|------|
| 36 | `Agent` | DangerFullAccess | 启动专用 Agent |
| 37 | `Skill` | ReadOnly | 加载技能定义 |
| 38 | `ToolSearch` | ReadOnly | 搜索延迟/专用工具 |
| 39 | `TodoWrite` | WorkspaceWrite | 更新任务列表 |
| 40 | `NotebookEdit` | WorkspaceWrite | 编辑 Jupyter 单元格 |
| 41 | `Sleep` | ReadOnly | 等待指定时间 |
| 42 | `SendUserMessage` | ReadOnly | 发送消息给用户 |
| 43 | `Config` | WorkspaceWrite | 获取/设置配置 |
| 44 | `EnterPlanMode` | WorkspaceWrite | 启用规划模式 |
| 45 | `ExitPlanMode` | WorkspaceWrite | 退出规划模式 |
| 46 | `StructuredOutput` | ReadOnly | 结构化输出 |
| 47 | `REPL` | DangerFullAccess | REPL 子进程 |
| 48 | `PowerShell` | DangerFullAccess* | PowerShell 命令 (*动态分类) |
| 49 | `AskUserQuestion` | ReadOnly | 向用户提问 |
| 50 | `RemoteTrigger` | DangerFullAccess | 触发远程操作 |

---

## 9. 斜杠命令清单 (139 个)

### Session 类 (32 个)

| 命令 | 别名 | 摘要 | 可恢复 |
|------|------|------|--------|
| `/help` | — | 显示可用命令 | ✓ |
| `/status` | — | 会话状态 | ✓ |
| `/cost` | — | Token 用量 | ✓ |
| `/resume` | — | 加载保存的会话 | ✗ |
| `/session` | — | 列出/切换/分叉/删除会话 | ✗ |
| `/version` | — | 版本信息 | ✓ |
| `/usage` | — | API 用量统计 | ✓ |
| `/stats` | — | 工作区统计 | ✓ |
| `/rename` | — | 重命名会话 | ✗ |
| `/clear` | — | 开始新会话 | ✓ |
| `/compact` | — | 压缩会话历史 | ✓ |
| `/history` | — | 对话历史摘要 | ✓ |
| `/tokens` | — | Token 计数 | ✓ |
| `/cache` | — | Prompt 缓存统计 | ✓ |
| `/exit` | — | 退出 REPL | ✗ |
| `/summary` | — | 生成对话摘要 | ✓ |
| `/tag` | — | 标记对话点 | ✓ |
| `/thinkback` | — | 回放思考过程 | ✓ |
| `/copy` | — | 复制到剪贴板 | ✓ |
| `/share` | — | 分享对话 | ✗ |
| `/feedback` | — | 提交反馈 | ✗ |
| `/rewind` | — | 回退对话 | ✗ |
| `/pin` | — | 固定消息 | ✗ |
| `/unpin` | — | 取消固定 | ✗ |
| `/bookmarks` | — | 书签管理 | ✓ |
| `/context` | — | 上下文管理 | ✓ |
| `/files` | — | 上下文窗口中的文件 | ✓ |
| `/focus` | — | 聚焦特定文件 | ✗ |
| `/unfocus` | — | 取消聚焦 | ✗ |
| `/retry` | — | 重试失败消息 | ✗ |
| `/stop` | — | 停止生成 | ✗ |
| `/undo` | — | 撤销文件写入 | ✗ |

### Config 类 (35 个)

| 命令 | 摘要 | 可恢复 |
|------|------|--------|
| `/model` | 显示/切换模型 | ✗ |
| `/permissions` | 显示/切换权限模式 | ✗ |
| `/config` | 检查配置文件 | ✓ |
| `/memory` | 检查指令记忆文件 | ✓ |
| `/theme` | 切换颜色主题 | ✓ |
| `/vim` | 切换 Vim 模式 | ✓ |
| `/voice` | 切换语音输入 | ✗ |
| `/color` | 配置颜色设置 | ✓ |
| `/effort` | 设置响应努力级别 | ✓ |
| `/fast` | 切换快速模式 | ✓ |
| `/brief` | 切换简洁模式 | ✓ |
| `/output-style` | 切换输出格式 | ✓ |
| `/keybindings` | 键盘快捷键 | ✓ |
| `/privacy-settings` | 隐私设置 | ✓ |
| `/stickers` | 贴纸包管理 | ✓ |
| `/language` | 设置界面语言 | ✓ |
| `/profile` | 用户配置 | ✗ |
| `/max-tokens` | 最大输出 Token | ✓ |
| `/temperature` | 采样温度 | ✓ |
| `/system-prompt` | 显示系统提示词 | ✓ |
| `/api-key` | API Key 管理 | ✗ |
| `/terminal-setup` | 终端集成设置 | ✓ |
| `/notifications` | 通知设置 | ✓ |
| `/telemetry` | 遥测设置 | ✓ |
| `/providers` | 列出 Provider | ✓ |
| `/env` | 环境变量 | ✓ |
| `/project` | 项目检测信息 | ✓ |
| `/reasoning` | 扩展推理模式 | ✓ |
| `/budget` | Token 预算 | ✓ |
| `/rate-limit` | API 速率限制 | ✓ |
| `/workspace` | 工作目录 | ✓ |
| `/reset` | 重置配置 | ✗ |
| `/ide` | IDE 集成 | ✗ |
| `/desktop` | 桌面应用集成 | ✗ |
| `/upgrade` | 检查更新 | ✗ |

### Debug 类 (7 个)

| 命令 | 摘要 |
|------|------|
| `/debug-tool-call` | 重放上次工具调用 |
| `/doctor` | 诊断健康检查 |
| `/sandbox` | 沙箱状态 |
| `/diagnostics` | LSP 诊断 |
| `/tool-details` | 工具详情 |
| `/changelog` | 变更日志 |
| `/metrics` | 性能指标 |

### Tools 类 (65 个)

| 命令 | 摘要 |
|------|------|
| `/commit` | 生成提交信息并提交 |
| `/pr` | 创建 Pull Request |
| `/issue` | 创建 GitHub Issue |
| `/bughunter` | 代码库 Bug 检测 |
| `/ultraplan` | 深度规划 |
| `/teleport` | 跳转到文件/符号 |
| `/review` | 代码审查 |
| `/mcp` | MCP 服务器检查 |
| `/agents` | 列出 Agent |
| `/skills` | 技能管理 |
| `/plugin` | 插件管理 |
| `/init` | 创建 CLAUDE.md |
| `/diff` | Git diff |
| `/export` | 导出会话 |
| `/tasks` | 后台任务管理 |
| `/plan` | 规划模式 |
| `/security-review` | 安全审查 |
| `/release-notes` | 发布说明 |
| `/branch` | Git 分支管理 |
| `/search` | 搜索文件 |
| `/test` | 运行测试 |
| `/lint` | 运行 Lint |
| `/build` | 构建项目 |
| `/run` | 运行命令 |
| `/git` | Git 命令 |
| `/stash` | Git stash |
| `/blame` | Git blame |
| `/log` | Git log |
| `/cron` | 定时任务管理 |
| `/team` | Agent 团队管理 |
| `/benchmark` | 性能基准测试 |
| `/migrate` | 数据迁移 |
| `/explain` | 解释代码 |
| `/refactor` | 重构建议 |
| `/docs` | 生成文档 |
| `/fix` | 修复错误 |
| `/perf` | 性能分析 |
| `/chat` | 自由聊天模式 |
| `/web` | 获取网页 |
| `/map` | 代码库结构图 |
| `/symbols` | 列出符号 |
| `/references` | 查找引用 |
| `/definition` | 跳转到定义 |
| `/hover` | 悬停信息 |
| `/autofix` | 自动修复 |
| `/multi` | 执行多个命令 |
| `/macro` | 命令宏 |
| `/alias` | 命令别名 |
| `/parallel` | 并行子 Agent |
| `/agent` | 子 Agent 管理 |
| `/subagent` | 子 Agent 控制 |
| `/listen` | 语音输入 |
| `/speak` | 朗读响应 |
| `/screenshot` | 截图 |
| `/image` | 添加图片 |
| `/paste` | 粘贴剪贴板 |
| `/templates` | Prompt 模板 |
| `/add-dir` | 添加目录到上下文 |
| `/allowed-tools` | 允许的工具列表 |
| `/approve` (`/yes`, `/y`) | 批准工具执行 |
| `/deny` (`/no`, `/n`) | 拒绝工具执行 |
| `/advisor` | 顾问模式 |
| `/insights` | AI 洞察 |
| `/advisor` | 顾问模式 |

---

## 10. Provider 与模型路由

### 支持的 Provider

```
┌────────────┬──────────────────┬─────────────────────────────┐
│ Provider   │ 环境变量          │ 默认 Base URL               │
├────────────┼──────────────────┼─────────────────────────────┤
│ Anthropic  │ ANTHROPIC_API_KEY│ https://api.anthropic.com   │
│            │ ANTHROPIC_AUTH   │                             │
│            │ _TOKEN           │                             │
├────────────┼──────────────────┼─────────────────────────────┤
│ xAI        │ XAI_API_KEY      │ https://api.x.ai            │
├────────────┼──────────────────┼─────────────────────────────┤
│ OpenAI     │ OPENAI_API_KEY   │ https://api.openai.com      │
│            │ OPENAI_BASE_URL  │ (可覆盖，支持 Ollama 等)     │
├────────────┼──────────────────┼─────────────────────────────┤
│ DashScope  │ DASHSCOPE_API_KEY│ https://dashscope.aliyuncs  │
│ (Qwen/Kimi)│                  │ .com/api/v1                 │
└────────────┴──────────────────┴─────────────────────────────┘
```

### 模型 Token 限制

| 模型 | 最大输出 Token | 上下文窗口 |
|------|---------------|-----------|
| claude-opus-4-6 | 32,000 | 200,000 |
| claude-sonnet-4-6 | 64,000 | 200,000 |
| claude-haiku-4-5 | 64,000 | 200,000 |
| grok-3 | 64,000 | 131,072 |
| grok-3-mini | 64,000 | 131,072 |
| kimi-k2.5 | 16,000 | 256,000 |
| kimi-k1.5 | 16,000 | 256,000 |

### 模型别名

```
别名         → 解析结果
"opus"       → "claude-opus-4-6"
"sonnet"     → "claude-sonnet-4-6"
"haiku"      → "claude-haiku-4-5-20251213"
"grok"       → "grok-3"
"grok-3"     → "grok-3"
"grok-mini"  → "grok-3-mini"
"grok-2"     → "grok-2"
"kimi"       → "kimi-k2.5"
```

### OpenAI 兼容层请求翻译

```
Anthropic 格式                    OpenAI 格式
─────────────────                 ──────────────
system (顶层字段)          →      role: "system" 消息
InputMessage.role          →      ChatMessage.role
ContentBlock::ToolUse      →      ChatMessage.tool_calls
ContentBlock::ToolResult   →      role: "tool" + tool_call_id
max_tokens                 →      max_tokens / max_completion_tokens*
tool_choice                →      tool_choice
stop_sequences             →      stop

* gpt-5* 模型使用 max_completion_tokens，其余使用 max_tokens
```

---

## 11. 测试体系

### 集成测试文件

| 文件 | 行数 | 覆盖范围 |
|------|------|---------|
| `rusty-claude-cli/tests/mock_parity_harness.rs` | 883 | 10 个脚本化场景的 CLI 端到端测试 |
| `rusty-claude-cli/tests/output_format_contract.rs` | 473 | JSON 输出契约 (help/version/status/sandbox/...) |
| `rusty-claude-cli/tests/resume_slash_commands.rs` | 559 | 会话恢复 + 斜杠命令 |
| `rusty-claude-cli/tests/cli_flags_and_config_defaults.rs` | 298 | CLI 标志和配置默认值 |
| `rusty-claude-cli/tests/compact_output.rs` | 214 | --compact 标志 |
| `runtime/tests/integration_tests.rs` | 386 | 跨模块集成 (策略引擎/配置合并) |
| `api/tests/client_integration.rs` | 928 | AnthropicClient 流式/缓存/遥测 |
| `api/tests/openai_compat_integration.rs` | 531 | OpenAI 兼容请求构建 |
| `api/tests/provider_client_integration.rs` | 88 | Provider 客户端基础 |
| `api/tests/proxy_integration.rs` | 173 | HTTP 代理配置 |
| `api/benches/request_building.rs` | 329 | Criterion 基准测试 |
| `tests/test_porting_workspace.py` | 248 | Python 对等审计 |

### 运行测试

```bash
# 完整测试套件
cd rust && cargo test --workspace

# 特定 Crate 测试
cargo test -p runtime
cargo test -p api
cargo test -p tools

# 基准测试
cargo bench -p api

# 格式化和 Lint
cargo fmt
cargo clippy --workspace --all-targets -- -D warnings
```

---

## 12. 关键 Trait 一览

| Trait | Crate | 方法 | 用途 |
|-------|-------|------|------|
| `ApiClient` | runtime | `stream(request) → Vec<AssistantEvent>` | 对话循环 API 调用 |
| `ToolExecutor` | runtime | `execute(tool_name, input) → Result<String>` | 工具分发接口 |
| `ProviderClient` | api | `send_message()` / `stream_message()` | Provider 无关消息发送 |
| `PermissionPrompter` | runtime | `prompt(request) → Decision` | 交互式权限决定 |
| `Plugin` | plugins | `metadata()`, `hooks()`, `tools()`, `initialize()`, `shutdown()` | 插件生命周期 |
| `TelemetrySink` | telemetry | `record(event)` | 遥测事件记录 |
| `ToolCallHandler` | runtime | MCP 工具调用处理 | MCP 工具调用接口 |

---

## 13. 数据流图

### 完整请求生命周期

```
用户输入
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ LiveCli                                                          │
│   │                                                              │
│   ├── 记录 prompt_history                                        │
│   ├── prepare_turn_runtime() → 构建 BuiltRuntime                 │
│   │     ├── 加载配置 (ConfigLoader)                               │
│   │     ├── 初始化插件 (PluginManager)                            │
│   │     ├── 启动 MCP 服务器 (McpServerManager)                    │
│   │     ├── 组装工具注册表 (GlobalToolRegistry)                   │
│   │     └── 构建 ConversationRuntime                              │
│   │                                                              │
│   ├── run_turn(input)                                            │
│   │     │                                                        │
│   │     ▼                                                        │
│   │   ConversationRuntime.run_turn()                             │
│   │     │                                                        │
│   │     ├── Session.push_user_text(input)                        │
│   │     │                                                        │
│   │     ├── [内循环]                                              │
│   │     │     ├── ApiRequest { system_prompt, messages }          │
│   │     │     │                                                  │
│   │     │     ▼                                                  │
│   │     │   AnthropicRuntimeClient.stream()                      │
│   │     │     ├── AnthropicClient.stream_message()               │
│   │     │     │     ├── preflight_message_request()              │
│   │     │     │     ├── send_with_retry() (指数退避+抖动)        │
│   │     │     │     └── MessageStream (SSE 解析)                 │
│   │     │     │                                                  │
│   │     │     └── TerminalRenderer (流式 Markdown→ANSI)           │
│   │     │                                                        │
│   │     │   build_assistant_message(events)                      │
│   │     │     ├── TextDelta → ContentBlock::Text                 │
│   │     │     └── ToolUse → ContentBlock::ToolUse                │
│   │     │                                                        │
│   │     │   Session.push_message(assistant_message)              │
│   │     │                                                        │
│   │     │   [对每个 ToolUse]                                      │
│   │     │     ├── HookRunner.run(PreToolUse)                     │
│   │     │     ├── PermissionPolicy.authorize_with_context()      │
│   │     │     │                                                  │
│   │     │     ├── [Allow]                                        │
│   │     │     │     ├── ToolExecutor.execute()                   │
│   │     │     │     │     ├── 内置工具 → execute_tool()          │
│   │     │     │     │     ├── 插件工具 → plugin.execute()        │
│   │     │     │     │     └── MCP 工具 → McpServerManager       │
│   │     │     │     ├── HookRunner.run(PostToolUse)              │
│   │     │     │     └── ToolResult { is_error: false }           │
│   │     │     │                                                  │
│   │     │     └── [Deny]                                         │
│   │     │           └── ToolResult { is_error: true, reason }    │
│   │     │                                                        │
│   │     │   Session.push_message(tool_result)                    │
│   │     │                                                        │
│   │     │   [无 ToolUse → 跳出循环]                               │
│   │     │                                                        │
│   │     └── maybe_auto_compact()                                 │
│   │                                                              │
│   ├── replace_runtime() → 替换消耗的运行时                        │
│   ├── persist_session() → JSONL 持久化                           │
│   └── 返回 TurnSummary                                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 重试与错误恢复

```
API 请求重试 (send_with_retry):
  │
  ├── 最大重试次数: max_retries + 1
  ├── 退避策略: 指数退避 (1s → 2s → 4s → ... → 128s) + 随机抖动
  ├── 可重试状态码: 408, 409, 429, 500-504
  └── PRNG: splitmix64 (种子: 纳秒时间 + 单调计数器)

MCP 服务器恢复:
  │
  ├── Transport/Timeout 错误 → reset_server + 重试一次
  ├── InvalidResponse → reset_server
  └── reset_server: 杀死进程 → 清除 initialized 标志 → 下次访问重新启动

会话恢复:
  │
  ├── load_from_path: 自动检测 JSON/JSONL 格式
  ├── fork: 创建新 session_id，复制消息，记录父 ID
  └── compact: 压缩历史消息，保留摘要
```

---

## 14. 常见场景速查

### 场景 1: 添加新的内置工具

```
1. 在 tools/src/lib.rs 的 mvp_tool_specs() 中添加 ToolSpec
   - name, description, input_schema (JSON Schema), required_permission

2. 在 tools/src/lib.rs 的 execute_tool_with_enforcer() 中添加 match 分支
   - 解析输入 (serde_json::from_value)
   - 可选: maybe_enforce_permission_check()
   - 调用执行函数
   - 返回 Result<String, String>

3. 更新测试
```

### 场景 2: 添加新的斜杠命令

```
1. 在 commands/src/lib.rs 的 SLASH_COMMAND_SPECS 中添加 SlashCommandSpec
   - name, aliases, summary, argument_hint, resume_supported

2. 在 SlashCommand 枚举中添加变体

3. 在 validate_slash_command_input() 中添加 match 分支

4. 在 main.rs 的 handle_repl_command() 中添加处理逻辑
```

### 场景 3: 添加新的 Provider

```
1. 在 api/src/providers/ 中创建新模块 (如 deepseek.rs)

2. 实现 ProviderClient trait (send_message, stream_message)

3. 在 api/src/providers/mod.rs 中:
   - 添加 ProviderKind 枚举变体
   - 更新 detect_provider_kind()
   - 更新 metadata_for_model()
   - 更新 model_token_limit()

4. 在 main.rs 的 AnthropicRuntimeClient 中添加分发逻辑
```

### 场景 4: 配置 MCP 服务器

```json
// .claw/settings.json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my/mcp-server"],
      "env": { "API_KEY": "..." },
      "tool_call_timeout_ms": 30000
    }
  }
}
```

### 场景 5: 配置权限规则

```json
// .claw/settings.json
{
  "permissions": {
    "allow": ["bash(git:*)", "read_file"],
    "deny": ["bash(rm:*)"],
    "ask": ["write_file"]
  }
}
```

### 场景 6: 会话管理

```bash
# 列出会话
claw session list

# 恢复会话
claw --resume path/to/session.jsonl

# 在 REPL 中恢复
/resume path/to/session.jsonl

# 导出会话
claw export session-ref output.json

# 清除当前会话
/clear
```

### 场景 7: 调试

```bash
# 健康检查
claw doctor

# 查看状态
claw status

# 查看沙箱
claw sandbox

# 查看系统提示词
claw system-prompt

# 查看配置
claw config

# 调试工具调用
/debug-tool-call
```

---

> **报告生成时间**: 2026-04-25
> **基于提交**: a389f8d
> **总代码规模**: ~80,691 行 Rust + ~30 个 Python 文件
