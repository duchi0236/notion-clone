# ClawNote Production Checklist

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
