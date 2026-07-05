// 动态配置：在 app.json 基础上按构建环境覆盖（生产关闭明文 HTTP、写入生产 API、用正式包名）。
// EAS 通过 eas.json 的 env 注入 APP_ENV / EXPO_PUBLIC_SERVER_URL。
module.exports = ({ config }) => {
  const env = process.env.APP_ENV || "development";
  const isProd = env === "production" || env === "preview";
  const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL || config.extra?.serverUrl || null;

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: "ai.clawnote.app",
      infoPlist: {
        ...(config.ios?.infoPlist || {}),
        // 生产全程 HTTPS：移除任意明文豁免；开发期保留以便连本机 dev server
        NSAppTransportSecurity: isProd ? { NSAllowsArbitraryLoads: false } : { NSAllowsArbitraryLoads: true },
      },
    },
    android: {
      ...config.android,
      package: "ai.clawnote.app",
      usesCleartextTraffic: !isProd, // 生产禁用明文
    },
    extra: {
      ...config.extra,
      serverUrl, // ServerContext 优先用它，无则回落开发机
      appEnv: env,
    },
  };
};
