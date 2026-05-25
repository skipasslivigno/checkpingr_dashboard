import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = "100%", height = 20, borderRadius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: colors.muted, opacity },
        style,
      ]}
    />
  );
}

export function StatCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton height={28} width={80} borderRadius={6} />
      <Skeleton height={12} width={60} borderRadius={4} style={{ marginTop: 6 }} />
    </View>
  );
}

export function LiftRowSkeleton() {
  return (
    <View style={styles.rowSkeleton}>
      <Skeleton height={8} width={8} borderRadius={4} />
      <View style={styles.rowInfo}>
        <Skeleton height={14} width="60%" borderRadius={4} />
        <Skeleton height={12} width="40%" borderRadius={4} style={{ marginTop: 4 }} />
      </View>
      <Skeleton height={16} width={40} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    minHeight: 88,
    justifyContent: "center",
    gap: 6,
  },
  rowSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    backgroundColor: "transparent",
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
});
