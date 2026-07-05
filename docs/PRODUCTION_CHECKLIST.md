# ClawNote Production Checklist

> 2026-07-06 代码层已完成(见 git log):
> - [x] API 全局鉴权门禁(src/middleware.ts,生产必须登录;CLAWNOTE_LOCAL_MODE=1 才允许匿名)
> - [x] 修复 tasks/inbox/memory/documents/collections [id] 路由越权(IDOR)
> - [x] 文件上传:登录校验 + 扩展名/MIME 白名单(拒绝 svg/html 等可执行内容)
> - [x] 实时协作:票据鉴权(/api/collab/token + scripts/collab-server.cjs)、LevelDB 持久化(装 y-leveldb)、真实用户光标、防双重 seed
> - [x] 协作服务纳入 docker-compose.prod + nginx /collab wss 反代
> - [x] AI 摘要/标签/任务提取接入 LLM(配 ANTHROPIC_API_KEY 或 OPENAI_API_KEY,无 key 回退规则实现)
> - [x] 图片生成接入 OpenAI 兼容供应商(MEDIA_PROVIDER=openai/openai-compatible);视频生成仍未接入,未配置时明确报错
> - [x] 登录限流支持 Redis(REDIS_URL,多实例安全)
> - [x] CSRF:middleware 对跨域写请求做 Origin 校验
>
> 以下为部署时的人工操作项:

## Infrastructure

- [ ] Configure HTTPS domain
- [ ] Replace all development secrets
- [ ] Configure PostgreSQL backups
- [ ] Configure object storage (S3 / OSS / R2)
- [ ] Enable Redis persistence
- [ ] Configure firewall and security groups
- [ ] Enable automatic Docker restart

## Application

- [ ] Run `prisma migrate deploy`
- [ ] Run `npm run build`
- [ ] Verify `/api/health`
- [ ] Verify file upload limits
- [ ] Verify authentication and permissions
- [ ] Verify Workspace role restrictions
- [ ] Verify document restore and backups

## Security

- [ ] Rotate NEXTAUTH_SECRET
- [ ] Rotate CLAWNOTE_AGENT_TOKEN
- [ ] Disable default passwords
- [ ] Configure HTTPS certificates
- [ ] Verify nginx security headers
- [ ] Configure rate limiting
- [ ] Configure CSRF protection

## Monitoring

- [ ] Configure uptime monitoring
- [ ] Configure log aggregation
- [ ] Configure database metrics
- [ ] Configure alert notifications

## AI Providers

- [ ] Configure OpenAI API key
- [ ] Configure Anthropic API key
- [ ] Configure embedding model
- [ ] Verify semantic search

## Recovery

- [ ] Test restore-postgres.sh
- [ ] Test full docker restore
- [ ] Test document version restore
