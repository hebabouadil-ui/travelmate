import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, spacing } from "@/theme";
import { Card, Pill } from "@/components/ui";
import { useProfile } from "@/store/useProfile";
import { TRAVELER_TYPES, INTERESTS } from "@/lib/onboarding-config";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { hasGoogleMaps } from "@/lib/env";
import { getProvider } from "@/lib/ai/provider";
import { requestNotificationPermission, notifyNow } from "@/lib/notifications";

export default function Profile() {
  const router = useRouter();
  const profile = useProfile((s) => s.profile);
  const savedTrips = useProfile((s) => s.savedTrips);
  const favorites = useProfile((s) => s.favorites);
  const resetOnboarding = useProfile((s) => s.resetOnboarding);
  const [notifications, setNotifications] = useState(false);

  const type = TRAVELER_TYPES.find((t) => t.value === profile.travelerType);
  const interestLabels = (profile.interests ?? [])
    .map((i) => INTERESTS.find((x) => x.value === i)?.label)
    .filter(Boolean) as string[];

  const aiLive = getProvider().isLive;

  const onToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      setNotifications(granted);
      if (granted) await notifyNow("Notifications on 🔔", "We'll remind you before your trips.");
      else Alert.alert("Permission needed", "Enable notifications in system settings to get trip reminders.");
    } else {
      setNotifications(false);
    }
  };

  const onEditProfile = () => {
    Alert.alert("Edit preferences", "Re-run the quick onboarding to update your travel style?", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => { resetOnboarding(); router.replace("/onboarding"); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile hero */}
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{type?.emoji ?? "🧭"}</Text>
          </View>
          <Text style={styles.heroName}>{type?.label ?? "Traveler"}</Text>
          <View style={styles.heroStats}>
            <Stat value={savedTrips.length} label="Trips" />
            <View style={styles.statDivider} />
            <Stat value={favorites.length} label="Favorites" />
            <View style={styles.statDivider} />
            <Stat value={interestLabels.length} label="Interests" />
          </View>
        </LinearGradient>

        <Pressable style={styles.editBtn} onPress={onEditProfile}>
          <Ionicons name="create-outline" size={18} color={colors.text} />
          <Text style={styles.editText}>Edit travel preferences</Text>
        </Pressable>

        {/* Interests */}
        {interestLabels.length > 0 && (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={styles.cardTitle}>Your interests</Text>
            <View style={styles.tagWrap}>
              {interestLabels.map((l) => (
                <View key={l} style={styles.tag}><Text style={styles.tagText}>{l}</Text></View>
              ))}
            </View>
          </Card>
        )}

        {/* Settings */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.cardTitle}>Settings</Text>
          <Row icon="notifications" label="Trip reminders">
            <Switch
              value={notifications}
              onValueChange={onToggleNotifications}
              trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
              thumbColor={colors.white}
            />
          </Row>
          <Row icon="cloud-offline" label="Offline mode">
            <Pill label="Always on" color={colors.success} />
          </Row>
        </Card>

        {/* Integrations status */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.cardTitle}>Engine status</Text>
          <StatusRow label="AI narration" ok={aiLive} okText="Gemini live" offText="Smart templates (free)" />
          <StatusRow label="Native maps" ok={hasGoogleMaps()} okText="Google Maps key set" offText="Preview mode" />
          <StatusRow label="Cloud sync" ok={isSupabaseConfigured()} okText="Supabase connected" offText="Guest mode" />
          <Text style={styles.note}>
            All features work for free. Add optional keys to unlock live AI, native maps and cloud sync.
          </Text>
        </Card>

        <Text style={styles.version}>Voyage AI · v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function StatusRow({ label, ok, okText, offText }: { label: string; ok: boolean; okText: string; offText: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.statusRight}>
        <View style={[styles.dot, { backgroundColor: ok ? colors.success : colors.textFaint }]} />
        <Text style={[styles.statusText, { color: ok ? colors.success : colors.textMuted }]}>
          {ok ? okText : offText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 110 },
  hero: { borderRadius: radius.xl, padding: spacing.xl, alignItems: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  avatarEmoji: { fontSize: 38 },
  heroName: { color: colors.white, fontSize: font.h1, fontWeight: "900" },
  heroStats: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, gap: spacing.lg },
  stat: { alignItems: "center" },
  statValue: { color: colors.white, fontSize: font.h2, fontWeight: "900" },
  statLabel: { color: "rgba(255,255,255,0.8)", fontSize: font.tiny, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.lg, height: 48, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  editText: { color: colors.text, fontWeight: "700", fontSize: font.body },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: "800", marginBottom: spacing.md },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  tagText: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowLabel: { color: colors.text, fontSize: font.body, fontWeight: "600" },
  statusRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: font.small, fontWeight: "700" },
  note: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.md, lineHeight: 16 },
  version: { color: colors.textFaint, fontSize: font.tiny, textAlign: "center", marginTop: spacing.xl },
});
