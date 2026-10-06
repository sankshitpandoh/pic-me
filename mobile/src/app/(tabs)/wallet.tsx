import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { RechargeSheet } from "../../components/wallet/RechargeSheet"; // DEVTEST
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../../components/AppText";
import { GlowBackground } from "../../components/GlowBackground";
import { ScreenState } from "../../components/ScreenState";
import { Celebration } from "../../components/wallet/Celebration";
import { copy } from "../../components/wallet/copy";
import { OfferCard } from "../../components/wallet/OfferCard";
import { PackCard } from "../../components/wallet/PackCard";
import { baseRate, gemTier, offerNormalPrice, perMessage, savingPct, sortedPacks } from "../../components/wallet/pricing";
import { usePurchase } from "../../components/wallet/usePurchase";
import { api, errorMessage, type Wallet } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt, t } from "../../lib/strings";
import { colors, gradients, radii, shadows, space, type, withAlpha } from "../../lib/theme";

const ON_GRADIENT = withAlpha(colors.textOnPrimary, 0.16);
const ON_GRADIENT_BORDER = withAlpha(colors.textOnPrimary, 0.22);

export default function WalletScreen() {
  const { wallet: summary, setWallet } = useAuth();
  const [data, setData] = useState<Wallet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const { buy, buyingId, error: buyError, clearError } = usePurchase(data);
  const devSheet = useLocalSearchParams<{ sheet?: string }>().sheet; // DEVTEST
  const [sheetOpen, setSheetOpen] = useState(Boolean(devSheet)); // DEVTEST

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const w = await api.wallet();
      setData(w);
      setWallet({ credits: w.credits, freeLeftToday: w.freeLeftToday, freePerDay: w.freePerDay, streak: w.streak });
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [setWallet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onBuy = useCallback(
    async (packId: string) => {
      const res = await buy(packId);
      if (!res) return;
      setCelebrate(res.credits);
      load(); // the offer disappears after the first purchase
    },
    [buy, load],
  );

  // Auto-hide purchase errors after a few seconds.
  useEffect(() => {
    if (!buyError) return;
    const id = setTimeout(clearError, 4000);
    return () => clearTimeout(id);
  }, [buyError, clearError]);

  const derived = useMemo(() => {
    if (!data) return null;
    const packs = sortedPacks(data);
    const rate = baseRate(packs);
    return {
      packs: packs.map((p, i) => ({
        pack: p,
        tier: gemTier(i, packs.length),
        perMessage: perMessage(p, data.creditsPerMessage),
        save: savingPct(p, rate),
      })),
      normal: data.offer ? offerNormalPrice(data.offer, rate) : null,
    };
  }, [data]);

  if (!data) {
    return (
      <View style={styles.root}>
        <GlowBackground />
        {loadError ? <ScreenState variant="error" message={loadError} onRetry={load} /> : <WalletSkeleton />}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GlowBackground />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <BalanceHero credits={summary.credits} streak={summary.streak} freeLeft={summary.freeLeftToday} freePerDay={summary.freePerDay} />

        {data.offer ? (
          <View style={styles.section}>
            <OfferCard
              offer={data.offer}
              normalPrice={derived?.normal ?? null}
              buying={buyingId === data.offer.id}
              disabled={buyingId != null}
              onBuy={onBuy}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <AppText variant="title3">{copy.packsTitle}</AppText>
            <AppText variant="micro" color="textMuted">
              {copy.neverExpire}
            </AppText>
          </View>
          <View style={styles.packs}>
            {derived?.packs.map((d) => (
              <PackCard
                key={d.pack.id}
                pack={d.pack}
                tier={d.tier}
                perMessage={d.perMessage}
                savePct={d.save}
                buying={buyingId === d.pack.id}
                disabled={buyingId != null}
                onBuy={onBuy}
              />
            ))}
          </View>
        </View>

        <HowItWorks />
        <TrustFooter />
      </ScrollView>

      {buyError ? (
        <View style={styles.toast} accessibilityLiveRegion="polite">
          <Ionicons name="information-circle" size={20} color={colors.accent} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {buyError}
          </AppText>
        </View>
      ) : null}

      <Celebration credits={celebrate} onDone={() => setCelebrate(null)} />
      {devSheet ? <RechargeSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} reason={devSheet as "photo"} /> /* DEVTEST */ : null}
    </View>
  );
}

// ───────────────────────────── balance hero ─────────────────────────────

/** Animates a displayed integer toward `target` (from 0 on first mount). */
function useCountUp(target: number) {
  const value = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(Math.round(v)));
    return () => value.removeListener(id);
  }, [value]);
  useEffect(() => {
    Animated.timing(value, { toValue: target, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [target, value]);
  return shown;
}

const BalanceHero = memo(function BalanceHero({ credits, streak, freeLeft, freePerDay }: { credits: number; streak: number; freeLeft: number; freePerDay: number }) {
  const shown = useCountUp(credits);
  const bump = useRef(new Animated.Value(1)).current;
  const prev = useRef(credits);
  useEffect(() => {
    if (credits > prev.current) {
      Animated.sequence([
        Animated.timing(bump, { toValue: 1.08, duration: 160, useNativeDriver: true }),
        Animated.spring(bump, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    prev.current = credits;
  }, [credits, bump]);

  return (
    <View style={[styles.heroShadow, shadows.glowPrimary]}>
      <LinearGradient {...gradients.primary} style={styles.hero}>
        <MaterialCommunityIcons name="diamond-stone" size={150} color={withAlpha(colors.textOnPrimary, 0.09)} style={styles.heroWatermark} />
        <AppText variant="overline" color="textOnPrimary" style={styles.heroOverline}>
          {copy.overline}
        </AppText>
        <Animated.View style={[styles.balanceRow, { transform: [{ scale: bump }] }]} accessible accessibilityLabel={`${credits} 💎`}>
          <View style={styles.gemCircle}>
            <MaterialCommunityIcons name="diamond-stone" size={30} color={colors.accent} />
          </View>
          <AppText style={styles.balance} color="textOnPrimary">
            {shown}
          </AppText>
        </Animated.View>
        <View style={styles.heroChips}>
          <HeroChip label={fmt(copy.streakChip, { n: streak })} />
          <HeroChip label={fmt(copy.freeChip, { left: freeLeft, total: freePerDay })} />
          <HeroChip label={t.wallet.rate} />
        </View>
      </LinearGradient>
    </View>
  );
});

function HeroChip({ label }: { label: string }) {
  return (
    <View style={styles.heroChip}>
      <AppText variant="caption" color="textOnPrimary" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

// ───────────────────────────── explainer + trust ─────────────────────────────

const HowItWorks = memo(function HowItWorks() {
  return (
    <View style={styles.section}>
      <AppText variant="title3" style={styles.sectionTitle}>
        {copy.howTitle}
      </AppText>
      <View style={styles.howGrid}>
        {copy.how.map((h) => (
          <View key={h.text} style={styles.howItem}>
            <View style={styles.howIcon}>
              <Ionicons name={h.icon} size={16} color={colors.primary} />
            </View>
            <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {h.text}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
});

const TrustFooter = memo(function TrustFooter() {
  return (
    <View style={styles.trust}>
      <View style={styles.upiRow}>
        {copy.upi.map((u) => (
          <View key={u} style={styles.upiPill}>
            <AppText variant="micro" color="textSecondary">
              {u}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.trustCard}>
        <View style={styles.trustIcon}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{copy.trustTitle}</AppText>
          <View style={styles.trustLine}>
            <Ionicons name="lock-closed" size={12} color={colors.textMuted} style={styles.trustLineIcon} />
            <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {t.wallet.footnote}
            </AppText>
          </View>
          <View style={styles.trustLine}>
            <Ionicons name="eye-off-outline" size={12} color={colors.textMuted} style={styles.trustLineIcon} />
            <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {copy.bankName}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
});

// ───────────────────────────── loading skeleton ─────────────────────────────

function WalletSkeleton() {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.content, { opacity: pulse }]} accessibilityRole="progressbar" accessibilityLabel={t.common.loading}>
      <View style={[styles.skBlock, { height: 196, borderRadius: radii.xxl }]} />
      <View style={[styles.skBlock, { height: 150, borderRadius: radii.xl, marginTop: space.xl }]} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.skBlock, { height: 84, borderRadius: radii.lg, marginTop: space.md }]} />
      ))}
    </Animated.View>
  );
}

// ───────────────────────────── styles ─────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: space.huge },
  heroShadow: { borderRadius: radii.xxl },
  hero: { borderRadius: radii.xxl, padding: space.xl, paddingBottom: space.lg, overflow: "hidden" },
  heroWatermark: { position: "absolute", right: -28, top: -18, transform: [{ rotate: "-14deg" }] },
  heroOverline: { opacity: 0.85 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm, alignSelf: "flex-start" },
  gemCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: withAlpha(colors.bg, 0.35),
    borderWidth: 1,
    borderColor: ON_GRADIENT_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  balance: { ...type.hero, fontSize: 60, lineHeight: 68, fontVariant: ["tabular-nums"] },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs + 2, marginTop: space.md },
  heroChip: {
    height: 28,
    paddingHorizontal: space.sm + 2,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: ON_GRADIENT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ON_GRADIENT_BORDER,
  },
  section: { marginTop: space.xxl },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: space.md },
  sectionTitle: { marginBottom: space.md },
  packs: { gap: space.md },
  howGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: space.md,
    rowGap: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItem: { width: "50%", flexDirection: "row", alignItems: "center", gap: space.sm, paddingRight: space.sm },
  howIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trust: { marginTop: space.xxl, alignItems: "center", gap: space.sm },
  upiRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap", justifyContent: "center", marginBottom: space.xs },
  upiPill: {
    height: 26,
    paddingHorizontal: space.md,
    borderRadius: radii.xs,
    justifyContent: "center",
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  trustCard: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trustIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trustLine: { flexDirection: "row", alignItems: "flex-start", gap: space.xs + 2 },
  trustLineIcon: { marginTop: 3 },
  toast: {
    position: "absolute",
    left: space.gutter,
    right: space.gutter,
    bottom: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.elevated2,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  skBlock: { backgroundColor: colors.elevated },
});
