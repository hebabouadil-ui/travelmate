import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, View, StyleSheet, ViewStyle, StyleProp, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme";
import { toHttps } from "@/lib/data/imageValidation";

/**
 * Image with a multi-source fallback chain + skeleton loading. It tries each
 * candidate URL in order (primary, then any fallbacks) and only gives up when
 * every one has failed — at which point it shows a clean, premium gradient,
 * NEVER a broken-image glyph. This is what makes a hero "never look broken":
 * worst case is a tasteful gradient, best case is the real photo.
 */
const FALLBACK_GRADIENT = ["#3b3f47", "#20222a"] as const;

export function SmartImage({
  uri,
  fallback,
  fallbacks,
  style,
  // `emoji` kept for call-site compatibility but no longer rendered.
  emoji: _emoji,
}: {
  uri?: string;
  fallback?: string;
  /** Extra ordered fallbacks tried after `uri`/`fallback` all fail. */
  fallbacks?: string[];
  style?: StyleProp<ViewStyle>;
  emoji?: string;
}) {
  // Build the ordered, de-duplicated, HTTPS-upgraded candidate list. Android
  // blocks cleartext, so an http:// photo would otherwise break with no recovery.
  const sources = useMemo(() => {
    const list = [uri, fallback, ...(fallbacks ?? [])]
      .map((u) => toHttps(u))
      .filter((u): u is string => Boolean(u));
    return Array.from(new Set(list));
  }, [uri, fallback, fallbacks]);
  const key = sources.join("|");

  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(sources.length > 0);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIdx(0);
    setLoading(sources.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [loading, shimmer]);

  const src = idx < sources.length ? sources[idx] : undefined;
  const exhausted = !src; // ran past the end of the chain (or never had a source)

  const onError = () => {
    const next = idx + 1;
    setIdx(next); // advance; once past the end, src is undefined → gradient shows
    if (next >= sources.length) setLoading(false);
  };

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <View style={[styles.wrap, style]}>
      {/* Premium gradient base — always present, so a slow/failed photo never
          shows as "broken"; a loaded photo simply covers it. */}
      <LinearGradient colors={FALLBACK_GRADIENT} style={StyleSheet.absoluteFill} />

      {!exhausted ? (
        <Image
          // Force a fresh mount per candidate so onError/onLoad fire reliably.
          key={src}
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={onError}
          onLoadEnd={() => setLoading(false)}
        />
      ) : null}

      {loading && !exhausted ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.skeleton, { opacity: shimmerOpacity }]}
        />
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
  skeleton: { backgroundColor: colors.surfaceAlt },
});
