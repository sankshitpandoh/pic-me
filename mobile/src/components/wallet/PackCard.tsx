import { memo } from "react";
import { StyleSheet, View } from "react-native";
import type { Pack } from "../../lib/api";
import { fmt, t } from "../../lib/strings";
import { colors, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { PressableScale } from "../PressableScale";
import { copy } from "./copy";
import { GemStack } from "./GemStack";
import { PricePill } from "./PricePill";

export type PackCardProps = {
  pack: Pack;
  tier: 1 | 2 | 3;
  perMessage: string;
  savePct: number;
  buying: boolean;
  disabled: boolean;
  onBuy: (packId: string) => void;
  /** Tighter layout for the RechargeSheet. */
  compact?: boolean;
};

/** One recharge pack: gem tile · credits + value · gradient price pill. Popular / best get extra emphasis. */
export const PackCard = memo(function PackCard({ pack, tier, perMessage, savePct, buying, disabled, onBuy, compact = false }: PackCardProps) {
  const popular = pack.badge === "popular";
  const best = pack.badge === "best";
  const showLabel = !popular && !best;

  return (
    <PressableScale
      onPress={() => onBuy(pack.id)}
      disabled={disabled}
      haptics
      accessibilityRole="button"
      accessibilityLabel={`₹${pack.priceInr} mein ${pack.credits} 💎, ${fmt(t.wallet.approx, { n: pack.approxMessages })}`}
      accessibilityState={{ busy: buying, disabled }}
      style={[styles.card, compact && styles.cardCompact, popular && styles.popular, best && styles.best, popular && !compact && styles.withRibbon]}
    >
      {popular && !compact ? (
        <View style={styles.ribbon}>
          <AppText variant="micro" color="textOnPrimary">
            {t.wallet.popular}
          </AppText>
        </View>
      ) : null}
      <GemStack tier={tier} size={compact ? 44 : 56} highlight={popular || best} />
      <View style={styles.mid}>
        {showLabel ? (
          <AppText variant="overline" color="textMuted" numberOfLines={1}>
            {pack.label}
          </AppText>
        ) : best ? (
          <View style={styles.badges}>
            <View style={styles.bestBadge}>
              <AppText variant="micro" color="accentText">
                {t.wallet.best}
              </AppText>
            </View>
            {savePct > 0 ? (
              <View style={styles.saveBadge}>
                <AppText variant="micro" color="textOnAccent">
                  {fmt(copy.save, { n: savePct })}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.badges}>
            {compact ? (
              <View style={styles.popularBadge}>
                <AppText variant="micro" color="textOnPrimary">
                  {t.wallet.popular}
                </AppText>
              </View>
            ) : null}
            {savePct > 0 ? (
              <AppText variant="overline" color="primary" numberOfLines={1}>
                {fmt(copy.save, { n: savePct })}
              </AppText>
            ) : null}
          </View>
        )}
        <AppText variant={compact ? "title3" : "title2"}>{pack.credits} 💎</AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {fmt(t.wallet.approx, { n: pack.approxMessages })}
          <AppText variant="caption" color="textMuted">
            {"  ·  "}
            {fmt(copy.perMessage, { x: perMessage })}
          </AppText>
        </AppText>
      </View>
      <PricePill price={pack.priceInr} loading={buying} size={compact ? "sm" : "md"} />
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    paddingRight: space.md,
    minHeight: 84,
    borderRadius: radii.lg,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompact: { minHeight: 68, paddingVertical: space.sm + 2 },
  withRibbon: { marginTop: space.sm },
  popular: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderWidth: 1.5 },
  best: { borderColor: colors.accentBorder },
  ribbon: {
    position: "absolute",
    top: -11,
    left: space.lg,
    paddingHorizontal: space.sm + 2,
    height: 22,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  popularBadge: {
    paddingHorizontal: space.sm,
    height: 20,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  mid: { flex: 1, gap: 1 },
  badges: { flexDirection: "row", alignItems: "center", gap: space.xs, marginBottom: 2 },
  bestBadge: {
    paddingHorizontal: space.sm,
    height: 20,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  saveBadge: {
    paddingHorizontal: space.sm,
    height: 20,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
});
