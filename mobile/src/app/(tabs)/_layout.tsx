import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { CreditsPill, LOW_CREDITS } from "../../components/CreditsPill";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/strings";
import { colors, fonts, space } from "../../lib/theme";

/** Header-right credits pill that jumps to the Recharge tab. */
function HeaderCredits() {
  return (
    <View style={styles.headerRight}>
      <CreditsPill onPress={() => router.navigate("/wallet")} />
    </View>
  );
}

export default function TabsLayout() {
  const { credits } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, includeFontPadding: false },
        tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.textOnPrimary, fontFamily: fonts.bodyBold, fontSize: 10 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.chats.title,
          tabBarLabel: t.tabs.chats,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />
          ),
          headerRight: () => <HeaderCredits />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t.discover.title,
          tabBarLabel: t.tabs.discover,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={size} color={color} />
          ),
          headerRight: () => <HeaderCredits />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t.wallet.title,
          tabBarLabel: t.tabs.wallet,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="diamond-stone" size={size} color={color} />,
          tabBarBadge: credits <= LOW_CREDITS ? "!" : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile.title,
          tabBarLabel: t.tabs.profile,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: { paddingRight: space.lg },
});
