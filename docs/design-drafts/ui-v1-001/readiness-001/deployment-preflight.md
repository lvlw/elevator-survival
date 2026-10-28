# 本地审阅与部署准备（未部署）

本批只生成仓库外 REVIEW-SITE：仅复制当前运行必需脚本、64栅格、注册素材与本轮清单／示例，不包含旧177张稿、Git目录、profile、存档、字体或依赖。使用 Python serve.py 绑定127.0.0.1；GET/HEAD可读，POST/PUT/PATCH/DELETE拒绝，无目录列表，拒绝路径穿越，CSP禁止外部页面资源。

应用内浏览器实际验证与静态资源闭包分别记录。Edge扩展本次不可连接；未改扩展、用户profile、网络或浏览器安全设置。现有浏览器注入的1688浮标会出现在部分原生截图，属于环境污染而非游戏资源，未修图移除。未建立干净独立profile的全网络拦截证明，未物理断外网；file://与该独立隔离环境均 NOT VERIFIED。回环HTTP不更名为file或断网验收。

未来静态部署候选：单独域名/路径、HTTPS和访问控制；以完整SHA/非循环artifactId作为不可变版本目录。拒绝覆盖现有Wiki根目录、index.html或资产。上线前核验站点manifest与ZIP摘要、禁止列目录和写接口、确认CSP与MIME；不把隐藏URL当鉴权，不给客户端凭据。

部署模板（供另行授权者填写，不执行）：

```text
release = /isolated-ui-review/<full-sha>/<artifact-id>/
source = verified REVIEW-SITE payload
auth = server-side access control, no browser-shipped secret
transport = existing approved HTTPS termination
publish = atomic current pointer only after hash and access checks
rollback = point current at prior verified immutable release
wiki = separate root/process/routing, explicit backup before any authorized shared change
```

待未来执行契约指定主机/独立目录/鉴权与恢复责任人。当前没有SSH、DNS、证书、端口、防火墙、Wiki或云服务变更，也没有迁移Git/LFS历史。
