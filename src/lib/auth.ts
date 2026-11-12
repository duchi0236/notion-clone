import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAuthCore } from "@/lib/auth-core";
import { readWechatTicket, wechatLoginMode } from "@/lib/wechat-web";

// 三种登录方式统一经 @clawnote/auth-core；NextAuth 负责 Web 会话（JWT cookie）。
// 重校验（OTP/微信 ticket）在各自 API 路由完成，这里只消费结果换 user。
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        try {
          const core = await getAuthCore();
          const { user } = await core.password.login({ email: credentials?.email ?? "", password: credentials?.password ?? "" });
          return { id: user.id, email: user.email ?? undefined, name: user.name ?? user.email ?? undefined, image: user.avatarUrl ?? undefined, tv: user.tokenVersion } as never;
        } catch {
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone code",
      credentials: { phone: { label: "Phone", type: "text" }, code: { label: "Code", type: "text" } },
      async authorize(credentials) {
        try {
          const core = await getAuthCore();
          const { user } = await core.phone.login({ phone: credentials?.phone ?? "", code: credentials?.code ?? "" });
          return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined, image: user.avatarUrl ?? undefined, tv: user.tokenVersion } as never;
        } catch {
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "wechat",
      name: "WeChat",
      credentials: {},
      async authorize(_credentials, request) {
        try {
          const secure = wechatLoginMode() === "website";
          const ticket = readWechatTicket(request.headers?.cookie, secure);
          if (!ticket) return null;
          const core = await getAuthCore();
          const { user } = await core.wechat.exchange(ticket);
          return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined, image: user.avatarUrl ?? undefined, tv: user.tokenVersion } as never;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.tv = (user as { tv?: number }).tv ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        (session.user as { tv?: number }).tv = Number(token.tv ?? 0);
      }
      return session;
    },
  },
};
