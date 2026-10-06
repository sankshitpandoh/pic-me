import { Text, type TextProps } from "react-native";
import { colors, type, type ColorName, type TypeVariant } from "../lib/theme";

export type AppTextProps = TextProps & {
  /** Type-scale entry from `theme.type`. Default "body". */
  variant?: TypeVariant;
  /** Key of `theme.colors`. Default "text". */
  color?: ColorName;
  align?: "left" | "center" | "right";
};

/**
 * The only text component screens should use: `<AppText variant="title2" color="textMuted">Hi</AppText>`.
 * Caps font scaling at 1.4× by default so big system font sizes don't break layouts.
 */
export function AppText({ variant = "body", color = "text", align, style, maxFontSizeMultiplier = 1.4, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[type[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
