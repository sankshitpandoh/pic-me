import { useCallback, useRef, useState } from "react";
import { ApiError, api, errorMessage, type Wallet, type WalletSummary } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { haptic } from "../../lib/haptics";
import { copy } from "./copy";

export type PurchaseResult = { wallet: WalletSummary; credits: number };

/**
 * Shared purchase flow for the Recharge tab and the RechargeSheet.
 * - Razorpay configured → creates an order (native checkout still TODO).
 * - Dev top-up enabled → grants the pack immediately.
 * - Neither → `payments_not_configured`.
 * On success updates `useAuth().wallet` and resolves with the new wallet; on failure sets `error` and resolves null.
 */
export function usePurchase(wallet: Wallet | null) {
  const { setWallet } = useAuth();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const buy = useCallback(
    async (packId: string): Promise<PurchaseResult | null> => {
      if (busy.current || !wallet) return null;
      const pack = wallet.offer?.id === packId ? wallet.offer : wallet.packs.find((p) => p.id === packId);
      const cfg = { razorpayKeyId: wallet.razorpayKeyId, devTopupEnabled: wallet.devTopupEnabled, credits: pack?.credits ?? 0 };
      busy.current = true;
      setBuyingId(packId);
      setError(null);
      try {
        if (cfg.razorpayKeyId) {
          await api.createOrder(packId);
          // TODO(payments): open react-native-razorpay checkout with { key: order.keyId, order_id: order.orderId,
          // amount: order.amount, currency: order.currency, name: "Playmate Digital" }, then call
          // api.verifyPayment(orderId, razorpay_payment_id, razorpay_signature) and setWallet(res.wallet).
          setError(copy.paymentSoon);
          haptic.warning();
          return null;
        }
        if (cfg.devTopupEnabled) {
          const res = await api.devTopup(packId);
          setWallet(res.wallet);
          haptic.success();
          return { wallet: res.wallet, credits: cfg.credits };
        }
        throw new ApiError(503, "payments_not_configured", {});
      } catch (err) {
        setError(errorMessage(err));
        haptic.error();
        return null;
      } finally {
        busy.current = false;
        setBuyingId(null);
      }
    },
    [setWallet, wallet],
  );

  const clearError = useCallback(() => setError(null), []);

  return { buy, buyingId, error, clearError };
}
