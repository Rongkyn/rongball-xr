# 共同作品与研究入口

一个仓库、多位贡献者；按问题和作品相遇，允许独立研究继续独立。
既有绒球作品与署名保持原样。换运行平台不会自动产生一个新作者，署名也不是身份认证。

## 第一切片

- [听雨](../xr/rain-listening.html)：既有雨声交互原型
- [程序化音效 · Tone.js](../xr/procedural-audio-tonejs.html)：既有音效合成原型
- [墨音](../gallery/works/ink-sound.html)：既有互动音画
- [水、雨与气泡比较研究](../research/water-audio-comparison/README.md)：dot 独立源码研究，未实耳试听，未获合作 ACK
- [机器可读目录](catalog.json)：贡献来源、验证范围与限制
- [研究记录模板](research-template.md)：新问题、方法、反证、产物和可复用贡献

当前共同入口是 GitHub README 文档；本片保留全部线上 HTML，不新增网页导航。网页共同入口留待后续单独审查与发布。

这是起步样本，不是全库重新编目。完整作品仍从[根目录](../README.md)和[画廊](../gallery/index.html)进入。

## 先复用，再合作

共享能力已有 [POOL](../gallery/works/lib/POOL.md)。先查总账、模块接口与真实采用记录，
缺陷回到共同源。新入口只聚合作品/研究，不覆盖原模块状态、创作队列或 Studio 合同。
按 [贡献指南](../CONTRIBUTING.md) 提交独立研究或合作请求；没有真实 ACK 就保持独立。

## catalog v1 的边界

JSON 顶层为 `schema_version: 1`、`scope: "initial_slice"`、`entries`。
每项必须恰有 `id/type/title/path/contributions/validation/sources`：

- `id`：小写字母开头的稳定短标识，仅含小写字母、数字、连字符
- `type`：`work` 或 `research`；`path` 为仓库内实际文件
- `contributions`：非空列表，每项含 `kind/actor/evidence`。kind 可为 `credited_author`、`independent_research`、`implementation`、`review`；actor 未知用 `unknown`
- `validation`：`level/limits/evidence`；level 为 `unverified`、`source_review` 或 `runtime_observation`。这只是已观察证据的层次，不是任务或接受状态
- `evidence`、`sources`：非空引用列表；仓库根相对文件路径（可带 fragment）或 HTTPS URL
- `limits`：非空字符串列表，必须直说没有验证什么

严格字段约束拒绝 `accepted`、`status`、合作接受字段以及未知枚举。合作或验收不能通过改一个目录字段宣告。
未来需要结构化 ACK 时先提出 schema 变更及验证办法，本版只链接原始证据供人工核验。

校验器要求 Python 3.9+，只用标准库。运行 `python3 tools/validate_catalog.py` 与 `python3 -m unittest discover -s tests -v`。
校验器仅检查结构、必填证据、路径存在/越界与 URL 形式；不访问外网、不认证 actor、不验证网页内容、
不判断证据真假、不发现全部隐私泄露，也不执行作品。真实审查、合作 ACK、实耳/设备测试与发布授权仍需单独证据。

本次入口建设的讨论与变更范围见 [GitHub Issue #1](https://github.com/Rongkyn/rongball-xr/issues/1)。
