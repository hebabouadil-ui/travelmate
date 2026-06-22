import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, font, shadow } from "@/theme";

/** Primary gradient button with haptic feedback — the app's main CTA. */
export function GradientButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { opacity: disabled ? 0.5 : pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, shadow.float]}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <View style={styles.btnRow}>
            {icon && <Icon name={icon} size={18} color={colors.white} />}
            <Text style={styles.btnText}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

/** Secondary / ghost button. */
export function GhostButton({
  label,
  onPress,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.ghost,
        { opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={colors.text} />}
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

/** Glass-like surface card. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Selectable chip used throughout onboarding & filters. Accepts an optional
 *  Lucide icon (preferred). The legacy `emoji` prop is ignored for a clean,
 *  premium, emoji-free look. */
export function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: string;
  /** @deprecated kept for call-site compatibility; no longer rendered. */
  emoji?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={15}
          strokeWidth={2}
          color={selected ? colors.primary : colors.textMuted}
        />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Small pill label. */
export function Pill({
  label,
  color = colors.primary,
  icon,
}: {
  label: string;
  color?: string;
  icon?: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: color + "1A" }]}>
      {icon && <Icon name={icon} size={13} color={color} strokeWidth={2} />}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Circular match-score ring. */
export function ScoreRing({ score }: { score: number }) {
  const tone =
    score >= 85 ? colors.success : score >= 70 ? colors.accent : colors.warning;
  return (
    <View style={[styles.ring, { borderColor: tone }]}>
      <Text style={[styles.ringText, { color: tone }]}>{score}</Text>
      <Text style={styles.ringPct}>%</Text>
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function EmptyState({
  icon = "compass-outline",
  title,
  message,
  cta,
}: {
  icon?: string;
  title: string;
  message: string;
  cta?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {cta ? <View style={{ marginTop: spacing.lg }}>{cta}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btnText: { color: colors.white, fontSize: font.body, fontWeight: "700" },
  ghost: {
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  ghostText: { color: colors.text, fontSize: font.body, fontWeight: "600" },
  card: {
    ...shadow.soft,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary + "1A",
  },
  chipEmoji: { fontSize: 15 },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: font.small },
  chipTextSelected: { color: colors.primary, fontWeight: "700" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: font.tiny, fontWeight: "700", letterSpacing: 0.2 },
  ring: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: colors.bg + "AA",
  },
  ringText: { fontSize: font.h3, fontWeight: "800" },
  ringPct: { fontSize: 9, color: colors.textFaint, marginTop: 4 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: font.h2, fontWeight: "800" },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: font.small,
    marginTop: 2,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    color: colors.textMuted,
    fontSize: font.body,
    textAlign: "center",
    lineHeight: 21,
  },
});
