import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { api, errorMessage, type Wallet, type WalletSummary } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmt, t } from "../../lib/strings";
import { colors, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { BottomSheet } from "../BottomSheet";
import { GradientButton } from "../GradientButton";
import { PressableScale } from "../PressableScale";
import { Celebration } from "./Celebration";
import { copy } from "./copy";
import { OfferCard } from "./OfferCard";
import { PackCard } from "./PackCard";
import { baseRate, gemTier, offerNormalPrice, perMessage, savingPct, sortedPacks } from "./pricing";
import { usePurchase } from "./usePurchase";

export type RechargeReason = "out_of_credits" | "low_balance" | "photo";

export type RechargeSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the new wallet right after a successful purchase (the auth wallet is already updated). */
  onRecharged?: (wallet: WalletSummary) => void;
  /** Picks the headline. Default "out_of_credits". */
  reason?: RechargeReason;
};

/**
 * In-context recharge: contextual headline, the first-recharge offer (if eligible) and compact packs.
 * Runs the same purchase flow as the Recharge tab; celebrates briefly, then closes.
 */
export function RechargeSheet({ visible, onClose, onRecharged, reason = "out_of_credits" }: RechargeSheetProps) {
  const { credits } = useAuth();
  const [wallet, setData] = useState<Wallet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const { buy, buyingId, error, clearError } = usePurchase(wallet);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await api.wallet());
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (visible) {
      clearError();
      setCelebrate(null);
      load();
    }
  }, [visible, load, clearError]);

  const onBuy = useCallback(
    async (packId: string) => {
      const res = await buy(packId);
      if (!res) return;
      onRecharged?.(res.wallet);
      setCelebrate(res.credits);
    },
    [buy, onRecharged],
  );

  const derived = useMemo(() => {
    if (!wallet) return null;
    const packs = sortedPacks(wallet);
    const rate = baseRate(packs);
    return {
      packs: packs.map((p, i) => ({
        pack: p,
        tier: gemTier(i, packs.length),
        perMessage: perMessage(p, wallet.creditsPerMessage),
        save: savingPct(p, rate),
      })),
      normal: wallet.offer ? offerNormalPrice(wallet.offer, rate) : null,
    };
  }, [wallet]);

  const head = copy.sheet[reason];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.emojiTile}>
              <AppText style={styles.emoji}>{head.emoji}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="title2">{head.title}</AppText>
              <AppText variant="body" color="textSecondary">
                {head.sub}
              </AppText>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <View style={styles.balancePill}>
              <AppText variant="caption" color="accentText">
                {fmt(copy.sheetBalance, { n: credits })}
              </AppText>
            </View>
            <AppText variant="micro" color="textMuted">
              {t.wallet.rate}
            </AppText>
          </View>

          {!wallet && !loadError ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}
          {loadError && !wallet ? (
            <View style={styles.loading}>
              <AppText variant="body" color="textSecondary" align="center">
                {loadError}
              </AppText>
              <GradientButton title={t.common.retry} onPress={load} size="sm" style={{ alignSelf: "center" }} />
            </View>
          ) : null}

          {wallet && derived ? (
            <View style={styles.list}>
              {wallet.offer ? (
                <OfferCard
                  offer={wallet.offer}
                  normalPrice={derived.normal}
                  buying={buyingId === wallet.offer.id}
                  disabled={buyingId != null}
                  onBuy={onBuy}
                  compact
                />
              ) : null}
              {derived.packs.map((d) => (
                <PackCard
                  key={d.pack.id}
                  pack={d.pack}
                  tier={d.tier}
                  perMessage={d.perMessage}
                  savePct={d.save}
                  buying={buyingId === d.pack.id}
                  disabled={buyingId != null}
                  onBuy={onBuy}
                  compact
                />
              ))}
            </View>
          ) : null}

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <AppText variant="caption" color="text" style={{ flex: 1 }}>
                {error}
              </AppText>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
            <AppText variant="micro" color="textMuted">
              {t.wallet.footnote}
            </AppText>
          </View>
          <PressableScale
            onPress={() => {
              onClose();
              router.navigate("/wallet");
            }}
            accessibilityRole="link"
            style={styles.more}
          >
            <AppText variant="caption" color="primary">
              {copy.sheetMore} →
            </AppText>
          </PressableScale>
        </ScrollView>
        <Celebration
          credits={celebrate}
          duration={1500}
          style={styles.celebrate}
          onDone={() => {
            setCelebrate(null);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Bleed the scroll area into the sheet's side padding so the offer card's glow isn't clipped.
  scroll: { marginHorizontal: -space.md },
  content: { paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: space.xs },
  celebrate: { top: -space.xxl, bottom: -space.xxxl, left: -space.gutter, right: -space.gutter, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  emojiTile: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 26, lineHeight: 32 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md, flexWrap: "wrap" },
  balancePill: {
    height: 24,
    paddingHorizontal: space.sm + 2,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },
  loading: { minHeight: 200, alignItems: "center", justifyContent: "center", gap: space.md },
  list: { gap: space.sm + 2, marginTop: space.lg },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, marginTop: space.lg },
  more: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: space.lg },
});
