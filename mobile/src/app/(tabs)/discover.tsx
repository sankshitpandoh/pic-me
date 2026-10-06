import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View, type ListRenderItem } from "react-native";
import { AppText } from "../../components/AppText";
import { Chip } from "../../components/Chip";
import { GlowBackground } from "../../components/GlowBackground";
import { ScreenState } from "../../components/ScreenState";
import { HOME_GLOW, homeCopy } from "../../components/home/copy";
import { PersonaCard } from "../../components/home/PersonaCard";
import { PersonaProfileSheet } from "../../components/home/PersonaProfileSheet";
import { usePersonas } from "../../components/home/usePersonas";
import type { PersonaSummary } from "../../lib/api";
import { fmt, t } from "../../lib/strings";
import { colors, space } from "../../lib/theme";

const GAP = space.md;
const MAX_WIDTH = 560;

/** Languages ordered by how many personas speak them (ties alphabetical). */
function languagesOf(list: PersonaSummary[]): string[] {
  const count = new Map<string, number>();
  for (const p of list) for (const l of p.languages) count.set(l, (count.get(l) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([l]) => l);
}

export default function DiscoverScreen() {
  const { width: winW } = useWindowDimensions();
  const { personas, error, refreshing, refresh, retry } = usePersonas();
  const [lang, setLang] = useState<string | null>(null);
  const [selected, setSelected] = useState<PersonaSummary | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const width = Math.min(winW, MAX_WIDTH);
  const cardW = Math.floor((width - space.gutter * 2 - GAP) / 2);

  const languages = useMemo(() => languagesOf(personas ?? []), [personas]);
  // Discover shows everyone in a stable order (online first), not by chat recency.
  const filtered = useMemo(() => {
    const list = (personas ?? []).filter((p) => !lang || p.languages.includes(lang));
    return [...list].sort((a, b) => Number(b.online) - Number(a.online));
  }, [personas, lang]);

  const open = useCallback((p: PersonaSummary) => {
    setSelected(p);
    setSheetOpen(true);
  }, []);
  const close = useCallback(() => setSheetOpen(false), []);
  const chat = useCallback((personaId: string) => {
    setSheetOpen(false);
    router.push({ pathname: "/chat/[personaId]", params: { personaId } });
  }, []);

  const renderItem = useCallback<ListRenderItem<PersonaSummary>>(
    ({ item }) => <PersonaCard persona={item} width={cardW} onPress={open} />,
    [cardW, open],
  );

  if (!personas) {
    return (
      <View style={styles.root}>
        <GlowBackground colors={HOME_GLOW} height={260} />
        {error ? <ScreenState variant="error" message={error} onRetry={retry} /> : <GridSkeleton cardW={cardW} />}
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.headText}>
        <AppText variant="title2">{homeCopy.discoverHeading}</AppText>
        <AppText variant="caption" color="textMuted">
          {fmt(homeCopy.discoverSub, { n: personas.length })}
        </AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={homeCopy.all} selected={lang === null} onPress={() => setLang(null)} />
        {languages.map((l) => (
          <Chip key={l} label={l} selected={lang === l} onPress={() => setLang(lang === l ? null : l)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground colors={HOME_GLOW} height={260} />
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.column}
        ListHeaderComponent={header}
        ListEmptyComponent={<ScreenState variant="empty" emoji="🔍" message={homeCopy.noMatch} style={styles.empty} />}
        contentContainerStyle={[styles.content, { width, alignSelf: "center" }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.elevated} />
        }
        initialNumToRender={6}
        windowSize={5}
      />
      <PersonaProfileSheet persona={selected} visible={sheetOpen} onClose={close} onChat={chat} />
    </View>
  );
}

function GridSkeleton({ cardW }: { cardW: number }) {
  const h = Math.round((cardW * 4) / 3);
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.skel, { opacity: pulse }]} accessibilityRole="progressbar" accessibilityLabel={t.common.loading}>
      <View style={[styles.skLine, { width: "55%", height: 20 }]} />
      <View style={styles.skChips}>
        {[60, 76, 70, 84].map((w) => (
          <View key={w} style={[styles.skChip, { width: w }]} />
        ))}
      </View>
      <View style={styles.skGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.skCard, { width: cardW, height: h }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, paddingTop: space.xs, paddingBottom: space.lg },
  headText: { paddingHorizontal: space.gutter, gap: 2 },
  chips: { paddingHorizontal: space.gutter, gap: space.sm },
  column: { paddingHorizontal: space.gutter, gap: GAP, marginBottom: GAP },
  empty: { flex: 0, paddingTop: space.huge },
  skel: { paddingHorizontal: space.gutter, paddingTop: space.sm, gap: space.lg },
  skLine: { borderRadius: 6, backgroundColor: colors.elevated2 },
  skChips: { flexDirection: "row", gap: space.sm },
  skChip: { height: 34, borderRadius: 17, backgroundColor: colors.elevated },
  skGrid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  skCard: { borderRadius: 20, backgroundColor: colors.elevated },
});
