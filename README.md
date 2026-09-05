# 诶？灵感骰子（Inspiration Dice）

想不出好点子？摇一下——让概率替你做发散。

灵感骰子是一个开源的**单页网页小工具**：点一下骰子，随机组合「发散手法 + 随机词 + 随机约束」，蹦出 **3 个不寻常的想法**，帮你打断"答案总是一样"的统计惯性。

纯 HTML + CSS + JS，零框架、零构建、零依赖、零追踪，可以直接双击打开，也可以一键发布到 GitHub Pages。

## 核心机制

内置 5 种发散手法（灵感来自 eureka 提示引擎的思路）：

| 手法 | 思路 |
| --- | --- |
| 🧂 平庸蒸馏 | 先给 3 个最平庸的答案 → 挖出隐含假设 → 全部取反 |
| 💭 随机词联想 | 词 → 属性 → 模式 → 映射，三步跳跃 |
| 🔄 逆向思维 | 目标反着做 / 失败倒推 / 身份反转 |
| 🌍 跨领域类比 | 借别的领域的结构，翻译回你的问题 |
| 🚧 约束注入 | 用"不自由"逼出创造力 |

每次摇骰子：随机抽 **3 种手法**（不重复）× 每种配 **1–2 个随机词**（60 个词库，如钟表、灯塔、蜂巢…，且连续两次不会重复）× **1 条随机约束**（16 条，如"只用 10 个字以内解释清楚""完全不用电"），生成一段可以直接复制的**灵感提示语**（自带输出格式要求和好坏样例，防止 AI 输出废话）。

## 怎么用

0. 页面左上角的「❓ 怎么玩」按钮随时可以查看内置教程
1. （可选）在最上面的输入框填你想脑暴的问题，比如"怎么让背单词不痛苦"
   - 不填也可以：工具会自动从 20 条"日常小麻烦"里随机挑一个话题
2. 点中间的大骰子
3. 弹出 3 张卡片，每张包含：**手法 + 随机词 + 约束 + 灵感提示语 + "用词 → 三步跳跃"演示**
4. 点「📋 复制提示语」，粘贴给任意 AI（DeepSeek、ChatGPT、豆包等）让它帮你展开
5. 觉得不够就点「↻ 再摇一次」，会换一批手法、词和约束

## 本地使用

1. 下载/克隆本项目，找到 `inspiration-dice` 文件夹
2. 双击 `index.html` 即可使用（无需任何环境、无需联网）

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（比如 `inspiration-dice`）
2. 把 `inspiration-dice` 文件夹里的**全部文件**（`index.html`、`styles.css`、`core.js`、`script.js`、`README.md`、`LICENSE`）上传到仓库**根目录**
3. 进入仓库 **Settings → Pages**
4. 「Build and deployment」选择 **Deploy from a branch**
5. Branch 选 `main`，目录选 `/ (root)`，点 Save
6. 等一两分钟，访问 `https://你的用户名.github.io/inspiration-dice/` 即可

> 提示：不用构建、不用 Actions，纯静态文件推上去就能跑。

## 隐私与安全

- 纯静态页面，无任何外部请求、无 API Key、无追踪，完全断网也能用

## 文件结构

```
inspiration-dice/
├── index.html    # 页面结构
├── styles.css    # 样式（骰子 3D 动画、卡片、响应式）
├── core.js       # 核心逻辑：词库/约束库/手法库、随机组合、提示语生成
├── script.js     # 交互：摇骰子、渲染、复制
├── README.md
└── LICENSE       # MIT
```

## 开发者

- 自检：`node --check core.js && node --check script.js`
- 逻辑测试：`node -e "const c=require('./core.js'); console.log(c.roll('测试').length)"`
- 浏览器自动测试：打开 `index.html?selftest=1`，页面会自动摇一次骰子，标题变为 `SELFTEST PASS` 即正常

## License

MIT © 灵感骰子 contributors
