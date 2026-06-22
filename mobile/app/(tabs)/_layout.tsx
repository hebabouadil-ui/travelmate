import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, Text } from "react-native";
import { BlurView } from "expo-blur";
import { colors, spacing } from "@/theme";

/**
 * Tab icons use emoji (system-rendered) so they ALWAYS show, independent of the
 * icon-font loading that proved unreliable in release builds.
 */
function TabIcon({ char, focused }: { char: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{char}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
        tabBarStyle: styles.tabBar,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgElevated }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Discover", tabBarIcon: ({ focused }) => <TabIcon char="🧭" focused={focused} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: "Plan", tabBarIcon: ({ focused }) => <TabIcon char="✨" focused={focused} /> }}
      />
      <Tabs.Screen
        name="nearby"
        options={{ title: "Nearby", tabBarIcon: ({ focused }) => <TabIcon char="📍" focused={focused} /> }}
      />
      <Tabs.Screen
        name="trips"
        options={{ title: "Trips", tabBarIcon: ({ focused }) => <TabIcon char="🧳" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon char="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: Platform.OS === "ios" ? "transparent" : colors.bgElevated,
    height: Platform.OS === "ios" ? 88 : 66,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.sm,
    shadowColor: "#1A1F36",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
});
