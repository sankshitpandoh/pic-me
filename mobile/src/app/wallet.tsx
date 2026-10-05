import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, errorMessage, type Pack, type Wallet } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

export default function WalletScreen() {
  const { credits, setCredits } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .wallet()
      .then((w) => {
        setWallet(w);
        setCredits(w.credits);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [setCredits]);

  async function buy(pack: Pack) {
    if (!wallet) return;
    setBuying(pack.id);
    setError(null);
    try {
      if (wallet.razorpayKeyId) {
        const order = await api.createOrder(pack.id);
        // TODO: open Razorpay Checkout (react-native-razorpay, needs a development build), then:
        //   const { razorpay_payment_id, razorpay_signature } = await RazorpayCheckout.open({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency, name: "PicMe" });
        //   const res = await api.verifyPayment(order.orderId, razorpay_payment_id, razorpay_signature);
        //   setCredits(res.credits);
        Alert.alert("Checkout not wired yet", `Order ${order.orderId} created. Add Razorpay Checkout in wallet.tsx.`);
      } else if (wallet.devTopupEnabled) {
        const res = await api.devTopup(pack.id);
        setCredits(res.credits);
        Alert.alert("Added (dev mode)", `${pack.credits} credits added without payment.`);
      } else {
        setError("Payments aren't set up yet.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBuying(null);
    }
  }

  if (!wallet && !error) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your balance</Text>
        <Text style={styles.balance}>💎 {credits}</Text>
        {wallet && (
          <Text style={styles.rates}>
            {wallet.creditsPerMessage} credit per message · {wallet.creditsPerPhoto} credits per photo
          </Text>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {wallet?.packs.map((pack) => (
        <Pressable
          key={pack.id}
          style={({ pressed }) => [styles.pack, pressed && { opacity: 0.85 }]}
          onPress={() => buy(pack)}
          disabled={buying !== null}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.packLabel}>{pack.label}</Text>
            <Text style={styles.packCredits}>{pack.credits} credits</Text>
          </View>
          {buying === pack.id ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.priceTag}>
              <Text style={styles.price}>₹{pack.priceInr}</Text>
            </View>
          )}
        </Pressable>
      ))}

      <Text style={styles.footnote}>Pay securely with UPI, cards or wallets. Credits never expire.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  balanceCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 20, alignItems: "center" },
  balanceLabel: { color: "#fff", opacity: 0.85 },
  balance: { color: "#fff", fontSize: 36, fontWeight: "800", marginVertical: 4 },
  rates: { color: "#fff", opacity: 0.85, fontSize: 13 },
  pack: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  packCredits: { fontSize: 20, fontWeight: "700", color: colors.text },
  priceTag: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  price: { color: "#fff", fontWeight: "800", fontSize: 17 },
  error: { color: colors.danger },
  footnote: { color: colors.textMuted, textAlign: "center", fontSize: 12, marginTop: 8 },
});
