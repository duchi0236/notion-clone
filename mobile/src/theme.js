// ClawNote 移动端配色（slate / liquid-glass，主色对齐 web primaryColor #0f172a）
export const colors = {
  bg: "#f6f7f9",
  surface: "#ffffff",
  surfaceAlt: "#f1f3f6",
  border: "#e3e6eb",
  borderStrong: "#d3d8e0",
  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  primary: "#0f172a",
  primarySoft: "#e2e8f0",
  accent: "#4f6bed",
  accentSoft: "#eaeefe",
  success: "#16a34a",
  successSoft: "#e6f6ec",
  warning: "#d97706",
  warningSoft: "#fdf0dd",
  danger: "#dc2626",
  dangerSoft: "#fdecec",
  tabActive: "#0f172a",
  tabInactive: "#9aa3b2",
};

// 状态 / 优先级 / 来源 → 颜色映射
export const statusColors = {
  未开始: { bg: colors.surfaceAlt, fg: colors.textMuted },
  进行中: { bg: colors.accentSoft, fg: colors.accent },
  已完成: { bg: colors.successSoft, fg: colors.success },
  搁置: { bg: colors.warningSoft, fg: colors.warning },
};

export const priorityColors = {
  高: { bg: colors.dangerSoft, fg: colors.danger },
  中: { bg: colors.warningSoft, fg: colors.warning },
  低: { bg: colors.successSoft, fg: colors.success },
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const shadow = {
  shadowColor: "#0f172a",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
