import React, { useEffect, useRef, useState } from "react";
import { Image, View, StyleSheet, ViewStyle, StyleProp, Animated, Easing } from "react-native";
import { colors } from "@/theme";
import { Icon } from "./Icon";
import { toHttps } from "@/lib/data/imageValidation";

/**
 * Image with graceful fallback + skeleton loading. While loading we show a
 * subtle shimmering neutral skeleton (never a bright solid colour). If the
 * primary URI fails it tries the fallback URI, then settles on a quiet neutral
 * placeholder with a faint image glyph — never a repeated mismatched photo.
 */
export function SmartImage({
  uri,
  fallback,
  style,
  // `emoji` kept for call-site compatibility but no longer rendered (premium look).
  emoji: _emoji,
}: {
  uri?: string;
  fallback?: string;
  style?: StyleProp<ViewStyle>;
  emoji?: string;
}) {
  // Upgrade to HTTPS on the way in — Android blocks cleartext, so an http://
  // photo would otherwise render as a broken image with no chance to recover.
  const httpsUri = toHttps(uri);
  const httpsFallback = toHttps(fallback);
  const first = httpsUri || httpsFallback;
  const [src, setSrc] = useState<string | undefined>(first);
  const [stage, setStage] = useState<0 | 1>(0);
  const [loading, setLoading] = useState(Boolean(first));
  const [failed, setFailed] = useState(false);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSrc(httpsUri || httpsFallback);
    setStage(0);
    setLoading(Boolean(httpsUri || httpsFallback));
    setFailed(false);
  }, [httpsUri, httpsFallback]);

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

  const onError = () => {
    if (stage === 0 && httpsFallback && httpsFallback !== src) {
      setStage(1);
      setSrc(httpsFallback);
    } else {
      setFailed(true);
      setLoading(false);
    }
  };

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

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

      {(!src || failed) && (
        <Icon name="image" size={22} color={colors.textFaint} strokeWidth={1.75} />
      )}

      {loading && !failed ? (
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
