// 复用的原子 UI 组件。
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../theme";

export function Screen({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style, onPress }) {
  const Comp = onPress ? Pressable : View;
  return (
    <Comp onPress={onPress} style={({ pressed }) => [styles.card, shadow, onPress && pressed && styles.pressed, style]}>
      {children}
    </Comp>
  );
}

export function Badge({ label, bg = colors.surfaceAlt, fg = colors.textMuted }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Button({ title, onPress, icon, variant = "primary", disabled, style }) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonGhost,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={isPrimary ? "#fff" : colors.text} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.buttonText, { color: isPrimary ? "#fff" : colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = colors.textMuted, size = 20 }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Field({ value, onChangeText, placeholder, multiline, style, ...rest }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      multiline={multiline}
      style={[styles.field, multiline && styles.fieldMultiline, style]}
      {...rest}
    />
  );
}

export function Loading({ label = "加载中…" }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = "sparkles-outline", title, subtitle, action }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.textFaint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      <Text style={[styles.emptyTitle, { color: colors.danger }]}>出错了</Text>
      <Text style={[styles.muted, { textAlign: "center", paddingHorizontal: 24 }]}>{message}</Text>
      {onRetry ? <Button title="重试" icon="refresh" variant="ghost" onPress={onRetry} style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.md },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: "600" },
  iconButton: { padding: 6, borderRadius: radius.sm },
  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  fieldMultiline: { minHeight: 100, textAlignVertical: "top" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: 8 },
  muted: { color: colors.textMuted, fontSize: 13 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
});
