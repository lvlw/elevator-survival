# 只读依赖核查：PARTIAL

准确基线a7，Node `v24.9.0`、npm `11.6.0`。`npm audit --json` 和 `npm audit --omit=dev --json` 均已实际执行：初次受限网络 EACCES；按相同命令重试后，当前配置的 npmmirror bulk advisory API 返回 **HTTP404 / NOT_IMPLEMENTED**，退出1。原始stdout/stderr/退出码保存在轻包 `evidence/`。没有有效 `vulnerabilities`/`metadata` 结果，当前漏洞数及严重程度均为 **UNKNOWN**，不是0，也不能将工具错误算作发现漏洞。

`npm ls --all --json` 退出0，解析出11个直接包和211条实际依赖路径。[dependency-audit.json](dependency-audit.json) 保留实际路径、版本、直接关系及lock dev标志；可作为公告匹配输入，不是可利用性证明。

| 类别 | 本机实际安装版本 | 可判断的相关性 |
| --- | --- | --- |
| runtime | react19.2.8、react-dom19.2.8、zod4.4.3、zustand5.0.14 | 生产浏览器构建的直接依赖；存在不等于存在可利用漏洞 |
| 开发/构建/测试 | @types/react19.2.17、@types/react-dom19.2.3、@vitejs/plugin-react6.0.4、jsdom29.1.1、typescript7.0.2、vite8.1.5、vitest4.1.10 | 开发服务/本地或CI构建及测试工具；dev标志不等于零风险 |

未观察对外服务器、端口或公开服务，不能断言暴露；没有取得有效公告，逐项公告原始来源、受影响前提、生产适用性和候选修复版本均 UNKNOWN。本轮不为历史“7项（2 moderate/5 high）”摘要杜撰7个包名；该数仅来自A主线审查MD所引的旧CI，不是当前扫描。

后续应单独授权取得可用审计来源，保留每条原始公告，按本轮依赖链评估 runtime/dev/build可达性和前提，再提出精确修复版本及锁文件/构建/回归成本。尚不能给出具体安全升级版本。未执行 audit fix、升级、安装额外工具、换源配置、改锁或CI。
