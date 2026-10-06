import { useRef } from "react";
import { Animated, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { haptic } from "../lib/haptics";
import { motion } from "../lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Default `motion.pressScale` (0.97). */
  scaleTo?: number;
  /** Fire a selection haptic on press. Default false. */
  haptics?: boolean;
};

/** A Pressable that gently shrinks while pressed (native-driver animation). Use for cards, rows and custom buttons. */
export function PressableScale({ style, scaleTo = motion.pressScale, haptics = false, onPressIn, onPressOut, onPress, disabled, ...rest }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) =>
    Animated.timing(scale, { toValue, duration: motion.instant, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        animateTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptics) haptic.select();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
