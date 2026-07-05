// 身份归并：所有 Provider 的唯一收敛点。核心防接管规则：
//   只有「本流程实时验证过的凭证」(verified=true) 才能命中既有 User；
//   绑定时目标标识被占用即拒绝，绝不静默迁移。
import { AuthError, type AuthProvider, type AuthStore, type AuthUser } from "./types";

export interface LinkParams {
  provider: AuthProvider;
  providerAccountId: string;
  verified: boolean;
  profile?: Partial<AuthUser>;
  secretHash?: string | null;
  unionid?: string | null;
  openid?: string | null;
  currentUserId?: string; // 已登录绑定时传入
}

export async function linkOrCreateUser(store: AuthStore, p: LinkParams): Promise<AuthUser> {
  if (!p.verified) throw new AuthError("UNVERIFIED_CREDENTIAL", "凭证未经验证，不能用于账号归并");
  const existing = await store.findIdentity(p.provider, p.providerAccountId);

  // 绑定流程：已登录用户为自己增加一种登录方式
  if (p.currentUserId) {
    if (existing && existing.user.id !== p.currentUserId) throw new AuthError("IDENTITY_TAKEN", "该登录方式已绑定到其它账号", 409);
    if (existing) return existing.user;
    await store.addIdentity(p.currentUserId, {
      provider: p.provider,
      providerAccountId: p.providerAccountId,
      secretHash: p.secretHash ?? null,
      unionid: p.unionid ?? null,
      openid: p.openid ?? null,
      isPrimary: false,
    });
    const u = await store.findUserById(p.currentUserId);
    if (!u) throw new AuthError("INVALID_CREDENTIALS", "用户不存在", 404);
    return u;
  }

  // 登录流程：命中既有身份即复用
  if (existing) return existing.user;

  // 首登隐式建号（带默认主体）
  const { user } = await store.createUserWithIdentity({
    user: {
      email: p.provider === "PASSWORD" ? p.providerAccountId : p.profile?.email ?? null,
      phone: p.provider === "PHONE" ? p.providerAccountId : p.profile?.phone ?? null,
      name: p.profile?.name ?? null,
      avatarUrl: p.profile?.avatarUrl ?? null,
    },
    identity: {
      provider: p.provider,
      providerAccountId: p.providerAccountId,
      secretHash: p.secretHash ?? null,
      unionid: p.unionid ?? null,
      openid: p.openid ?? null,
      isPrimary: true,
    },
  });
  return user;
}

// 密码策略：>=10 且不等于邮箱/手机
export function validatePassword(pw: string, ctx: { email?: string | null; phone?: string | null }): void {
  if (!pw || pw.length < 10) throw new AuthError("WEAK_PASSWORD", "密码至少 10 位");
  if (ctx.email && pw.toLowerCase() === ctx.email.toLowerCase()) throw new AuthError("WEAK_PASSWORD", "密码不能与邮箱相同");
  if (ctx.phone && pw === ctx.phone) throw new AuthError("WEAK_PASSWORD", "密码不能与手机号相同");
}
