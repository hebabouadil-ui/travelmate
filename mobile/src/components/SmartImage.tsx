import React, { useEffect, useState } from "react";
import { Image, View, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from "react-native";
import { colors } from "@/theme";

/**
 * Image with graceful fallback + loading state. If the primary URI is missing or
 * fails to load, it shows the provided fallback URI; if that also fails, a sleek
 * branded placeholder (never a blank gray box). Shows a spinner while loading.
 */
export function SmartImage({
  uri,
  fallback,
  style,
  emoji = "🏙️",
}: {
  uri?: string;
  fallback?: string;
  style?: StyleProp<ViewStyle>;
  /** Emoji shown when there's no image (font-independent). */
  emoji?: string;
}) {
  const first = uri || fallback;
  const [src, setSrc] = useState<string | undefined>(first);
  const [stage, setStage] = useState<0 | 1>(0); // 0 = primary, 1 = fallback
  const [loading, setLoading] = useState(Boolean(first));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(uri || fallback);
    setStage(0);
    setLoading(Boolean(uri || fallback));
    setFailed(false);
  }, [uri, fallback]);

  const onError = () => {
    if (stage === 0 && fallback && fallback !== src) {
      setStage(1);
      setSrc(fallback);
    } else {
      setFailed(true);
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      {src && !failed ? (
        <Image
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={onError}
          onLoadEnd={() => setLoading(false)}
        />
      ) : null}
      {(!src || failed) && <Text style={{ fontSize: 26, opacity: 0.5 }}>{emoji}</Text>}
      {loading && !failed ? (
        <ActivityIndicator color={colors.primary} style={StyleSheet.absoluteFill as any} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
