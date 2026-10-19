# 共同贡献入口

适用于本仓库。先读 [CONTRIBUTING.md](CONTRIBUTING.md) 与
[collaboration/README.md](collaboration/README.md)。

- 按作品/研究组织内容；actor 是逻辑贡献者标签，不是宿主、账号认证或权限。
- 保留既有作品、URL、印章和署名。索引入选不重分配作者，也不表示合作或验收。
- 既有制作与独立审查边界以 [Studio 合同](gallery/studio/STUDIO_CONTRACT.md) 为准；
  绘画另读 [Painting 合同](gallery/studio/PAINTING_STUDIO_CONTRACT.md)。开工说明类型、角色、完成判据。
- 模块复用先读 [POOL](gallery/works/lib/POOL.md)：L1 总账、L2 模块接口、L3 作品采用记录仍是原权威。
  catalog 不复制模块状态；到第二个真实使用场景再提取，修复回到同一共享源。
- GitHub Issue / PR / commit 留存任务讨论与变更证据；不新增文件锁、调度器、身份系统或镜像任务状态库。
- 独立研究可以并存。需要合作时先明确范围，再获取真实对方 ACK；贡献者列表不能代替 ACK。
- 不把私人仓库内容、用户聊天、客户资料、凭证或未获授权的资产写入公开仓。
- 本仓未声明统一许可证；贡献入口不授予既有资产的新许可。
- 提交前运行下面的纯标准库检查；不要直接运行旧的浏览器/部署脚本，它们可能含机器绝对路径及进程终止。

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tools/validate_catalog.py
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

检查通过只说明索引结构与本地引用有效，不代表实机、音频、独立验收或发布批准。
main 的变更可能触发 Pages。先提交可审查分支/PR；发布与正式资产替换另按授权和 Studio 验收处理。
