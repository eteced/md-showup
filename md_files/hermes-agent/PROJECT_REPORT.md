# Hermes Agent 项目全景报告

> **版本**: v0.11.0 | **许可证**: MIT | **作者**: Nous Research
> **定位**: 自我改进的 AI Agent —— 从经验中创建技能，在使用中改进，随处运行

---

## 目录

1. [项目是什么](#1-项目是什么)
2. [整体架构总览](#2-整体架构总览)
3. [核心引擎：Agent Loop](#3-核心引擎agent-loop)
4. [LLM 提供者适配层](#4-llm-提供者适配层)
5. [工具系统](#5-工具系统)
6. [技能系统](#6-技能系统)
7. [插件系统](#7-插件系统)
8. [记忆系统](#8-记忆系统)
9. [上下文管理](#9-上下文管理)
10. [会话持久化](#10-会话持久化)
11. [消息网关与多平台适配](#11-消息网关与多平台适配)
12. [CLI 与终端 TUI](#12-cli-与终端-tui)
13. [Web Dashboard](#13-web-dashboard)
14. [MCP 与 ACP 协议](#14-mcp-与-acp-协议)
15. [定时任务系统](#15-定时任务系统)
16. [安全模型](#16-安全模型)
17. [配置系统](#17-配置系统)
18. [RL 训练环境](#18-rl-训练环境)
19. [构建与部署](#19-构建与部署)
20. [测试体系](#20-测试体系)
21. [目录结构速查](#21-目录结构速查)
22. [关键文件索引](#22-关键文件索引)

---

## 1. 项目是什么

Hermes Agent 是一个功能极其丰富的 **自主 AI Agent 框架**，核心能力包括：

- **多轮对话 + 工具调用循环**：与 LLM 交互，自动调用工具完成任务
- **60+ 内置工具**：终端执行、文件操作、网页搜索、浏览器自动化、代码执行、图像生成、语音合成等
- **20+ LLM 提供者**：OpenAI、Anthropic、Google Gemini、AWS Bedrock、Mistral 等
- **20+ 消息平台**：Telegram、Discord、Slack、WhatsApp、微信/企业微信、飞书、钉钉等
- **自我改进**：从经验中创建技能 (Skills)，在使用中迭代优化
- **随处运行**：CLI、TUI、Web Dashboard、Docker、Nix、Android/Termux

```
┌─────────────────────────────────────────────────────────────────┐
│                      Hermes Agent 全景                          │
│                                                                 │
│   用户入口        核心引擎           输出通道                    │
│  ┌─────────┐   ┌───────────┐    ┌──────────────┐              │
│  │   CLI   │──▶│           │──▶│   Telegram    │              │
│  │   TUI   │──▶│  Agent    │──▶│   Discord     │              │
│  │  Web UI │──▶│   Loop    │──▶│   Slack       │              │
│  │  API    │──▶│           │──▶│   WhatsApp    │              │
│  │  MCP    │──▶│  ┌─────┐  │──▶│   微信/飞书    │              │
│  │  ACP    │──▶│  │LLM  │  │──▶│   Email/SMS   │              │
│  └─────────┘   │  └─────┘  │    └──────────────┘              │
│                │  ┌─────┐  │                                   │
│                │  │Tools│  │    持久化                          │
│                │  └─────┘  │   ┌──────────┐                   │
│                │  ┌─────┐  │──▶│  SQLite   │                   │
│                │  │Skill│  │   │  Memory   │                   │
│                │  └─────┘  │   │  Config   │                   │
│                └───────────┘   └──────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 整体架构总览

Hermes Agent 采用 **分层架构**，从下到上依次为：

```
┌────────────────────────────────────────────────────────────────────────┐
│                         用户交互层 (User Interface)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   CLI    │ │   TUI    │ │ Web Dash │ │ API Srv  │ │ MCP/ACP  │  │
│  │ (cli.py) │ │(Ink/React)│ │(React19) │ │(FastAPI) │ │ Protocol │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
├───────┼────────────┼────────────┼────────────┼────────────┼─────────┤
│       │         网关层 (Gateway) │            │            │          │
│  ┌────▼─────────────▼────────────▼────────────▼────────────▼──────┐  │
│  │                    Gateway Runner                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  Platform Adapters (Telegram/Discord/Slack/WhatsApp/...) │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────┬───────────────────────────────────────┘  │
├───────────────────────────┼──────────────────────────────────────────┤
│                    核心引擎层 (Agent Core)                             │
│  ┌────────────────────────▼───────────────────────────────────────┐  │
│  │  AIAgent (run_agent.py)                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │  Prompt  │ │  Context │ │  Memory  │ │  Credential Pool │ │  │
│  │  │  Builder │ │  Engine  │ │  Manager │ │  (多密钥轮转)     │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │  │
│  └────────────────────────┬───────────────────────────────────────┘  │
├───────────────────────────┼──────────────────────────────────────────┤
│                    LLM 传输层 (Transport)                             │
│  ┌────────────────────────▼───────────────────────────────────────┐  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────┐ ┌───────────────┐  │  │
│  │  │  OpenAI    │ │  Anthropic │ │Bedrock │ │   Gemini      │  │  │
│  │  │  Chat Comp │ │  Messages  │ │Converse│ │   Native      │  │  │
│  │  └────────────┘ └────────────┘ └────────┘ └───────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                    工具与能力层 (Tools & Skills)                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Tool Registry (自注册)                                        │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │  │
│  │  │Term│ │File│ │Web │ │Brow│ │Visn│ │Code│ │Delg│ │MCP │  │  │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │  │
│  │  Skills (30+ 类别)  │  Plugins (内存/图像/上下文)              │  │
│  └───────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                    执行环境层 (Execution Backends)                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐       │
│  │Local │ │Docker│ │ SSH  │ │Modal │ │Dayton│ │Singularity│       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘       │
├──────────────────────────────────────────────────────────────────────┤
│                    持久化层 (Persistence)                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ SQLite (WAL) │ │  Memory.md   │ │  Config.yaml │               │
│  │  FTS5 全文搜索│ │  User.md     │ │  .env        │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心引擎：Agent Loop

Agent Loop 是 Hermes 的心脏，位于 `run_agent.py` 中的 `AIAgent` 类。

### 3.1 执行流程

```
用户消息
    │
    ▼
┌─────────────────────────┐
│  构建 System Prompt      │  ← prompt_builder.py
│  (身份 + 记忆 + 技能指导  │
│   + 平台提示 + 上下文文件) │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  构建 API 请求参数        │  ← model, messages, tools, reasoning
│  (模型 + 消息 + 工具定义  │
│   + 推理配置)            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  调用 LLM API           │  ← transport 层分发
│  (OpenAI/Anthropic/     │
│   Bedrock/Gemini/...)   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  判断响应类型             │
└────┬───────────┬────────┘
     │           │
  工具调用      文本回复
     │           │
     ▼           ▼
┌──────────┐  ┌──────────────┐
│ 执行工具  │  │ 持久化会话    │
│ (registry │  │ 返回最终响应  │
│  dispatch)│  └──────────────┘
└────┬─────┘
     │
     ▼
┌──────────────────┐
│ 将工具结果加入对话 │
│ 回到 LLM 调用     │──── 循环 ────▶
└──────────────────┘
```

### 3.2 AIAgent 类关键参数

```python
class AIAgent:
    def __init__(self,
        base_url: str = None,          # API 端点
        api_key: str = None,           # API 密钥
        provider: str = None,          # 提供者名称
        api_mode: str = None,          # "chat_completions" | "codex_responses" | anthropic
        model: str = "",               # 模型名称
        max_iterations: int = 90,      # 最大工具调用迭代次数
        enabled_toolsets: list = None, # 启用的工具集
        disabled_toolsets: list = None,# 禁用的工具集
        platform: str = None,          # "cli", "telegram", 等
        session_id: str = None,        # 会话 ID
        # ... 共约 60 个参数
    )
```

### 3.3 文件依赖链

```
tools/registry.py  (无依赖 — 所有工具文件导入它)
       ↑
tools/*.py  (每个文件在 import 时调用 registry.register())
       ↑
model_tools.py  (导入 registry + 触发工具发现)
       ↑
run_agent.py, cli.py, batch_runner.py, environments/
```

**关键设计**：工具采用 **自注册模式**，每个工具文件在 import 时自动调用 `registry.register()`，无需手动维护工具列表。

---

## 4. LLM 提供者适配层

Hermes 支持 20+ LLM 提供者，通过传输层 (Transport) 抽象实现统一接口。

### 4.1 传输层架构

```
┌─────────────────────────────────────────────────────────┐
│                   Transport 抽象层                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │           BaseTransport (base.py)                │    │
│  │  connect() / send() / receive() / disconnect()  │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                                │
│  ┌──────────┬───────────┼──────────┬────────────────┐  │
│  │          │           │          │                │  │
│  ▼          ▼           ▼          ▼                ▼  │
│ OpenAI    Anthropic   Bedrock    Gemini         Codex  │
│ ChatComp  Messages    Converse   Native        Responses│
│ (chat_    (anthropic_ (bedrock_ (gemini_      (codex_  │
│ complet   adapter.py) adapter.py) native_     responses│
│ ions.py)                        adapter.py)  adapter.py│
└─────────────────────────────────────────────────────────┘
```

### 4.2 各适配器特性

| 适配器 | 文件 | 特性 |
|--------|------|------|
| **OpenAI Chat Completions** | `agent/transports/chat_completions.py` | 标准 OpenAI API，兼容所有 OpenAI-compatible 端点 |
| **Anthropic Messages** | `agent/anthropic_adapter.py` | 原生 Messages API，支持 thinking budget、prompt caching、Claude Code 凭证 |
| **AWS Bedrock** | `agent/bedrock_adapter.py` | Converse API，IAM/SSO 认证，跨区域推理，guardrails |
| **Google Gemini** | `agent/gemini_native_adapter.py` | 原生 REST API，免费/付费层级探测 |
| **Codex Responses** | `agent/codex_responses_adapter.py` | OpenAI Responses API 格式，用于 Codex/xAI/GitHub Models |
| **GitHub Copilot** | `agent/copilot_acp_client.py` | ACP 协议，短期会话 |

### 4.3 凭证池 (Credential Pool)

```
┌────────────────────────────────────────────────────┐
│              Credential Pool                        │
│                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ Key-1   │ │ Key-2   │ │ Key-3   │  ...        │
│  │ status  │ │ status  │ │ status  │             │
│  │ uses    │ │ uses    │ │ uses    │             │
│  │ cooldown│ │ cooldown│ │ cooldown│             │
│  └─────────┘ └─────────┘ └─────────┘             │
│                                                    │
│  轮转策略:                                          │
│  • fill_first   — 顺序填充                          │
│  • round_robin  — 轮询                              │
│  • random       — 随机                              │
│  • least_used   — 最少使用优先                       │
│                                                    │
│  故障处理:                                          │
│  • 429/402 → 冷却 1 小时                            │
│  • 自动切换到下一个凭证                              │
│  • 凭证耗尽时整体降级                                │
└────────────────────────────────────────────────────┘
```

### 4.4 提供者注册表

`hermes_cli/providers.py` 合并三个数据源：
1. **models.dev 目录** — 109+ 提供者的元数据
2. **Hermes 覆盖层** — 传输类型、认证模式、聚合标志
3. **用户配置** — 自定义端点

---

## 5. 工具系统

### 5.1 工具注册机制

```python
# tools/registry.py — 工具注册中心
class ToolRegistry:
    def register(self, name, toolset, schema, handler, ...):
        """每个工具文件在 import 时调用此方法"""

# tools/terminal_tool.py — 示例
registry.register(
    name="terminal",
    toolset="terminal",
    schema={...},           # JSON Schema 参数定义
    handler=execute_terminal,# 实际执行函数
    check_fn=...,
    requires_env=[...],
    is_async=True,
)
```

**发现机制**：`model_tools.py` 中的 `discover_builtin_tools()` 通过 AST 分析扫描 `tools/` 目录，自动发现所有调用 `registry.register()` 的文件。

### 5.2 工具集 (Toolsets)

工具按功能分组为 **工具集**，可按平台/场景启用或禁用：

```
┌──────────────────────────────────────────────────────────┐
│                    Toolset 体系                            │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │  web    │ │terminal │ │  file   │ │ browser │      │
│  │ web_search│ │terminal │ │read_file│ │browser_ │      │
│  │ web_extract│ │process │ │write_file│ │navigate │      │
│  └─────────┘ └─────────┘ │patch    │ │browser_ │      │
│                           │search_files│ click    │      │
│  ┌─────────┐ ┌─────────┐ └─────────┘ │browser_ │      │
│  │ vision  │ │  code   │             │ type    │      │
│  │vision_  │ │execute_ │ ┌─────────┐ │...      │      │
│  │analyze  │ │code     │ │ skills  │ └─────────┘      │
│  │image_   │ └─────────┘ │skills_  │                   │
│  │generate │ ┌─────────┐ │list     │ ┌─────────┐      │
│  └─────────┘ │delegation│ │skill_   │ │   mcp   │      │
│              │delegate_ │ │view     │ │mcp_tool │      │
│  ┌─────────┐ │task     │ └─────────┘ └─────────┘      │
│  │ memory  │ └─────────┘                                 │
│  │ memory  │ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │session_ │ │   tts   │ │  cron   │ │homeassis│      │
│  │search   │ │text_to_ │ │cronjob  │ │ha_list_ │      │
│  └─────────┘ │speech   │ └─────────┘ │entities │      │
│              └─────────┘             │ha_call_ │      │
│                                      │service  │      │
│  25+ 工具集，可组合、可嵌套            └─────────┘      │
└──────────────────────────────────────────────────────────┘
```

### 5.3 核心工具清单

| 工具 | 文件 | 功能 |
|------|------|------|
| `terminal` | `tools/terminal_tool.py` | Shell 命令执行，支持 6 种后端 |
| `read_file` / `write_file` / `patch` | `tools/file_tools.py` | 文件读写、搜索、补丁 |
| `web_search` / `web_extract` | `tools/web_tools.py` | 网页搜索与提取 (Exa/Firecrawl/Parallel/Tavily) |
| `browser_navigate` / `browser_click` / ... | `tools/browser_tool.py` | 浏览器自动化 (Browserbase/CDP/本地 Chromium) |
| `vision_analyze` | `tools/vision_tools.py` | 图像分析 (多模态模型) |
| `image_generate` | `tools/image_generation_tool.py` | 图像生成 (fal.ai) |
| `execute_code` | `tools/code_execution_tool.py` | 沙箱 Python 执行 + RPC 工具访问 |
| `delegate_task` | `tools/delegate_tool.py` | 子 Agent 派遣，隔离上下文 |
| `memory` | `tools/memory_tool.py` | 持久化记忆 (MEMORY.md / USER.md) |
| `session_search` | `tools/session_search_tool.py` | FTS5 全文搜索历史会话 |
| `clarify` | `tools/clarify_tool.py` | 结构化多选提问 |
| `text_to_speech` | `tools/tts_tool.py` | TTS (Edge TTS / ElevenLabs) |
| `cronjob` | `tools/cronjob_tools.py` | 定时任务管理 |
| `mcp_tool` | `tools/mcp_tool.py` | MCP 服务器集成 |
| `send_message` | `tools/send_message_tool.py` | 跨平台消息发送 |
| `todo` | `tools/todo_tool.py` | 内存任务列表 |

### 5.4 终端执行后端

`terminal` 工具支持 6 种执行环境：

```
┌────────────────────────────────────────────────────────┐
│              Terminal Execution Backends                │
│                                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐│
│  │Local │ │Docker│ │ SSH  │ │Modal │ │Dayton│ │Sing││
│  │      │ │      │ │      │ │Server│ │  a   │ │ular││
│  │本机   │ │容器   │ │远程   │ │无服务│ │沙箱  │ │ity ││
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └────┘│
│                                                        │
│  配置: config.yaml → terminal → backend                │
└────────────────────────────────────────────────────────┘
```

### 5.5 审批系统 (Approval)

`tools/approval.py` 实现了危险命令检测与审批机制：

```
用户消息 → Agent → 工具调用请求
                      │
                      ▼
              ┌───────────────┐
              │ 危险命令检测    │
              │ (正则匹配)     │
              └───────┬───────┘
                      │
              ┌───────┴───────┐
              │               │
           安全命令        危险命令
              │               │
              ▼               ▼
          直接执行      请求用户审批
                          │
                  ┌───────┴───────┐
                  │               │
               批准             拒绝
                  │               │
                  ▼               ▼
              执行            跳过
```

审批模式：`on`（每次询问）/ `auto`（智能判断）/ `off`（全部放行）

---

## 6. 技能系统

技能 (Skills) 是比工具更高层的抽象，组合多个工具和提示词来完成复杂任务。

### 6.1 技能结构

```
skills/
├── software-development/    # 软件开发
│   └── SKILL.md            # 技能定义文件
├── research/               # 研究
├── devops/                 # 运维
├── data-science/           # 数据科学
├── creative/               # 创意
├── productivity/           # 效率
├── smart-home/             # 智能家居
├── red-teaming/            # 红队测试
├── github/                 # GitHub 集成
├── email/                  # 邮件
├── media/                  # 媒体处理
├── ... (30+ 类别)

optional-skills/            # 可选技能 (默认不激活)
├── blockchain/             # 区块链
├── health/                 # 健康
├── security/               # 安全
├── ... (16 类别)
```

### 6.2 SKILL.md 格式

```yaml
---
name: software-development
description: Full-stack software development capabilities
version: 1.0.0
platforms: [cli, telegram, discord]
required_environment_variables: []
metadata:
  category: development
  complexity: advanced
---

# Software Development Skill

## Instructions
(procedural instructions for the agent)
```

### 6.3 技能生命周期

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  发现     │──▶│  加载     │──▶│  使用     │──▶│  改进     │
│ (搜索/    │    │ (注入到   │    │ (Agent    │    │ (从经验中 │
│  安装)    │    │  上下文)  │    │  执行)    │    │  优化)    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                                               │
     │  Skills Hub (agentskills.io)                   │
     │  ┌─────────────────────────┐                  │
     └──▶│ 社区技能市场             │◀─────────────────┘
         │ 搜索/安装/发布           │   (经验 → 新技能)
         └─────────────────────────┘
```

---

## 7. 插件系统

Hermes 有 **双轨插件系统**：后端插件 + 前端插件。

### 7.1 后端插件

```
plugins/
├── hooks.py              # 插件钩子定义
├── loader.py             # 插件发现与加载
├── memory/               # 记忆提供者插件
│   ├── honcho/           # Honcho AI
│   ├── mem0/             # Mem0
│   ├── supermemory/      # SuperMemory
│   ├── byterover/        # ByteRover
│   ├── hindsight/        # Hindsight
│   ├── holographic/      # Holographic
│   ├── openviking/       # OpenViking
│   └── retaindb/         # RetainDB
├── context_engine/       # 上下文引擎插件
├── image_gen/            # 图像生成插件
│   └── openai/           # OpenAI DALL-E
├── disk-cleanup/         # 磁盘清理
├── spotify/              # Spotify 集成
└── example-dashboard/    # 示例 Dashboard 插件
```

**钩子生命周期**：

```
on_agent_start → on_message → on_tool_call → on_tool_result → on_agent_end
                                                    │
                                              on_error (异常时)
```

每个插件目录包含 `plugin.yaml`，定义名称、版本、订阅的钩子、入口模块。

### 7.2 前端插件 (Web Dashboard)

```
web/src/plugins/
├── types.ts       # PluginManifest, PluginSlot, PluginComponent
├── registry.ts    # PluginRegistry — 组件注册到命名插槽
├── slots.ts       # 可用扩展插槽定义
└── index.ts       # 公共 API
```

**扩展插槽 (Slots)**：

| 插槽名 | 位置 |
|--------|------|
| `CHAT_INPUT_APPEND` | 聊天输入框附加区域 |
| `MESSAGE_ACTIONS` | 消息操作按钮 |
| `SIDEBAR_PANEL` | 侧边栏面板 |
| `SETTINGS_SECTION` | 设置页区块 |
| `TOOL_RESULT_RENDERER` | 工具结果渲染器 |
| `backdrop` | 背景层 |
| `header-left/right` | 头部左右区域 |
| `pre-main/post-main` | 主内容前后 |
| `overlay` | 浮层 |

---

## 8. 记忆系统

### 8.1 架构

```
┌────────────────────────────────────────────────────────────┐
│                     Memory Manager                          │
│                   (agent/memory_manager.py)                 │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────────┐  │
│  │   内置记忆            │  │   外部记忆提供者          │  │
│  │                      │  │   (plugins/memory/)       │  │
│  │  ┌────────────────┐  │  │                          │  │
│  │  │  MEMORY.md     │  │  │  ┌────────┐ ┌────────┐  │  │
│  │  │  (持久化事实)   │  │  │  │Honcho  │ │ Mem0   │  │  │
│  │  └────────────────┘  │  │  └────────┘ └────────┘  │  │
│  │  ┌────────────────┐  │  │  ┌────────┐ ┌────────┐  │  │
│  │  │  USER.md       │  │  │  │SuperMem│ │ByteRov │  │  │
│  │  │  (用户偏好)     │  │  │  └────────┘ └────────┘  │  │
│  │  └────────────────┘  │  │  ...                     │  │
│  └──────────────────────┘  └──────────────────────────┘  │
│                                                            │
│  记忆上下文围栏:                                            │
│  <memory-context>                                          │
│    (系统注: 以下为回忆的记忆上下文，非新用户输入)             │
│    ... 记忆内容 ...                                        │
│  </memory-context>                                         │
└────────────────────────────────────────────────────────────┘
```

### 8.2 记忆提供者接口

```python
class MemoryProvider(ABC):
    async def initialize(self, ...) -> None
    def system_prompt_block(self) -> str | None
    async def prefetch(self, query: str) -> None
    async def sync_turn(self, messages, response) -> None
    def get_tool_schemas(self) -> list
    async def handle_tool_call(self, name, args) -> str
    async def shutdown(self) -> None
```

### 8.3 注入安全

`memory_tool.py` 对注入到 MEMORY.md/USER.md 的内容进行安全扫描：
- 检测 `_CONTEXT_THREAT_PATTERNS`（10 个正则模式，防提示注入）
- 检测 `_CONTEXT_INVISIBLE_CHARS`（Unicode 零宽字符）

---

## 9. 上下文管理

### 9.1 上下文引擎

```
┌──────────────────────────────────────────────────────────┐
│                  Context Engine                           │
│                (agent/context_engine.py)                  │
│                                                          │
│  输入: 完整对话历史 + 系统提示 + 工具定义                  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Token 计数                                      │    │
│  │  if 总 token > 模型上下文窗口 × 阈值:             │    │
│  │      触发压缩                                    │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                                │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Context Compressor                              │    │
│  │  (agent/context_compressor.py)                   │    │
│  │                                                  │    │
│  │  1. 保留最近 N 轮对话                             │    │
│  │  2. 对早期对话进行 LLM 摘要                       │    │
│  │  3. 摘要前缀: "[CONTEXT COMPACTION -- REFERENCE   │    │
│  │     ONLY] Earlier turns were compacted..."       │    │
│  │  4. 用摘要替换早期消息                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  输出: 压缩后的消息列表，适配模型上下文窗口                │
└──────────────────────────────────────────────────────────┘
```

### 9.2 短暂注入 (Ephemeral Injection)

系统提示和预填充文本在 API 调用时注入，**永不持久化**到数据库。这确保了：
- 会话历史保持干净
- 系统提示变更立即生效
- 不同平台可注入不同提示

---

## 10. 会话持久化

### 10.1 SQLite 数据库

`hermes_state.py` — Schema v8，WAL 模式，FTS5 全文搜索

```
┌────────────────────────────────────────────────────────┐
│                 SessionDB (SQLite)                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  sessions 表                                      │ │
│  │  ─ id (PK)                                       │ │
│  │  ─ source (cli/telegram/discord/...)              │ │
│  │  ─ user_id                                       │ │
│  │  ─ model                                         │ │
│  │  ─ model_config                                  │ │
│  │  ─ system_prompt                                 │ │
│  │  ─ parent_session_id                             │ │
│  │  ─ started_at / ended_at                         │ │
│  │  ─ message_count / tool_call_count               │ │
│  │  ─ token counts (input/output/cache)              │ │
│  │  ─ billing fields                                │ │
│  │  ─ title                                         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  messages 表                                      │ │
│  │  ─ id (PK)                                       │ │
│  │  ─ session_id (FK → sessions)                    │ │
│  │  ─ role (user/assistant/tool/system)              │ │
│  │  ─ content                                       │ │
│  │  ─ tool_call_id / tool_calls / tool_name          │ │
│  │  ─ timestamp                                     │ │
│  │  ─ token_count                                   │ │
│  │  ─ finish_reason / reasoning fields               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  messages_fts (FTS5 虚拟表)                       │ │
│  │  ─ 全文搜索 message content                       │ │
│  │  ─ INSERT/DELETE/UPDATE 触发器自动同步             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  state_meta 表                                    │ │
│  │  ─ key / value (键值存储)                         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  并发: WAL 模式 + BEGIN IMMEDIATE + 随机抖动重试        │
└────────────────────────────────────────────────────────┘
```

---

## 11. 消息网关与多平台适配

### 11.1 网关架构

```
┌──────────────────────────────────────────────────────────────────┐
│                     Gateway Runner                                │
│                   (gateway/run.py)                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  BasePlatformAdapter                       │   │
│  │  (gateway/platforms/base.py)                              │   │
│  │                                                          │   │
│  │  connect() / disconnect() / send() / receive()           │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌────────┬────────┬───────┼───────┬────────┬────────┬──────┐  │
│  ▼        ▼        ▼       ▼       ▼        ▼        ▼      ▼  │
│Telegram  Discord  Slack  WhatsApp Signal  Matrix  Matter Email │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐   │
│  │ SMS  │ │HomeAs│ │Ding  │ │Feishu│ │WeCom │ │BlueBubbl │   │
│  │      │ │sist  │ │Talk  │ │      │ │/WeChat│ │(iMessage)│   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘   │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐                                    │
│  │QQ Bot│ │API   │ │Webhook│                                    │
│  └──────┘ └──────┘ └──────┘                                    │
│                                                                  │
│  流式消费: gateway/stream_consumer.py                            │
│  ─ 同步 Agent 回调 → 异步平台投递                                │
│  ─ 支持 Telegram/Discord/Slack 消息编辑式流式输出                 │
│  ─ 限速 + 洪水控制                                               │
└──────────────────────────────────────────────────────────────────┘
```

### 11.2 流式消息投递

```
Agent 生成 delta → stream_consumer.on_delta()
                        │
                        ▼
                  asyncio 队列
                        │
                        ▼
              平台适配器.edit_message()
              (渐进式编辑已发送的消息)
                        │
                  ┌─────┴─────┐
                  │  限速控制   │
                  │  洪水检测   │
                  └───────────┘
```

---

## 12. CLI 与终端 TUI

### 12.1 双进程 TUI 架构

```
┌──────────────────────────────────────────────────────────┐
│                    TUI 架构                               │
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐ │
│  │   Node.js 进程       │    │   Python 进程            │ │
│  │   (Ink / React)      │    │   (tui_gateway/)        │ │
│  │                      │    │                         │ │
│  │  ┌───────────────┐  │    │  ┌───────────────────┐ │ │
│  │  │ TranscriptPane│  │    │  │ Agent Loop        │ │ │
│  │  │ (消息列表)     │  │    │  │ Tool Execution    │ │ │
│  │  ├───────────────┤  │    │  │ Session Mgmt      │ │ │
│  │  │ ComposerPane  │  │    │  │ Slash Commands    │ │ │
│  │  │ (输入框)       │  │    │  │ Model Calls       │ │ │
│  │  ├───────────────┤  │    │  └───────────────────┘ │ │
│  │  │ Status Bar    │  │    │                         │ │
│  │  │ (模型/上下文/  │  │    │                         │ │
│  │  │  费用/时间)    │  │    │                         │ │
│  │  └───────────────┘  │    │                         │ │
│  │                      │    │                         │ │
│  │  自定义 Ink fork:    │    │                         │ │
│  │  @hermes/ink         │    │                         │ │
│  │  (Box/Text/ScrollBox │    │                         │ │
│  │   /Button/...)       │    │                         │ │
│  └──────────┬───────────┘    └───────────┬─────────────┘ │
│             │                            │               │
│             └──── stdio JSON-RPC ────────┘               │
│                  (换行分隔的 JSON-RPC 2.0)                 │
└──────────────────────────────────────────────────────────┘
```

### 12.2 CLI 命令体系

`hermes_cli/` 目录包含约 60 个命令文件，核心命令包括：

| 命令 | 功能 |
|------|------|
| `hermes` | 启动交互式 CLI |
| `hermes --tui` | 启动终端 TUI |
| `hermes gateway` | 启动消息网关 |
| `hermes mcp serve` | 启动 MCP 服务器 |
| `hermes logs` | 查看日志 |
| `hermes config` | 管理配置 |
| `hermes skills` | 管理技能 |

### 12.3 皮肤引擎 (Skin Engine)

`hermes_cli/skin_engine.py` — 数据驱动的 CLI 主题系统：
- 品牌名称、图标、提示符号
- 欢迎词/告别词
- 颜色方案 (30+ 命名颜色)
- 亮/暗模式自动检测

---

## 13. Web Dashboard

### 13.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7 | 构建工具 |
| Tailwind CSS | 4.2 | 样式系统 |
| shadcn/ui | 自定义实现 | UI 组件库 |
| xterm.js | 6 | 内嵌终端 |
| lucide-react | 0.577 | 图标库 |

### 13.2 页面结构

```
┌──────────────────────────────────────────────────────────────┐
│  App.tsx                                                      │
│  ┌────────────┐ ┌──────────────────────────────────────────┐ │
│  │  Sidebar   │ │  Main Content                            │ │
│  │  (w-64)    │ │                                          │ │
│  │            │ │  ┌────────────────────────────────────┐  │ │
│  │ ┌────────┐ │ │  │  Pages (React Router)              │  │ │
│  │ │Brand   │ │ │  │                                    │  │ │
│  │ │Hermes  │ │ │  │  / → SessionsPage                  │  │ │
│  │ └────────┘ │ │  │  /chat → ChatPage (xterm + sidebar) │  │ │
│  │ ┌────────┐ │ │  │  /analytics → AnalyticsPage         │  │ │
│  │ │Nav     │ │ │  │  /config → ConfigPage               │  │ │
│  │ │Sessions│ │ │  │  /cron → CronPage                   │  │ │
│  │ │Chat    │ │ │  │  /logs → LogsPage                   │  │ │
│  │ │Analytic│ │ │  │  /skills → SkillsPage               │  │ │
│  │ │Config  │ │ │  │  /env → EnvPage                     │  │ │
│  │ │Cron    │ │ │  │  /docs → DocsPage                   │  │ │
│  │ │Logs    │ │ │  └────────────────────────────────────┘  │ │
│  │ │Skills  │ │ │                                          │ │
│  │ │Keys    │ │ │  ┌────────────────────────────────────┐  │ │
│  │ │Docs    │ │ │  │  Backdrop (视觉层)                  │  │ │
│  │ └────────┘ │ │  │  基色 + 填充图 + 暖光晕 + 噪点纹理  │  │ │
│  │ ┌────────┐ │ │  └────────────────────────────────────┘  │ │
│  │ │Actions │ │ │                                          │ │
│  │ │Restart │ │ │                                          │ │
│  │ │Update  │ │ │                                          │ │
│  │ └────────┘ │ │                                          │ │
│  │ ┌────────┐ │ │                                          │ │
│  │ │Theme ◉ │ │ │                                          │ │
│  │ │Lang EN │ │ │                                          │ │
│  │ └────────┘ │ │                                          │ │
│  └────────────┘ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 13.3 主题系统

6 个内置主题，每个主题有 6 个正交层：

```
DashboardTheme
├── palette        # 3 层颜色 (背景/中景/前景) + 暖光 + 噪点
├── typography     # 字体族、大小、行高、字间距
├── layout         # 圆角 + 密度倍数
├── layoutVariant  # "standard" | "cockpit" | "tiled"
├── assets         # 背景图、Logo、侧边栏图等
├── componentStyles# 卡片/头部/侧边栏等组件样式覆盖
├── colorOverrides # shadcn token 覆盖
└── customCSS      # 原始 CSS 注入

内置主题:
1. Hermes Teal  — 深青 + 奶油色 (默认)
2. Midnight     — 深蓝紫 + 冷色调
3. Ember        — 暖红铜 + 衬线体
4. Mono         — 灰度 + 紧凑密度
5. Cyberpunk    — 霓虹绿 + 矩阵风格
6. Rosy         — 柔粉 + 暖象牙
```

### 13.4 前后端通信

```
┌──────────────────────────────────────────────────────────────┐
│                  通信方式                                      │
│                                                              │
│  1. REST API (fetch)                                         │
│     web/src/lib/api.ts → /api/*                              │
│     ─ 会话/配置/环境变量/Cron/技能/OAuth/插件/主题             │
│     ─ X-Hermes-Session-Token 认证                            │
│                                                              │
│  2. WebSocket JSON-RPC                                       │
│     web/src/lib/gatewayClient.ts → /api/ws?token=...         │
│     ─ 实时事件: message.delta, tool.start/progress/complete   │
│     ─ thinking.delta, reasoning.delta, clarify.request        │
│     ─ 120s 默认超时                                          │
│                                                              │
│  3. WebSocket PTY 流                                         │
│     ChatPage → /api/pty?token=...&channel=...                │
│     ─ 双向二进制 WebSocket (原始 PTY 字节)                     │
│     ─ 键盘/鼠标事件上行，VT100 输出帧下行                     │
│                                                              │
│  4. WebSocket 事件订阅                                       │
│     ChatSidebar → /api/events?token=...&channel=...          │
│     ─ 接收 PTY 子进程的工具调用事件                            │
│                                                              │
│  5. 轮询                                                     │
│     SessionsPage → setInterval(loadOverview, 5000)           │
└──────────────────────────────────────────────────────────────┘
```

### 13.5 国际化 (i18n)

- 自研轻量 i18n 系统（非 i18next）
- 支持语言：英文 (en) / 简体中文 (zh)
- 150+ 翻译键，静态类型化
- `web/src/i18n/` 目录

---

## 14. MCP 与 ACP 协议

### 14.1 MCP (Model Context Protocol)

```
┌──────────────────────────────────────────────────────────┐
│                    MCP 集成                               │
│                                                          │
│  MCP 客户端 (tools/mcp_tool.py)                          │
│  ─ 连接外部 MCP 服务器 (stdio / HTTP)                     │
│  ─ 发现工具并注册到 Hermes 工具注册表                      │
│  ─ 环境变量过滤、凭证剥离、超时控制                        │
│  ─ 自动重连 (指数退避)                                    │
│  ─ 支持 sampling/createMessage                           │
│                                                          │
│  MCP 服务器 (mcp_serve.py)                               │
│  ─ FastMCP (stdio) 暴露消息对话为 MCP 工具               │
│  ─ 10 个工具:                                            │
│    conversations_list, conversation_get,                  │
│    messages_read, attachments_fetch,                      │
│    events_poll, events_wait, messages_send,               │
│    permissions_list_open, permissions_respond,            │
│    channels_list                                         │
│  ─ 用法: hermes mcp serve                                │
└──────────────────────────────────────────────────────────┘
```

### 14.2 ACP (Agent Client Protocol)

```
┌──────────────────────────────────────────────────────────┐
│                    ACP 集成                               │
│                                                          │
│  ACP 服务器 (acp_adapter/server.py)                      │
│  ─ HermesACPAgent 实现 acp.Agent 接口                    │
│  ─ 支持 VS Code / Zed / JetBrains 集成                   │
│  ─ Slash 命令: help, model, tools, context,              │
│    reset, compact, version                               │
│                                                          │
│  ACP 注册表 (acp_registry/)                              │
│  ─ agent.json 服务发现                                   │
│                                                          │
│  ACP 工具映射 (acp_adapter/tools.py)                     │
│  ─ hermes 工具名 → ACP ToolKind:                         │
│    read, edit, search, execute, fetch, think, other      │
│                                                          │
│  ACP 权限桥接 (acp_adapter/permissions.py)               │
│  ─ ACP 审批请求 → hermes 审批回调                        │
│  ─ allow_once/always, reject_once/always                 │
└──────────────────────────────────────────────────────────┘
```

---

## 15. 定时任务系统

```
┌──────────────────────────────────────────────────────────┐
│                  Cron 系统                                │
│                                                          │
│  调度器 (cron/scheduler.py)                              │
│  ─ 60 秒 tick 间隔                                       │
│  ─ 文件锁防并发                                          │
│  ─ 每个任务独立工具集解析                                 │
│                                                          │
│  任务存储 (cron/jobs.py)                                 │
│  ─ JSON 文件: ~/.hermes/cron/jobs.json                   │
│  ─ 输出: ~/.hermes/cron/output/{job_id}/{timestamp}.md   │
│                                                          │
│  管理工具 (tools/cronjob_tools.py)                       │
│  ─ 创建/暂停/恢复/触发/删除定时任务                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Cron Job 结构                                   │    │
│  │  ─ name: 任务名称                                │    │
│  │  ─ prompt: 执行提示词                            │    │
│  │  ─ schedule: cron 表达式                         │    │
│  │  ─ deliver_to: 投递平台                          │    │
│  │  ─ toolset: 使用的工具集                         │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## 16. 安全模型

### 16.1 信任模型

**单租户信任模型** — 保护操作者免受 LLM 行为侵害，而非防止共租者。

### 16.2 安全层级

```
┌──────────────────────────────────────────────────────────┐
│                   安全防护体系                             │
│                                                          │
│  第 1 层: 危险命令审批                                    │
│  ─ tools/approval.py: 正则匹配检测危险命令                │
│  ─ 可配置: on(每次询问) / auto(智能) / off(放行)          │
│                                                          │
│  第 2 层: 输出脱敏                                       │
│  ─ agent/redact.py: 从显示输出中剥离 API 密钥/令牌        │
│                                                          │
│  第 3 层: 沙箱执行                                       │
│  ─ 代码执行环境剥离 API 密钥                              │
│  ─ 子进程环境变量过滤                                     │
│                                                          │
│  第 4 层: MCP 安全                                       │
│  ─ npx/uvx 包 OSV 恶意软件检查                           │
│  ─ 过滤的环境变量                                        │
│                                                          │
│  第 5 层: 子 Agent 限制                                  │
│  ─ 最大深度 2，禁止递归派遣                               │
│  ─ 记忆隔离                                             │
│                                                          │
│  第 6 层: 技能信任等级                                   │
│  ─ 已安装技能 = 高信任 (本地代码)                         │
│  ─ MCP 服务器 = 较低信任 (过滤环境)                       │
│                                                          │
│  第 7 层: SSRF 防护                                      │
│  ─ 所有网关适配器默认启用                                 │
│                                                          │
│  第 8 层: 凭证安全                                       │
│  ─ API 密钥仅存于 ~/.hermes/.env                         │
│  ─ 永不存入 config.yaml                                  │
│                                                          │
│  第 9 层: 供应链审计                                     │
│  ─ CI 扫描 .pth 文件、base64+exec、编码子进程调用         │
│  ─ GitHub Actions 固定到完整 commit SHA                  │
│                                                          │
│  第 10 层: 上下文注入防护                                │
│  ─ 10 个正则模式检测提示注入                              │
│  ─ Unicode 零宽字符检测                                  │
│  ─ 记忆上下文围栏 (<memory-context>)                     │
└──────────────────────────────────────────────────────────┘
```

---

## 17. 配置系统

### 17.1 配置文件

```
~/.hermes/
├── config.yaml          # 主配置 (模型/工具/终端/压缩/显示...)
├── .env                 # API 密钥 (仅此文件存密钥)
├── auth.json            # OAuth 凭证状态
├── cron/
│   └── jobs.json        # 定时任务
├── logs/
│   ├── agent.log        # INFO+ 日志
│   ├── errors.log       # WARNING+ 日志
│   └── gateway.log      # 网关日志
├── dashboard-themes/    # 自定义 Dashboard 主题 (YAML)
└── MEMORY.md            # 持久化记忆
```

### 17.2 多 Profile 支持

通过 `HERMES_HOME` 环境变量支持多个隔离实例：

```bash
# 默认 Profile
export HERMES_HOME=~/.hermes

# 工作 Profile
export HERMES_HOME=~/.hermes-work

# 个人 Profile
export HERMES_HOME=~/.hermes-personal
```

### 17.3 配置加载链

```
1. ~/.hermes/.env          # 环境变量 (API 密钥)
2. ~/.hermes/config.yaml   # 主配置
3. 命令行参数               # 覆盖配置
4. 环境变量覆盖             # HERMES_* 前缀
```

---

## 18. RL 训练环境

```
┌──────────────────────────────────────────────────────────┐
│                  RL 训练系统                              │
│                                                          │
│  environments/                                           │
│  ├── agent_loop.py        # 可复用多轮 Agent 引擎         │
│  ├── hermes_base_env.py   # Atropos RL 基础环境          │
│  │   ─ Phase 1: OpenAI Server                            │
│  │   ─ Phase 2: VLLM ManagedServer                      │
│  ├── agentic_opd_env.py   # On-Policy Distillation 环境  │
│  │   ─ LLM Judge 提供逐 token 训练信号                   │
│  └── tinker-atropos/      # Atropos 后端 (git submodule) │
│                                                          │
│  辅助模块:                                               │
│  ├── batch_runner.py      # 并行批量轨迹生成              │
│  ├── trajectory_compressor.py # 轨迹压缩                  │
│  └── rl_cli.py            # RL 训练 CLI                  │
└──────────────────────────────────────────────────────────┘
```

---

## 19. 构建与部署

### 19.1 Docker

```dockerfile
# 多阶段构建
# 基础: Debian Trixie
# 工具: uv + gosu + tini
# 支持: amd64 + arm64
```

```bash
# Docker Compose
docker-compose up  # 启动 Gateway + Dashboard
```

### 19.2 Nix

完整的 Nix flake 支持：
- `x86_64-linux`
- `aarch64-linux`
- `aarch64-darwin`

### 19.3 安装方式

```bash
# 快速安装
./setup-hermes.sh

# 手动安装
uv venv && source .venv/bin/activate
pip install -e ".[all,dev]"

# Android/Termux
pip install -e ".[termux]"
```

---

## 20. 测试体系

```
┌──────────────────────────────────────────────────────────┐
│                  测试体系                                 │
│                                                          │
│  框架: pytest + xdist (4 workers)                        │
│  规模: ~15,000 测试 / ~700 文件                          │
│                                                          │
│  运行:                                                   │
│  scripts/run_tests.sh                                    │
│  ─ 强制 CI 一致性:                                       │
│    unset credentials                                     │
│    TZ=UTC                                                │
│    LANG=C.UTF-8                                          │
│    4 xdist workers                                       │
│                                                          │
│  CI 工作流:                                              │
│  ─ tests.yml: 单元测试 + e2e 测试                        │
│  ─ docker-publish.yml: 多架构 Docker 构建                │
│  ─ supply-chain-audit.yml: 供应链安全扫描                │
│  ─ nix.yml: Nix flake 检查 + 构建                       │
│  ─ skills-index.yml: 技能索引构建 (每日 2 次)            │
│  ─ docs-site-checks.yml: 文档验证                        │
│  ─ contributor-check.yml: 贡献者归属验证                 │
└──────────────────────────────────────────────────────────┘
```

---

## 21. 目录结构速查

```
hermes-agent/
├── run_agent.py              # ★ AIAgent 核心类 (~13K LOC)
├── cli.py                    # ★ HermesCLI 交互式编排器 (~11K LOC)
├── hermes_state.py           # ★ SQLite 会话存储 (FTS5)
├── model_tools.py            # ★ 工具编排层
├── toolsets.py               # ★ 工具集定义
├── mcp_serve.py              # MCP 服务器
├── batch_runner.py           # 批量轨迹生成
├── trajectory_compressor.py  # 轨迹压缩
├── hermes_constants.py       # 常量与路径
├── hermes_logging.py         # 日志配置
├── hermes_time.py            # 时间工具
├── utils.py                  # 通用工具
├── mini_swe_runner.py        # Mini SWE-bench 运行器
├── rl_cli.py                 # RL 训练 CLI
├── toolset_distributions.py  # 工具集分布定义
│
├── agent/                    # Agent 内部模块
│   ├── prompt_builder.py     # ★ 系统提示构建
│   ├── context_compressor.py # ★ 上下文压缩
│   ├── context_engine.py     # 上下文引擎
│   ├── memory_manager.py     # 记忆管理器
│   ├── memory_provider.py    # 记忆提供者 ABC
│   ├── anthropic_adapter.py  # Anthropic 适配器
│   ├── bedrock_adapter.py    # Bedrock 适配器
│   ├── gemini_native_adapter.py  # Gemini 适配器
│   ├── codex_responses_adapter.py # Codex 适配器
│   ├── copilot_acp_client.py # Copilot ACP 客户端
│   ├── credential_pool.py    # 凭证池
│   ├── auxiliary_client.py   # 辅助 LLM 客户端
│   ├── error_classifier.py   # 错误分类
│   ├── title_generator.py    # 标题生成
│   └── transports/           # 传输层
│       ├── base.py           # BaseTransport
│       ├── chat_completions.py # OpenAI Chat
│       ├── anthropic.py      # Anthropic
│       ├── bedrock.py        # Bedrock
│       └── codex.py          # Codex
│
├── tools/                    # ★ 工具实现 (60+ 文件)
│   ├── registry.py           # ★ 工具注册中心
│   ├── approval.py           # 危险命令审批
│   ├── terminal_tool.py      # 终端执行
│   ├── file_tools.py         # 文件操作
│   ├── web_tools.py          # 网页搜索/提取
│   ├── browser_tool.py       # 浏览器自动化
│   ├── vision_tools.py       # 图像分析
│   ├── image_generation_tool.py # 图像生成
│   ├── code_execution_tool.py # 代码执行
│   ├── delegate_tool.py      # 子 Agent 派遣
│   ├── memory_tool.py        # 记忆操作
│   ├── session_search_tool.py # 会话搜索
│   ├── clarify_tool.py       # 结构化提问
│   ├── mcp_tool.py           # MCP 客户端
│   ├── tts_tool.py           # 语音合成
│   ├── cronjob_tools.py      # 定时任务
│   ├── send_message_tool.py  # 消息发送
│   ├── homeassistant_tool.py # 智能家居
│   ├── mixture_of_agents_tool.py # MoA
│   ├── path_security.py      # 路径安全
│   ├── url_safety.py         # URL 安全
│   └── environments/         # 执行后端
│       ├── local/
│       ├── docker/
│       ├── ssh/
│       ├── modal/
│       ├── daytona/
│       └── singularity/
│
├── skills/                   # ★ 内置技能 (30+ 类别)
├── optional-skills/          # 可选技能 (16 类别)
│
├── plugins/                  # ★ 插件系统
│   ├── memory/               # 记忆提供者 (8+)
│   ├── context_engine/       # 上下文引擎
│   ├── image_gen/            # 图像生成
│   ├── disk-cleanup/         # 磁盘清理
│   └── spotify/              # Spotify
│
├── gateway/                  # ★ 消息网关
│   ├── run.py                # GatewayRunner
│   ├── session.py            # 会话管理
│   ├── stream_consumer.py    # 流式消费
│   └── platforms/            # 平台适配器 (20+)
│       ├── base.py
│       ├── telegram.py
│       ├── discord.py
│       ├── slack.py
│       ├── whatsapp.py
│       ├── signal.py
│       ├── matrix.py
│       └── ...
│
├── hermes_cli/               # ★ CLI 命令 (~60 文件)
│   ├── main.py               # 入口
│   ├── commands.py            # 命令注册
│   ├── config.py             # 配置加载
│   ├── auth.py               # 认证
│   ├── providers.py          # 提供者注册表
│   ├── skin_engine.py        # 皮肤引擎
│   ├── web_server.py         # Dashboard 服务器
│   └── ...
│
├── tui_gateway/              # TUI JSON-RPC 后端
├── acp_adapter/              # ACP 适配器
├── acp_registry/             # ACP 注册表
├── cron/                     # 定时任务
├── environments/             # RL 训练环境
│
├── web/                      # ★ Web Dashboard (React 19)
│   └── src/
│       ├── App.tsx           # 根组件
│       ├── router.tsx        # 路由
│       ├── pages/            # 页面 (9 个)
│       ├── components/       # 组件
│       │   └── ui/           # shadcn 组件
│       ├── contexts/         # React Context
│       ├── stores/           # Zustand Store
│       ├── plugins/          # 前端插件系统
│       ├── lib/              # API 客户端
│       ├── themes/           # 主题系统
│       ├── i18n/             # 国际化
│       └── types/            # 类型定义
│
├── ui-tui/                   # ★ 终端 TUI (Ink/React)
│   └── src/
│       ├── components/       # TUI 组件
│       ├── packages/hermes-ink/ # 自定义 Ink fork
│       └── theme.ts          # TUI 主题
│
├── website/                  # 文档站 (Docusaurus)
├── docker/                   # Docker 配置
├── nix/                      # Nix 打包
├── scripts/                  # 脚本工具
├── tests/                    # 测试 (~15K / ~700 文件)
│
├── pyproject.toml            # Python 包定义
├── Dockerfile                # Docker 构建
├── docker-compose.yml        # Docker Compose
├── AGENTS.md                 # AI 开发指南
├── CONTRIBUTING.md           # 贡献指南
├── SECURITY.md               # 安全策略
└── .env.example              # 环境变量模板
```

---

## 22. 关键文件索引

| 文件 | 行数 | 说明 |
|------|------|------|
| `run_agent.py` | ~13K | AIAgent 核心类，对话循环 |
| `cli.py` | ~11K | HermesCLI 交互式编排器 |
| `hermes_state.py` | ~1.7K | SQLite 会话存储 |
| `model_tools.py` | — | 工具编排，发现与调度 |
| `toolsets.py` | — | 25+ 工具集定义 |
| `agent/prompt_builder.py` | — | 系统提示构建 |
| `agent/context_compressor.py` | — | 上下文压缩 |
| `agent/memory_manager.py` | — | 记忆管理 |
| `agent/anthropic_adapter.py` | — | Anthropic 原生 API |
| `agent/bedrock_adapter.py` | — | AWS Bedrock |
| `agent/credential_pool.py` | — | 多凭证轮转 |
| `tools/registry.py` | — | 工具注册中心 |
| `tools/approval.py` | — | 危险命令审批 |
| `gateway/run.py` | — | 网关运行器 |
| `hermes_cli/main.py` | — | CLI 入口 |
| `hermes_cli/providers.py` | — | 109+ 提供者注册表 |
| `hermes_cli/skin_engine.py` | — | CLI 主题引擎 |
| `web/src/App.tsx` | — | Dashboard 根组件 |
| `web/src/lib/api.ts` | — | REST API 客户端 |
| `web/src/lib/gatewayClient.ts` | — | WebSocket 客户端 |
| `web/src/themes/presets.ts` | — | 6 个内置主题 |
| `ui-tui/src/components/appLayout.tsx` | — | TUI 布局 |
| `mcp_serve.py` | — | MCP 服务器 |
| `acp_adapter/server.py` | — | ACP 服务器 |
| `AGENTS.md` | 765 | AI 开发指南 |
| `CONTRIBUTING.md` | 661 | 贡献指南 |
| `SECURITY.md` | — | 安全策略 |
| `.env.example` | ~400 | 环境变量完整参考 |
| `cli-config.yaml.example` | ~50K | 配置完整示例 |

---

> **报告生成时间**: 2026-04-25
> **基于版本**: v0.11.0
> **项目地址**: https://github.com/NousResearch/hermes-agent
