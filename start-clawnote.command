#!/bin/zsh
# ClawNote 一键启动：释放端口 -> (可选)起数据库 -> 启动 Web(:3001) -> 就绪后自动开浏览器
cd "/Users/duchi/Desktop/code/notion-clone" || exit 1

echo "==> 释放可能被占用的 3001 端口"
lsof -ti tcp:3001 | xargs kill -9 2>/dev/null || true

if command -v docker >/dev/null 2>&1; then
  echo "==> 启动数据库"
  docker compose up -d 2>/dev/null || true
else
  echo "==> 未检测到 docker，跳过数据库（页面仍可打开，数据走本地兜底）"
fi

if [ ! -d node_modules ]; then
  echo "==> 首次安装依赖（可能要几分钟）"
  npm install
fi

# 后台等待端口就绪后自动打开浏览器
(
  for i in {1..180}; do
    if nc -z localhost 3001 2>/dev/null; then
      sleep 1
      open "http://localhost:3001/clawnote"
      break
    fi
    sleep 1
  done
) &

echo "==> 启动 ClawNote Web：http://localhost:3001/clawnote"
echo "    保持此窗口开启＝服务运行中；要停止按 Ctrl+C 或关闭窗口。"
exec npx next dev -p 3001
