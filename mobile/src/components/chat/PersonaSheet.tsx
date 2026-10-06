import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { PersonaDetail } from "../../lib/api";
import { fmt } from "../../lib/strings";
import { colors, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { BottomSheet } from "../BottomSheet";
import { Chip } from "../Chip";
import { chatCopy } from "./copy";

/** Small "about her" sheet opened from the header: tagline, tags, AI note, and "Chat clear karo". */
export function PersonaSheet({
  persona,
  visible,
  onClose,
  onClear,
}: {
  persona: PersonaDetail;
  visible: boolean;
  onClose: () => void;
  onClear: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible) setConfirm(false);
  }, [visible]);

  const clear = async () => {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    try {
      await onClear();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Avatar id={persona.id} name={persona.name} uri={persona.avatarUrl} accent={persona.accent} size={72} ring online gapColor={colors.surface} />
        <View style={styles.headText}>
          <AppText variant="title1">{persona.name}</AppText>
          <AppText variant="caption" color="textSecondary">
            {fmt(chatCopy.info.ageCity, { age: persona.age, city: persona.city })}
          </AppText>
          {persona.languages.length ? (
            <AppText variant="micro" color="textMuted">
              {fmt(chatCopy.info.speaks, { langs: persona.languages.join(", ") })}
            </AppText>
          ) : null}
        </View>
      </View>

      <AppText variant="bodyLg" color="textSecondary" style={styles.tagline}>
        {persona.tagline}
      </AppText>

      {persona.tags.length ? (
        <View style={styles.tags}>
          {persona.tags.map((tag) => (
            <Chip key={tag} label={tag} tone="primary" />
          ))}
        </View>
      ) : null}

      <View style={styles.note}>
        <Ionicons name="sparkles" size={14} color={colors.textMuted} />
        <AppText variant="micro" color="textMuted" style={styles.flex}>
          {fmt(chatCopy.info.aiNote, { name: persona.name })}
        </AppText>
      </View>

      <Pressable
        onPress={clear}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={confirm ? chatCopy.info.clearYes : chatCopy.info.clear}
        style={({ pressed }) => [styles.clear, confirm && styles.clearConfirm, pressed && styles.pressed]}
      >
        {busy ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <AppText variant="button" color="danger">
              {confirm ? chatCopy.info.clearYes : chatCopy.info.clear}
            </AppText>
          </>
        )}
      </Pressable>
      {confirm ? (
        <AppText variant="micro" color="textMuted" align="center" style={styles.confirmHint}>
          {chatCopy.info.clearConfirm}
        </AppText>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.lg, marginBottom: space.md },
  headText: { flex: 1, gap: 2 },
  tagline: { marginBottom: space.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg },
  note: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.elevated,
    marginBottom: space.lg,
  },
  flex: { flex: 1 },
  clear: {
    height: 50,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  clearConfirm: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  pressed: { opacity: 0.8 },
  confirmHint: { marginTop: space.sm },
});
