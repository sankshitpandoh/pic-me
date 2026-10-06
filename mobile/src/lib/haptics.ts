import * as Haptics from "expo-haptics";

/**
 * Fire-and-forget haptics. Never throws (unsupported devices / web just do nothing).
 * - `select`: light tick for taps and toggles (buttons, chips).
 * - `success` / `warning` / `error`: notification patterns (payment done, low balance, failures).
 * - `impact`: a soft bump (e.g. message sent).
 */
export const haptic = {
  select: () => void Haptics.selectionAsync().catch(() => {}),
  impact: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
