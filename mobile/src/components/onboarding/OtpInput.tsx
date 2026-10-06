import { forwardRef, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, TextInput, View, type TextStyle } from "react-native";
import { colors, fonts, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { copy } from "./copy";

export const OTP_LENGTH = 6;
const SLOTS = Array.from({ length: OTP_LENGTH }, (_, i) => i);

export type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  /** Fired once when the 6th digit lands. */
  onComplete?: (code: string) => void;
  invalid?: boolean;
  /** Bump to play a short shake (e.g. after a wrong code). */
  shakeKey?: number;
  editable?: boolean;
  autoFocus?: boolean;
};

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

/** Six 48×56 boxes driven by one hidden TextInput (keeps SMS autofill + paste working). */
export const OtpInput = forwardRef<TextInput, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, invalid = false, shakeKey = 0, editable = true, autoFocus },
  ref,
) {
  const inner = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const caret = useRef(new Animated.Value(1)).current;

  const setRefs = (node: TextInput | null) => {
    inner.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    if (!shakeKey) return;
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 3, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 55, useNativeDriver: true }),
      ),
    ).start();
  }, [shakeKey, shake]);

  useEffect(() => {
    if (!focused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, { toValue: 0, duration: 450, delay: 300, useNativeDriver: true }),
        Animated.timing(caret, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [focused, caret]);

  const handleChange = (s: string) => {
    const code = s.replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(code);
    if (code.length === OTP_LENGTH && value.length !== OTP_LENGTH) onComplete?.(code);
  };

  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <Animated.View style={{ transform: [{ translateX: shake }] }}>
      <Pressable
        onPress={() => inner.current?.focus()}
        accessible={false}
        style={styles.row}
      >
        {SLOTS.map((i) => {
          const digit = value[i] ?? "";
          const isActive = focused && editable && i === activeIndex;
          return (
            <View
              key={i}
              style={[
                styles.box,
                digit ? styles.boxFilled : null,
                isActive ? styles.boxActive : null,
                invalid ? styles.boxInvalid : null,
              ]}
            >
              {digit ? (
                <AppText style={styles.digit} allowFontScaling={false}>
                  {digit}
                </AppText>
              ) : isActive ? (
                <Animated.View style={[styles.caret, { opacity: caret }]} />
              ) : null}
            </View>
          );
        })}
        <TextInput
          ref={setRefs}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={OTP_LENGTH}
          autoFocus={autoFocus}
          editable={editable}
          caretHidden
          contextMenuHidden={false}
          selectionColor="transparent"
          accessibilityLabel={copy.otpA11y}
          style={[styles.hidden, webNoOutline]}
        />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.elevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: { backgroundColor: colors.primarySoft, borderColor: "transparent" },
  boxActive: { borderColor: colors.primary, backgroundColor: colors.elevated2 },
  boxInvalid: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  digit: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.text, includeFontPadding: false },
  caret: { width: 2, height: 24, borderRadius: 1, backgroundColor: colors.primary },
  hidden: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.011,
    color: "transparent",
    fontSize: 1,
  },
});
