# TransBioSci 第一版架构与设计基线

状态：用户已接受最后一轮方案（2026-11-08 补充四方向、组织 ID、URL 层级与顶部栏布局）；网站骨架与留言接入已在本地完成，尚未部署。

## 目标与范围

交付部署于 GitHub Pages 的中英双语网站，包括首页四个入口：Trans 生理知识库、Human Dimorphism Knowledge Base、Guestbook、Contact，以及页脚链接的来源与版权页。以网站功能完成为验收条件，文章写作不属于当前工作。组织详情第一版只提供预留容器。

第一版不加入搜索、文献注册表、翻译修订追踪、知识图谱、块编辑器或 3D 系统。旧阶段规划中的这些内容不构成本轮交付要求。

## 前端与存储

- Astro + TypeScript，静态生成；自有 CSS，浏览器交互采用原生 TypeScript。
- 公共组件：页面框架、顶部栏、面包屑、语言与方向选择器、入口卡片、组织卡片、文档目录、正文容器、留言表单与列表。
- Git 中保存 YAML 节点信息与 Markdown 双语正文。节点字段为 `id`、`projections`、`relations.direction`、`relations.tissue`；跨语言 ID 不变、不复用。
- 界面 `zh` 对应内容投影 `zh-CN`，英文使用 `en`。
- 独立导航配置保存目录层级、排序和各方向 Intro，通过 ID 引用节点，不把展示目录塞入方向或组织关系。
- 组织注册信息保存稳定 ID、双语名称及图形引用。
- 知识内容在构建时读取，不存入 D1。D1 仅用于留言系统动态数据及必要发布限制状态。

## 导航与浏览状态

首页提供全站 zh/en 切换；两个知识库和 Contact 提供同一全站语言切换。Guestbook 和来源与版权页不提供切换控件，沿用全站语言。留言始终展示所有语言原文。

每页提供面包屑，存在页面的祖先可点击，末项是当前页。语言、方向、文章或组织身份可从 URL 恢复；明确链接的语言优先于保存的偏好。默认简体中文，首次进入知识库默认 FtM。

URL 层级（均位于项目子路径下）：语言为第一段，知识库、方向、节点或组织依次向下；栏目只出现在面包屑中，不进入 URL，方向由选择器显示而不进入面包屑。

```text
/                               按保存的语言跳转，默认 zh
/{lang}/                        首页
/{lang}/trans/                  按保存的方向跳转，首次 ftm
/{lang}/trans/{dir}/            该方向 Intro
/{lang}/trans/{dir}/{nodeId}/   文章
/{lang}/dimorphism/             按保存的方向跳转，首次 ftm
/{lang}/dimorphism/{dir}/       组织卡片
/{lang}/dimorphism/{dir}/{tissueId}/  组织详情
/{lang}/guestbook/  /{lang}/contact/  /{lang}/sources/
```

`lang` 为 `zh`/`en`，`dir` 为 `ftm`/`mtf`/`ntf`/`ntm`。每个节点必须同时具有 `zh-CN` 与 `en` 投影，构建时校验，缺失即构建失败。

Trans 知识库提供 FtM/MtF/NtF/NtM 四个同级方向（不做额外区分）、树状目录和文章正文，默认 Intro。切换语言保持节点；切换方向时，节点适用于目标方向则保留，否则进入目标 Intro，不增加跨文章方向映射。

Human Dimorphism 知识库提供 FtM/MtF/NtF/NtM，组织 ID 依次为 `tissue-skin`（皮肤）、`tissue-bone`（骨骼）、`tissue-muscle`（肌肉）、`tissue-nerve`（神经）、`tissue-vascular`（血管）、`tissue-gonads`（性腺）、`tissue-external-genitalia`（外生殖器）、`tissue-internal-genitalia`（内生殖器）、`tissue-breast`（乳腺）、`tissue-larynx`（喉结）、`tissue-whole-body`（全身）。方向与语言切换保留组织，无内容时显示空状态。

顶部栏按线框图布局：左侧为 Logo 或返回入口，中间为页面或分支名称，右侧为方向选择器与语言切换器。桌面首页两列卡片，组织列表采用网格；窄屏减少列数，文档目录折叠为可展开面板。Logo、插图、简介、联系方式与二维码在补齐前使用明确标注的占位。

## 视觉设计

采用白色卡片、偏白背景、冷灰文字与深青绿强调色。保持细边框、充足留白和统一解剖剪影；强调色用于链接、主按钮、选中和焦点状态。

参考 [Radix Colors 配色方法](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)：区分中性色、强调色和语义色。以下为项目自选色值，不引入 Radix 组件库，也不将其宣称为完整 Radix 色阶。

| 用途 | 色值 |
| --- | --- |
| 页面背景 | `#F8FAFC` |
| 卡片与阅读表面 | `#FFFFFF` |
| 标题与正文 | `#1C2024` |
| 次要文字 | `#60646C` |
| 装饰分隔线 | `#D9D9DE` |
| 表单控件边界 | `#80838D` |
| 主色、链接、焦点 | `#0F766E` |
| 主按钮悬停 | `#115E59` |
| 选中浅底 | `#F0FDFA` |
| 错误文字 | `#B91C1C` |

