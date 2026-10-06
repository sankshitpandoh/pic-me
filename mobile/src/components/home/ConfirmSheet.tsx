import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { t } from "../../lib/strings";
import { colors, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { BottomSheet } from "../BottomSheet";
import { GradientButton } from "../GradientButton";
import { PressableScale } from "../PressableScale";

export type ConfirmSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  confirmLabel: string;
  /** Danger = solid red confirm button + red icon. */
  danger?: boolean;
  loading?: boolean;
  error?: string | null;
};

/** Web-safe confirmation dialog (Alert.alert does not render on web). */
export function ConfirmSheet({ visible, onClose, onConfirm, icon, title, body, confirmLabel, danger, loading, error }: ConfirmSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={loading ? () => {} : onClose}>
      <View style={styles.wrap}>
        <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
          <Ionicons name={icon} size={30} color={danger ? colors.danger : colors.primary} />
        </View>
        <AppText variant="title2" align="center">
          {title}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {body}
        </AppText>
        {error ? (
          <AppText variant="caption" color="danger" align="center">
            {error}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          {danger ? (
            <PressableScale
              onPress={onConfirm}
              disabled={loading}
              haptics
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ busy: loading }}
              style={styles.danger}
            >
              {loading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <AppText variant="button" color="textOnPrimary">
                  {confirmLabel}
                </AppText>
              )}
            </PressableScale>
          ) : (
            <GradientButton title={confirmLabel} onPress={onConfirm} loading={loading} />
          )}
          <PressableScale
            onPress={onClose}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
            style={styles.cancel}
          >
            <AppText variant="button" color="textSecondary">
              {t.common.cancel}
            </AppText>
          </PressableScale>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "stretch", gap: space.md, paddingTop: space.xs },
  icon: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  actions: { gap: space.sm, marginTop: space.md },
  danger: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    height: 50,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
