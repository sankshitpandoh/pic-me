import { forwardRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View, type TextStyle } from "react-native";
import { t } from "../../lib/strings";
import { colors, fonts, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { copy } from "./copy";

/** "9876543210" → "98765 43210" (partial input formats as you type). */
export function formatPhone(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

/** Keeps the 10 local digits, dropping a pasted/autofilled "+91" or leading 0. */
export function cleanPhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length > 10) d = d.replace(/^(91|0)/, "");
  return d.slice(0, 10);
}

export type PhoneInputProps = {
  /** 10-digit local number (digits only). */
  value: string;
  onChangeDigits: (digits: string) => void;
  onSubmit?: () => void;
  invalid?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
};

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

/** 56px phone field with a "🇮🇳 +91" prefix, divider and live "98765 43210" formatting. */
export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(function PhoneInput(
  { value, onChangeDigits, onSubmit, invalid = false, autoFocus, editable = true },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const borderColor = invalid ? colors.danger : focused ? colors.primaryBorder : colors.border;

  return (
    <View style={[styles.box, { borderColor }, focused && !invalid && styles.focusRing]}>
      <View style={styles.prefix}>
        <AppText style={styles.flag} allowFontScaling={false}>
          🇮🇳
        </AppText>
        <AppText variant="bodyStrong" color="text" style={styles.code}>
          {copy.countryCode}
        </AppText>
      </View>
      <View style={styles.divider} />
      <TextInput
        ref={ref}
        value={formatPhone(value)}
        onChangeText={(s) => onChangeDigits(cleanPhone(s))}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t.login.phonePlaceholder}
        placeholderTextColor={colors.textDisabled}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        autoFocus={autoFocus}
        editable={editable}
        maxLength={16}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        accessibilityLabel={copy.phoneA11y}
        maxFontSizeMultiplier={1.3}
        style={[styles.input, webNoOutline]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingLeft: space.lg,
  },
  focusRing: {
    backgroundColor: colors.elevated2,
  },
  prefix: { flexDirection: "row", alignItems: "center", gap: space.xs + 2 },
  flag: { fontSize: 18, lineHeight: 22 },
  code: { fontSize: 17, lineHeight: 22 },
  divider: { width: 1, height: 24, backgroundColor: colors.borderStrong, marginHorizontal: space.md },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    paddingRight: space.lg,
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 19,
    letterSpacing: 1,
  },
});