主按钮使用白字。链接保留可识别样式，选中、错误和投票状态同时提供文字或形状提示。实际页面完成后检查对比度、键盘焦点及移动端可读性。

## 留言板

GitHub Pages 前端调用 Cloudflare Workers API；D1 保存留言与投票，Turnstile 只验证发布留言。严格 0 元，不启用付费升级，接受免费额度耗尽时不可用。

无需登录、昵称可选（空白为 Anon）、正文必填、验证成功后即时公开。按时间倒序分页。纯文本渲染、参数化 SQL；不支持回复、访客编辑或删除。删除请求经 Contact，由管理员通过 Cloudflare Dashboard 操作。

匿名 UUID 存在 localStorage，服务端用 HMAC-SHA256 派生哈希；投票哈希包含留言 ID。每个浏览器身份对每条留言持有一张有效选票，可切换或撤回。不使用 IP 或指纹识别；每人一票是访客倡议，不声称真人去重。

主表：`messages(id, nickname, body, created_at)`，`votes(message_id, visitor_hash, vote)`；后者组合主键，票值为 ±1，撤回删除记录，删除留言级联删除选票。赞踩计数由投票表聚合。

接口：`GET /api/messages`、`GET /api/votes/me`、`POST /api/messages`、`PUT /api/messages/:id/vote`。PUT 设置目标值 1/-1/0，保持幂等。

| 参数 | 第一版初值 |
| --- | --- |
| 昵称长度 | 最多 40 个 Unicode 码点 |
| 正文长度 | 最多 2,000 个 Unicode 码点 |
| 每页数量 | 20 条 |
| 成功发布后浏览器冷却 | 60 秒 |
| 正文去重 | 10 分钟，去掉首尾空白后比较 |
| 全站发布配额 | 固定 10 分钟窗口最多成功发布 30 条 |
| 恢复 | 下一窗口恢复，提示剩余等待时间 |
| 紧急只读 | 暂停留言及投票写入，保留读取 |
| 备份约定 | 每月手动导出，批量删除前额外导出 |

这些是已接受的初始配置，不是基于真实流量测出的容量保证。冷却、去重与配额的辅助状态结构在实现时补齐；配额检查与成功写入必须保持原子一致。未通过 Turnstile 的请求不消耗成功提交配额。紧急开关不依赖 D1 可用性。密钥不得进入浏览器或版本控制。

实现（`worker/`，2026-11-08）：

- 辅助表 `post_cooldowns(visitor_hash, last_post_at)` 只保存每个匿名身份最近一次成功发布时间，哈希为 HMAC-SHA256(secret, `post:<uuid>`)，与投票哈希（`vote:<message_id>:<uuid>`）互不关联；过期行在每次发布时清理。时间以 UTC ISO 8601 字符串保存。
- 发布在一个 D1 批处理事务内完成：一条带条件的 `INSERT … SELECT` 同时检查冷却、10 分钟正文去重和当前固定窗口的成功条数（按 `messages.created_at` 计数），通过才写入；冷却记录仅在该插入生效时更新。拒绝后再读取状态以区分 `cooldown`、`duplicate`、`site_busy`，并返回 `retryAfter` 秒数。管理员删除留言会相应释放该窗口配额。
- Turnstile 在任何写入前经 Siteverify 验证，不发送 IP；配置期望主机名后同时校验 hostname 与 action `guestbook-post`。紧急只读由 Worker 变量 `GUESTBOOK_READ_ONLY` 控制，在访问 D1 前返回 503；`GET /api/messages` 返回 `readOnly` 供前端禁用表单与投票。
- 匿名 UUID 通过请求头 `X-Visitor-Id` 发送，不进入 URL。列表按 ID 倒序做游标分页（`?before=<id>`）。`GET /api/votes/me?ids=` 每次最多 20 个 ID。
- 前端在构建时读取公开变量 `PUBLIC_GUESTBOOK_API_URL` 与 `PUBLIC_TURNSTILE_SITE_KEY`；任一缺失时 Guestbook 构建为禁用外壳。Worker 密钥为 `VISITOR_HASH_SECRET`、`TURNSTILE_SECRET_KEY`，本地放 `worker/.dev.vars`，线上用 `wrangler secret put`。投票写入不设额外频率限制（不使用 IP），依赖 Workers/D1 免费额度。

## 工作流与发布

本地 agent 约定和工作板放在项目根 AGENTS.md 与 docs/agent-work/，均被 Git 忽略。源参考资料放在 notes/reference/，同样只在本地使用。公开架构以本文件为准。

按网站骨架、留言接入、发布验收推进，各工作块记录范围、证据、完成条件与下一步。下一工作块交付全部页面、双语与方向切换、移动布局，用明确标注的占位内容验证流程。

GitHub Actions 仅上传 Astro 生成的 dist/。必须处理项目站点子路径；实际 Pages 地址在配置时核实。禁止发布 AGENTS、工作板、notes、草稿、临时文件与密钥。Git 忽略规则不代替构建产物检查。

公开发布前补齐简介、个人说明、联系邮箱、二维码、Logo/插图及来源授权记录，并配置 Cloudflare 资源和 Secrets。
