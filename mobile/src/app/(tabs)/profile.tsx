import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { memo, useCallback, useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../../components/AppText";
import { CreditsPill } from "../../components/CreditsPill";
import { GlowBackground } from "../../components/GlowBackground";
import { ConfirmSheet } from "../../components/home/ConfirmSheet";
import { HOME_GLOW, homeCopy, maskPhone } from "../../components/home/copy";
import { api, errorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { haptic } from "../../lib/haptics";
import { fmt, t } from "../../lib/strings";
import { colors, gradients, palette, radii, space, withAlpha } from "../../lib/theme";

type Confirm = "chats" | "logout" | "delete" | null;
type IconName = keyof typeof Ionicons.glyphMap;

const VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function ProfileScreen() {
  const { user, wallet, refreshWallet, signOut } = useAuth();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshWallet();
    }, [refreshWallet]),
  );

  const ask = (c: Confirm) => {
    setSheetError(null);
    setConfirm(c);
  };
  const closeSheet = () => {
    if (!busy) setConfirm(null);
  };

  const run = async () => {
    setBusy(true);
    setSheetError(null);
    try {
      if (confirm === "chats") {
        const personas = await api.personas();
        const withChats = personas.filter((p) => p.lastMessage);
        await Promise.all(withChats.map((p) => api.clearChat(p.id)));
        haptic.success();
        setNotice(withChats.length ? homeCopy.chatsDeleted : homeCopy.confirmChatsNone);
        setConfirm(null);
      } else if (confirm === "logout") {
        setConfirm(null);
        await signOut();
      } else if (confirm === "delete") {
        await api.deleteMe();
        setConfirm(null);
        await signOut();
      }
    } catch (err) {
      haptic.error();
      setSheetError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const freeTotal = wallet.freePerDay;

  return (
    <View style={styles.root}>
      <GlowBackground colors={HOME_GLOW} height={300} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── identity + stats card ── */}
        <LinearGradient
          colors={[withAlpha(palette.rose500, 0.22), withAlpha(palette.violet600, 0.14), colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.idRow}>
            <LinearGradient {...gradients.primary} style={styles.userAvatar}>
              <Ionicons name="person" size={30} color={colors.textOnPrimary} />
            </LinearGradient>
            <View style={styles.flex}>
              <AppText variant="micro" color="textMuted">
                {homeCopy.phoneLabel}
              </AppText>
              <AppText variant="title2" style={styles.phone}>
                {maskPhone(user?.phone)}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {homeCopy.member}
              </AppText>
            </View>
          </View>
          <View style={styles.stats}>
            <Stat
              label={homeCopy.streakTile}
              value={fmt(homeCopy.streakDays, { n: wallet.streak })}
              icon={<MaterialCommunityIcons name="fire" size={20} color="#FF9A4D" />}
            />
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <CreditsPill onPress={() => router.navigate("/wallet")} />
              <AppText variant="micro" color="textMuted">
                {homeCopy.creditsTile}
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <Stat
              label={homeCopy.freeTile}
              value={`${wallet.freeLeftToday}/${freeTotal}`}
              icon={<Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />}
            />
          </View>
        </LinearGradient>

        {notice ? (
          <Pressable onPress={() => setNotice(null)} style={styles.notice} accessibilityRole="button" accessibilityLabel={notice}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText variant="caption" color="text" style={styles.flex}>
              {notice}
            </AppText>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <Section title={homeCopy.sectionWallet}>
          <Row
            icon="diamond"
            iconColor={colors.accent}
            iconBg={colors.accentSoft}
            label={homeCopy.recharge}
            sub={homeCopy.rechargeSub}
            onPress={() => router.navigate("/wallet")}
          />
        </Section>

        <Section title={homeCopy.sectionPrivacy}>
          <View style={styles.privacy}>
            <View style={[styles.rowIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="lock-closed" size={18} color={colors.success} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{homeCopy.privacyTitle}</AppText>
              <AppText variant="caption" color="textSecondary">
                {t.profile.privacy}
              </AppText>
            </View>
          </View>
        </Section>

        <Section title={homeCopy.sectionAccount}>
          <Row icon="trash-outline" label={t.profile.deleteChats} sub={homeCopy.deleteChatsSub} onPress={() => ask("chats")} />
          <Row icon="log-out-outline" label={t.profile.logout} sub={homeCopy.logoutSub} onPress={() => ask("logout")} />
          <Row
            icon="warning-outline"
            iconColor={colors.danger}
            iconBg={colors.dangerSoft}
            label={t.profile.deleteAccount}
            labelColor="danger"
            sub={homeCopy.deleteAccountSub}
            onPress={() => ask("delete")}
          />
        </Section>

        <Section title={homeCopy.sectionHelp}>
          <Row
            icon="help-buoy-outline"
            label={homeCopy.help}
            sub={homeCopy.helpEmail}
            onPress={() => Linking.openURL(`mailto:${homeCopy.helpEmail}`).catch(() => {})}
          />
          <Row icon="information-circle-outline" label={homeCopy.version} value={VERSION} />
        </Section>

        <AppText variant="micro" color="textDisabled" align="center" style={styles.footer}>
          {t.brand} · Made with 💖 in India
        </AppText>
      </ScrollView>

      <ConfirmSheet
        visible={confirm === "chats"}
        onClose={closeSheet}
        onConfirm={run}
        icon="trash-outline"
        title={homeCopy.confirmChatsTitle}
        body={homeCopy.confirmChatsBody}
        confirmLabel={homeCopy.confirmChatsCta}
        danger
        loading={busy}
        error={sheetError}
      />
      <ConfirmSheet
        visible={confirm === "logout"}
        onClose={closeSheet}
        onConfirm={run}
        icon="log-out-outline"
        title={homeCopy.confirmLogoutTitle}
        body={homeCopy.confirmLogoutBody}
        confirmLabel={homeCopy.confirmLogoutCta}
        loading={busy}
        error={sheetError}
      />
      <ConfirmSheet
        visible={confirm === "delete"}
        onClose={closeSheet}
        onConfirm={run}
        icon="warning"
        title={homeCopy.confirmDeleteTitle}
        body={homeCopy.confirmDeleteBody}
        confirmLabel={homeCopy.confirmDeleteCta}
        danger
        loading={busy}
        error={sheetError}
      />
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.statValue}>
        {icon}
        <AppText variant="number" style={styles.statNum}>
          {value}
        </AppText>
      </View>
      <AppText variant="micro" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" color="textMuted" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

type RowProps = {
  icon: IconName;
  label: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  iconColor?: string;
  iconBg?: string;
  labelColor?: "text" | "danger";
};

const Row = memo(function Row({ icon, label, sub, value, onPress, iconColor = colors.textSecondary, iconBg = colors.elevated2, labelColor = "text" }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{ color: colors.elevated2 }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={labelColor}>
          {label}
        </AppText>
        {sub ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" color="textMuted">
          {value}
        </AppText>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.gutter, paddingTop: space.sm, paddingBottom: space.huge, gap: space.xl },
  flex: { flex: 1 },
  card: {
    borderRadius: radii.xl,
    padding: space.lg + 2,
    gap: space.lg + 2,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  idRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  userAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  phone: { letterSpacing: 0.5 },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: withAlpha(palette.plum950, 0.45),
    borderRadius: radii.lg,
    paddingVertical: space.md,
  },
  stat: { flex: 1, alignItems: "center", gap: space.xs + 2 },
  statValue: { flexDirection: "row", alignItems: "center", gap: space.xs, height: 32 },
  statNum: { fontSize: 17, lineHeight: 22, color: colors.text },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.borderStrong },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.successSoft,
  },
  section: { gap: space.sm },
  sectionTitle: { paddingHorizontal: space.xs },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowPressed: { backgroundColor: colors.elevated },
  rowIcon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  privacy: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  footer: { marginTop: space.sm },
});
