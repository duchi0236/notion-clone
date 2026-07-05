# TLS 证书（生产）

`docker-compose.prod.yml` 的 nginx 会挂载本目录到 `/etc/nginx/certs`，需放置：

- `fullchain.pem` —— 证书链（证书 + 中间证书）
- `privkey.pem` —— 私钥

## 获取方式（任选）

### Let's Encrypt（免费 DV，推荐）
```bash
# 在宿主机用 certbot 申请（DNS 已指向本机、80 端口可达）
certbot certonly --standalone -d app.clawnote.app
# 软链/拷贝到本目录
cp /etc/letsencrypt/live/app.clawnote.app/fullchain.pem deploy/certs/
cp /etc/letsencrypt/live/app.clawnote.app/privkey.pem   deploy/certs/
```
> 90 天到期，需配置自动续期（cron + `certbot renew` + `docker compose exec nginx nginx -s reload`）。

### 云厂商证书 / OV / EV
下载 Nginx 格式证书，重命名为 `fullchain.pem` / `privkey.pem` 放入本目录。

⚠️ 本目录除本说明外**不应提交任何 .pem 到 git**（见 .gitignore）。
