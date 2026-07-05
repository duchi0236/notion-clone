// Prisma 版 AuthStore：把 @clawnote/auth-core 接到 ClawNote 现有库。
// 兼容点：findIdentity(PASSWORD) 在无 AuthIdentity 行时回落读 User.password（存量用户免回填即可登录）。
// 首登隐式建号时同步建默认 Workspace + OWNER 成员（与 ensureWorkspace 行为一致）。
import { prisma } from "@/lib/prisma";
import type { AuthIdentity, AuthProvider, AuthStore, AuthUser } from "../../packages/auth-core/src/index";

type PUser = { id: string; email: string | null; phone: string | null; name: string | null; avatarUrl: string | null; tokenVersion: number };

function toAuthUser(u: PUser): AuthUser {
  return { id: u.id, email: u.email, phone: u.phone, name: u.name, avatarUrl: u.avatarUrl, tokenVersion: u.tokenVersion };
}

export const prismaAuthStore: AuthStore = {
  async findIdentity(provider, providerAccountId) {
    const row = await prisma.authIdentity.findUnique({
      where: { provider_providerAccountId: { provider: provider as never, providerAccountId } },
      include: { user: true },
    });
    if (row) {
      const identity: AuthIdentity = {
        id: row.id, userId: row.userId, provider: row.provider as AuthProvider, providerAccountId: row.providerAccountId,
        secretHash: row.secretHash, unionid: row.unionid, openid: row.openid, isPrimary: row.isPrimary,
      };
      return { identity, user: toAuthUser(row.user) };
    }
    // 存量密码用户回落（User.password）
    if (provider === "PASSWORD") {
      const u = await prisma.user.findUnique({ where: { email: providerAccountId } });
      if (u?.password) {
        return {
          identity: { id: `legacy_${u.id}`, userId: u.id, provider: "PASSWORD", providerAccountId, secretHash: u.password, unionid: null, openid: null, isPrimary: true },
          user: toAuthUser(u),
        };
      }
    }
    return null;
  },

  async findUserById(id) {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? toAuthUser(u) : null;
  },

  async createUserWithIdentity({ user, identity }) {
    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: user.email ?? null,
          phone: user.phone ?? null,
          name: user.name ?? (user.email ? user.email.split("@")[0] : "用户"),
          avatarUrl: user.avatarUrl ?? null,
          password: identity.provider === "PASSWORD" ? identity.secretHash ?? null : null, // 双写，迁移期兼容
        },
      });
      await tx.authIdentity.create({
        data: {
          userId: u.id, provider: identity.provider as never, providerAccountId: identity.providerAccountId,
          secretHash: identity.secretHash ?? null, unionid: identity.unionid ?? null, openid: identity.openid ?? null, isPrimary: identity.isPrimary,
        },
      });
      const ws = await tx.workspace.create({
        data: { name: `${u.name ?? "我"} 的知识库`, icon: "🧠", description: "Personal ClawNote workspace", ownerId: u.id },
      });
      await tx.workspaceMember.create({ data: { userId: u.id, workspaceId: ws.id, role: "OWNER" } });
      return u;
    });
    const idn: AuthIdentity = { id: `idn_${created.id}`, userId: created.id, ...identity };
    return { user: toAuthUser(created), identity: idn };
  },

  async addIdentity(userId, identity) {
    const row = await prisma.authIdentity.create({
      data: {
        userId, provider: identity.provider as never, providerAccountId: identity.providerAccountId,
        secretHash: identity.secretHash ?? null, unionid: identity.unionid ?? null, openid: identity.openid ?? null, isPrimary: identity.isPrimary,
      },
    });
    return { id: row.id, userId, provider: row.provider as AuthProvider, providerAccountId: row.providerAccountId, secretHash: row.secretHash, unionid: row.unionid, openid: row.openid, isPrimary: row.isPrimary };
  },

  async bumpTokenVersion(userId) {
    await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  },
  async touchLogin(userId) {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }).catch(() => {});
  },

  async saveOtp(rec) {
    const r = await prisma.phoneOtp.create({ data: { phone: rec.phone, codeHash: rec.codeHash, purpose: rec.purpose, expiresAt: new Date(rec.expiresAt), attempts: rec.attempts, consumedAt: rec.consumedAt ? new Date(rec.consumedAt) : null } });
    return { id: r.id, phone: r.phone, codeHash: r.codeHash, purpose: r.purpose, expiresAt: r.expiresAt.getTime(), attempts: r.attempts, consumedAt: r.consumedAt?.getTime() ?? null };
  },
  async latestOtp(phone, purpose) {
    const r = await prisma.phoneOtp.findFirst({ where: { phone, purpose }, orderBy: { createdAt: "desc" } });
    return r ? { id: r.id, phone: r.phone, codeHash: r.codeHash, purpose: r.purpose, expiresAt: r.expiresAt.getTime(), attempts: r.attempts, consumedAt: r.consumedAt?.getTime() ?? null } : null;
  },
  async incOtpAttempts(id) {
    await prisma.phoneOtp.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },
  async consumeOtp(id) {
    await prisma.phoneOtp.update({ where: { id }, data: { consumedAt: new Date() } });
  },

  async saveTicket(rec) {
    await prisma.wechatTicket.create({ data: { ticket: rec.ticket, state: rec.state, status: rec.status, userId: rec.userId ?? null, unionid: rec.unionid ?? null, openid: rec.openid ?? null, expiresAt: new Date(rec.expiresAt), consumedAt: rec.consumedAt ? new Date(rec.consumedAt) : null } });
  },
  async getTicketByState(state) {
    const r = await prisma.wechatTicket.findUnique({ where: { state } });
    return r ? { ticket: r.ticket, state: r.state, status: r.status as never, userId: r.userId, unionid: r.unionid, openid: r.openid, expiresAt: r.expiresAt.getTime(), consumedAt: r.consumedAt?.getTime() ?? null } : null;
  },
  async getTicket(ticket) {
    const r = await prisma.wechatTicket.findUnique({ where: { ticket } });
    return r ? { ticket: r.ticket, state: r.state, status: r.status as never, userId: r.userId, unionid: r.unionid, openid: r.openid, expiresAt: r.expiresAt.getTime(), consumedAt: r.consumedAt?.getTime() ?? null } : null;
  },
  async updateTicketByState(state, patch) {
    await prisma.wechatTicket.update({ where: { state }, data: { status: patch.status, userId: patch.userId ?? undefined, unionid: patch.unionid ?? undefined, openid: patch.openid ?? undefined } });
  },
  async consumeTicket(ticket) {
    await prisma.wechatTicket.update({ where: { ticket }, data: { consumedAt: new Date(), status: "CONSUMED" } });
  },
};
