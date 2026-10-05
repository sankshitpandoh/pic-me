import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

type Step = "phone" | "otp";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [needsDob, setNeedsDob] = useState(false);
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(phone);
      setNeedsDob(res.isNewUser);
      setHint(res.devCode ? `Dev mode OTP: ${res.devCode}` : null);
      setStep("otp");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    let dobString: string | undefined;
    if (needsDob) {
      const { day, month, year } = dob;
      if (!day || !month || year.length !== 4) return setError("Please enter your full date of birth.");
      if (!adultConfirmed) return setError("Please confirm that you are 18 or older.");
      dobString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.verifyOtp(phone, code, dobString);
      await signIn(res.token, res.user.credits);
    } catch (err) {
      if (err instanceof ApiError && err.code === "dob_required") {
        setNeedsDob(true);
        setError("Please enter your date of birth to finish signing up.");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = step === "phone" ? phone.replace(/\D/g, "").length >= 10 : code.length === 6;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <Text style={styles.logo}>PicMe</Text>
        <Text style={styles.subtitle}>Your AI friends, always up for a chat 💬</Text>

        {step === "phone" ? (
          <>
            <Text style={styles.label}>Mobile number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={[styles.input, { flex: 1, minWidth: 0 }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="98765 43210"
                maxLength={14}
                autoFocus
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter the 6-digit OTP sent to +91 {phone}</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
              keyboardType="number-pad"
              placeholder="••••••"
              maxLength={6}
              autoFocus
            />
            {hint && <Text style={styles.hint}>{hint}</Text>}

            {needsDob && (
              <>
                <Text style={styles.label}>Date of birth</Text>
                <View style={styles.dobRow}>
                  <TextInput
                    style={[styles.input, styles.dobPart]}
                    placeholder="DD"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={dob.day}
                    onChangeText={(day) => setDob((d) => ({ ...d, day }))}
                  />
                  <TextInput
                    style={[styles.input, styles.dobPart]}
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={dob.month}
                    onChangeText={(month) => setDob((d) => ({ ...d, month }))}
                  />
                  <TextInput
                    style={[styles.input, styles.dobPart, { flex: 1.6, flexBasis: 0 }]}
                    placeholder="YYYY"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={dob.year}
                    onChangeText={(year) => setDob((d) => ({ ...d, year }))}
                  />
                </View>
                <Pressable style={styles.checkRow} onPress={() => setAdultConfirmed((v) => !v)}>
                  <View style={[styles.checkbox, adultConfirmed && styles.checkboxOn]}>
                    {adultConfirmed && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkText}>
                    I am 18 or older and understand that the characters in this app are AI, not real people.
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, (!canSubmit || busy) && styles.buttonDisabled]}
          disabled={!canSubmit || busy}
          onPress={step === "phone" ? sendOtp : verify}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{step === "phone" ? "Get OTP" : "Continue"}</Text>
          )}
        </Pressable>

        {step === "otp" && (
          <Pressable
            onPress={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
          >
            <Text style={styles.link}>Change number</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, justifyContent: "center" },
  logo: { fontSize: 40, fontWeight: "800", color: colors.primary, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "center", marginBottom: 40, marginTop: 6 },
  label: { fontSize: 14, color: colors.text, marginBottom: 8, marginTop: 16, fontWeight: "600" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  prefix: { fontSize: 18, color: colors.text, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
  },
  hint: { color: colors.textMuted, marginTop: 6, fontSize: 13 },
  dobRow: { flexDirection: "row", gap: 8 },
  dobPart: { flex: 1, flexBasis: 0, minWidth: 0, textAlign: "center" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkMark: { color: "#fff", fontWeight: "800", fontSize: 13 },
  checkText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, marginTop: 16 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  link: { color: colors.primary, textAlign: "center", marginTop: 16, fontWeight: "600" },
});
