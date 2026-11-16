# TransBioSci

TransBioSci 是一个关于跨性别生理、解剖与医疗技术的中英双语知识库。项目从跨男性（FtM）生理与健康主题起步，连接实用指南、科学证据和社区经验，并标明各自的来源。

TransBioSci is a bilingual Chinese and English knowledge base on transgender physiology, anatomy, and medical technologies. It starts with transmasculine (FtM) physiology and health, bringing together practical guides, scientific evidence, and community experience with clear sourcing.

## 项目范围 / Project scope

第一版规划包括 Trans 生理知识库、人体性别差异知识库、公开留言板和联系页面。首批文章聚焦基础解剖、Bottom Growth、Pump 原理与器械，以及相关风险。中英文版本共享同一内容节点，方便读者在同一主题下切换语言。

The first release is planned to include a transgender physiology knowledge base, a human sexual dimorphism knowledge base, a public feedback board, and a contact page. The first articles cover basic anatomy, bottom growth, pumping principles and equipment, and related risks. Each article shares a content ID across both languages so readers can switch languages on the same topic.

## 许可 / License

本仓库采用 MIT License。MIT 许可仅适用于网站源代码。文章、图片和第三方材料按各自标明的授权条件使用。网站首页将链接至统一的「来源与版权」页面，列出作者、来源、授权和转载条件。

This repository uses the MIT License for the website source code only. Articles, images, and third-party materials are subject to their own stated terms. The homepage will link to a Sources & Copyright page listing authors, sources, licenses or permissions, and republication terms.

## 本地开发 / Local development

使用 Node.js 24 和 npm。在本仓库根目录运行以下命令。如果使用 nvm，首次运行 `nvm install` 安装 `.nvmrc` 指定的 Node 版本。

```sh
nvm use
npm ci
npm run dev
```

打开终端显示的本地地址，路径为 `/TransBioSci/`。`npm run check` 检查类型，`npm run build` 生成 `dist/`，`npm run preview` 预览构建结果。

## 内容结构 / Content layout

知识内容保存在 `content/`，构建时读取并校验。

- `content/nodes/<id>/node.yaml`：内容节点（`id`、`projections`、`relations.direction`、`relations.tissue`），同目录下的 `zh-CN.md` 与 `en.md` 为两种语言正文。每个节点必须同时具有两种语言版本。
- `content/navigation/trans.yaml`：Trans 生理知识库的目录层级、排序和各方向 Intro。
- `content/tissues.yaml`：组织注册信息（稳定 ID、双语名称、图形引用）。

ID 缺失、引用无效或缺少语言版本时，`npm run build` 会失败并列出问题。当前内容均为明确标注的占位内容。

## 留言板本地开发 / Guestbook local development

留言 API 位于 `worker/`（Cloudflare Workers + D1 + Turnstile），是独立的 npm 包。以下命令只使用本地 D1 和 Cloudflare 公布的 Turnstile 测试密钥，不访问线上资源。

```sh
cd worker
npm ci
cp .dev.vars.example .dev.vars        # 将 VISITOR_HASH_SECRET 改为随机值
npm run db:migrate:local
npm run dev                           # http://localhost:8787
npm test                              # Worker 测试（含并发配额）
```

在仓库根目录复制 `.env.example` 为 `.env`，再运行 `npm run dev` 或 `npm run build && npm run preview`。`.env` 中的地址只用于本地；未设置这两个公开变量时，Guestbook 构建为禁用外壳。

## GitHub Pages 发布

在目标仓库的 Settings → Pages 将发布来源设为 GitHub Actions。提交发布工作流后，在 Actions 中手动运行 **Publish to GitHub Pages**。工作流从 `main` 发布，并仅上传 `dist/`。

启用线上留言板前，先在 Cloudflare 免费方案中配置 Worker、D1 与 Turnstile。把生产 D1 ID、Pages 来源和 Turnstile 预期主机名填入 Worker 配置，应用远程 D1 迁移后部署 Worker。使用 Cloudflare Secrets 保存 `TURNSTILE_SECRET_KEY` 和 `VISITOR_HASH_SECRET`。

在 GitHub 仓库的 Actions Variables 设置 `PUBLIC_GUESTBOOK_API_URL` 和 `PUBLIC_TURNSTILE_SITE_KEY`。这两个值会进入公开网页。留空时留言板显示为未连接，其他页面仍可发布。
