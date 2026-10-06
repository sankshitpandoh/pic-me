import { Baloo2_600SemiBold } from "@expo-google-fonts/baloo-2/600SemiBold";
import { Baloo2_700Bold } from "@expo-google-fonts/baloo-2/700Bold";
import { Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2/800ExtraBold";
import { Mukta_400Regular } from "@expo-google-fonts/mukta/400Regular";
import { Mukta_500Medium } from "@expo-google-fonts/mukta/500Medium";
import { Mukta_600SemiBold } from "@expo-google-fonts/mukta/600SemiBold";
import { Mukta_700Bold } from "@expo-google-fonts/mukta/700Bold";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFonts } from "expo-font";
import { fonts } from "./theme";

// Per-weight subpath imports so only the 7 weights we use end up in the bundle.
const FONT_MAP = {
  [fonts.displaySemi]: Baloo2_600SemiBold,
  [fonts.display]: Baloo2_700Bold,
  [fonts.displayHeavy]: Baloo2_800ExtraBold,
  [fonts.body]: Mukta_400Regular,
  [fonts.bodyMedium]: Mukta_500Medium,
  [fonts.bodySemi]: Mukta_600SemiBold,
  [fonts.bodyBold]: Mukta_700Bold,
  // Preload the two icon fonts we use so tab icons don't pop in.
  ...Ionicons.font,
  ...MaterialCommunityIcons.font,
};

/** Loads every app font. Returns `true` once loaded OR failed (we then fall back to system fonts rather than hang). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_MAP);
  return loaded || error != null;
}
