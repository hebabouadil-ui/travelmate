import React from "react";
import { ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { Icon } from "@/components/Icon";
import { colors, font, radius, spacing } from "@/theme";

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * App-wide error boundary. Converts a JavaScript crash into a readable on-screen
 * message instead of a blank screen / hard crash — invaluable for diagnosing
 * issues on real devices where logs aren't easily accessible.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[Voyage] Caught error:", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.errIcon}>
              <Icon name="alert-circle" size={34} color={colors.danger} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app hit an unexpected error. Details below — please screenshot
              this and share it.
            </Text>
            <View style={styles.box}>
              <Text style={styles.errName}>{this.state.error.name}: {this.state.error.message}</Text>
              {this.state.error.stack ? (
                <Text style={styles.stack}>{this.state.error.stack}</Text>
              ) : null}
            </View>
            <Pressable style={styles.btn} onPress={this.reset}>
              <Text style={styles.btnText}>Try again</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxxl, flexGrow: 1, justifyContent: "center" },
  errIcon: { alignSelf: "center", width: 72, height: 72, borderRadius: 36, backgroundColor: colors.danger + "14", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { color: colors.text, fontSize: font.h1, fontWeight: "900", textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: font.body, textAlign: "center", marginTop: spacing.sm, lineHeight: 21 },
  box: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.xl },
  errName: { color: colors.danger, fontSize: font.small, fontWeight: "700", marginBottom: spacing.sm },
  stack: { color: colors.textFaint, fontSize: font.tiny, fontFamily: "monospace", lineHeight: 16 },
  btn: { marginTop: spacing.xl, height: 50, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  btnText: { color: colors.white, fontWeight: "700", fontSize: font.body },
});
