import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View, type TextStyle } from "react-native";
import { t } from "../../lib/strings";
import { colors, fonts, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { copy } from "./copy";

export type Dob = { day: string; month: string; year: string };
export const EMPTY_DOB: Dob = { day: "", month: "", year: "" };

export type DobCheck =
  | { status: "incomplete" }
  | { status: "invalid"; message: string }
  | { status: "ok"; iso: string };

const MIN_AGE = 18;

/** On-device check mirroring the server: real calendar date, plausible year, 18+. */
export function checkDob({ day, month, year }: Dob, today = new Date()): DobCheck {
  if (!day || !month || year.length !== 4) return { status: "incomplete" };
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(Date.UTC(y, m - 1, d));
  const real = m >= 1 && m <= 12 && d >= 1 && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (!real || y < 1900 || date.getTime() > today.getTime()) return { status: "invalid", message: t.errors.invalid_dob };
  let age = today.getFullYear() - y;
  if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age--;
  if (age < MIN_AGE) return { status: "invalid", message: t.errors.underage };
  return { status: "ok", iso: `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

type Field = keyof Dob;
const FIELDS: { key: Field; label: string; placeholder: string; len: number; flex: number }[] = [
  { key: "day", label: copy.dobDay, placeholder: "DD", len: 2, flex: 1 },
  { key: "month", label: copy.dobMonth, placeholder: "MM", len: 2, flex: 1 },
  { key: "year", label: copy.dobYear, placeholder: "YYYY", len: 4, flex: 1.5 },
];

export type DobInputProps = {
  value: Dob;
  onChange: (dob: Dob) => void;
  invalid?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  onSubmit?: () => void;
};

export type DobInputHandle = { focus: () => void };

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

/** DD / MM / YYYY boxes with labels; focus auto-advances when a part fills and backspace on an empty part steps back. */
export const DobInput = forwardRef<DobInputHandle, DobInputProps>(function DobInput(
  { value, onChange, invalid = false, autoFocus, editable = true, onSubmit },
  ref,
) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [focused, setFocused] = useState<Field | null>(null);
  useImperativeHandle(ref, () => ({ focus: () => refs.current[0]?.focus() }), []);

  const setPart = (i: number, raw: string) => {
    const f = FIELDS[i];
    const digits = raw.replace(/\D/g, "").slice(0, f.len);
    onChange({ ...value, [f.key]: digits });
    if (digits.length === f.len && i < FIELDS.length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <View style={styles.row}>
      {FIELDS.map((f, i) => {
        const isFocused = focused === f.key;
        const filled = value[f.key].length === f.len;
        return (
          <View key={f.key} style={[styles.col, { flex: f.flex }]}>
            <AppText variant="overline" color={isFocused ? "primary" : "textMuted"} style={styles.label}>
              {f.label}
            </AppText>
            <TextInput
              ref={(n) => {
                refs.current[i] = n;
              }}
              value={value[f.key]}
              onChangeText={(s) => setPart(i, s)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && value[f.key] === "" && i > 0) refs.current[i - 1]?.focus();
              }}
              onFocus={() => setFocused(f.key)}
              onBlur={() => setFocused((cur) => (cur === f.key ? null : cur))}
              onSubmitEditing={i === FIELDS.length - 1 ? onSubmit : () => refs.current[i + 1]?.focus()}
              placeholder={f.placeholder}
              placeholderTextColor={colors.textDisabled}
              keyboardType="number-pad"
              returnKeyType={i === FIELDS.length - 1 ? "done" : "next"}
              maxLength={f.len}
              autoFocus={autoFocus && i === 0}
              editable={editable}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              accessibilityLabel={`${t.login.dobLabel} ${f.label}`}
              maxFontSizeMultiplier={1.3}
              style={[
                styles.box,
                filled && styles.boxFilled,
                isFocused && styles.boxActive,
                invalid && styles.boxInvalid,
                webNoOutline,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm + 2 },
  col: { minWidth: 0 },
  label: { marginBottom: space.xs + 2, marginLeft: space.xxs },
  box: {
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 22,
    textAlign: "center",
    paddingHorizontal: space.sm,
    letterSpacing: 1,
  },
  boxFilled: { backgroundColor: colors.primarySoft, borderColor: "transparent" },
  boxActive: { borderColor: colors.primary, backgroundColor: colors.elevated2 },
  boxInvalid: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
});
