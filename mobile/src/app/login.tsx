import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, GradientButton } from "../components";
import { copy } from "../components/onboarding/copy";
import { DobInput, EMPTY_DOB, checkDob, type Dob } from "../components/onboarding/DobInput";
import { OnboardingHero } from "../components/onboarding/OnboardingHero";
import { OTP_LENGTH, OtpInput } from "../components/onboarding/OtpInput";
import { ConsentRow, InlineError, ResendRow, StepFade, StepIndicator, TextLink } from "../components/onboarding/Parts";
import { PhoneInput, formatPhone } from "../components/onboarding/PhoneInput";
import { ApiError, api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { haptic } from "../lib/haptics";
import { fmt, t } from "../lib/strings";
import { colors, radii, space } from "../lib/theme";

type Step = "phone" | "otp" | "dob";
const RESEND_COOLDOWN_MS = 30_000;
const isValidPhone = (d: string) => /^[6-9]\d{9}$/.test(d);

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [dob, setDob] = useState<Dob>(EMPTY_DOB);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [keyboardUp, setKeyboardUp] = useState(false);

  const otpRef = useRef<TextInput>(null);
  const submitting = useRef(false);
  const lastRequested = useRef<string | null>(null);
  const visitedOtp = useRef(false);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(showEvt, () => setKeyboardUp(true));
    const b = Keyboard.addListener(hideEvt, () => setKeyboardUp(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const fail = useCallback((err: unknown) => {
    haptic.error();
    setError(errorMessage(err));
  }, []);

  // ── step 1: phone ──
  const sendOtp = async () => {
    if (!isValidPhone(phone)) {
      haptic.error();
      setError(t.errors.invalid_phone);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(phone);
      lastRequested.current = phone;
      setIsNewUser(res.isNewUser);
      setDevCode(res.devCode ?? null);
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
      setCode("");
      setStep("otp");
    } catch (err) {
      // Came back and re-sent the same number inside the cooldown: the earlier code is still valid.
      if (err instanceof ApiError && err.code === "otp_cooldown" && lastRequested.current === phone) {
        setCode("");
        setStep("otp");
      } else {
        fail(err);
      }
    } finally {
      setBusy(false);
    }
  };

  // ── step 2 + 3: verify (DOB only for new users) ──
  const verify = async (otp: string, dobIso?: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await api.verifyOtp(phone, otp, dobIso);
      haptic.success();
      await signIn(res.token, res.user); // root auth guard routes to the tabs
    } catch (err) {
      if (err instanceof ApiError && err.code === "dob_required") {
        // OTP was correct and stays valid — collect DOB + consent, then resubmit.
        setIsNewUser(true);
        setStep("dob");
      } else {
        fail(err);
        if (err instanceof ApiError && err.code === "otp_invalid") {
          setShakeKey((k) => k + 1);
          setCode("");
          otpRef.current?.focus();
        }
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(phone);
      haptic.select();
      setDevCode(res.devCode ?? null);
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
      setCode("");
      otpRef.current?.focus();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const backToPhone = () => {
    visitedOtp.current = true;
    setStep("phone");
    setCode("");
    setDob(EMPTY_DOB);
    setConsent(false);
    setError(null);
  };

  const dobCheck = checkDob(dob);
  const dobError = dobCheck.status === "invalid" ? dobCheck.message : null;
  const submitDob = () => {
    if (dobCheck.status !== "ok") {
      haptic.error();
      return;
    }
    if (!consent) return;
    verify(code, dobCheck.iso);
  };

  // ── layout ──
  const totalSteps = isNewUser === false ? 2 : 3;
  const stepNo = step === "phone" ? 1 : step === "otp" ? 2 : 3;
  const heroH = keyboardUp
    ? insets.top + 132
    : Math.round(Math.min(Math.max(height * 0.36, 250), 340));
  const phoneInvalid = phone.length === 10 && !isValidPhone(phone);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <OnboardingHero height={heroH} topInset={insets.top} compact={keyboardUp} />

          <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
            <StepIndicator step={stepNo} total={totalSteps} onBack={step === "phone" ? undefined : backToPhone} />

            <StepFade key={step}>
              {step === "phone" ? (
                <View style={styles.stepBody}>
                  <View style={styles.heading}>
                    <AppText variant="title1">{t.login.phoneLabel}</AppText>
                    <AppText variant="body" color="textMuted">
                      {copy.phoneHint}
                    </AppText>
                  </View>
                  <PhoneInput
                    value={phone}
                    onChangeDigits={(d) => {
                      setPhone(d);
                      if (error) setError(null);
                    }}
                    onSubmit={sendOtp}
                    invalid={!!error || phoneInvalid}
                    autoFocus={visitedOtp.current}
                  />
                  <InlineError message={error ?? (phoneInvalid ? t.errors.invalid_phone : null)} />
                  <GradientButton
                    title={t.login.sendOtp}
                    onPress={sendOtp}
                    disabled={!isValidPhone(phone)}
                    loading={busy}
                    style={styles.cta}
                  />
                </View>
              ) : step === "otp" ? (
                <View style={styles.stepBody}>
                  <View style={styles.heading}>
                    <AppText variant="title1">{copy.otpTitle}</AppText>
                    <AppText variant="body" color="textMuted">
                      {fmt(t.login.otpLabel, { phone: formatPhone(phone) })}
                    </AppText>
                  </View>
                  <OtpInput
                    ref={otpRef}
                    value={code}
                    onChange={(c) => {
                      setCode(c);
                      if (error) setError(null);
                    }}
                    onComplete={(c) => verify(c)}
                    invalid={!!error}
                    shakeKey={shakeKey}
                    editable={!busy}
                    autoFocus
                  />
                  <InlineError message={error} />
                  {__DEV__ && devCode ? (
                    <AppText variant="micro" color="textDisabled" style={styles.devCode}>
                      {fmt(copy.devOtp, { code: devCode })}
                    </AppText>
                  ) : null}
                  <View style={styles.otpLinks}>
                    <ResendRow availableAt={resendAt} onResend={resend} busy={busy} />
                    <TextLink label={t.login.changeNumber} onPress={backToPhone} />
                  </View>
                  <GradientButton
                    title={busy ? copy.otpVerifying : t.common.continue}
                    onPress={() => verify(code)}
                    disabled={code.length !== OTP_LENGTH}
                    loading={busy}
                    style={styles.ctaTight}
                  />
                </View>
              ) : (
                <View style={styles.stepBody}>
                  <View style={styles.heading}>
                    <AppText variant="title1">{t.login.dobTitle}</AppText>
                    <AppText variant="body" color="textMuted">
                      {copy.dobSubtitle}
                    </AppText>
                  </View>
                  <DobInput
                    value={dob}
                    onChange={(d) => {
                      setDob(d);
                      if (error) setError(null);
                    }}
                    invalid={!!(dobError ?? error)}
                    editable={!busy}
                    autoFocus
                    onSubmit={submitDob}
                  />
                  <InlineError message={dobError ?? error} />
                  <View style={styles.consentWrap}>
                    <ConsentRow checked={consent} onToggle={() => setConsent((v) => !v)} label={t.login.consent} />
                  </View>
                  <GradientButton
                    title={t.login.continue}
                    onPress={submitDob}
                    disabled={dobCheck.status !== "ok" || !consent}
                    loading={busy}
                    style={styles.cta}
                  />
                </View>
              )}
            </StepFade>

            <View style={styles.spacer} />
            <View style={styles.footer}>
              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark" size={13} color={colors.success} />
                <AppText variant="caption" color="textMuted" align="center">
                  {t.login.trust.replace(/^🔒\s*/, "")}
                </AppText>
              </View>
              <AppText variant="micro" color="textDisabled" align="center">
                {copy.adultsOnly}
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.gutter,
    paddingTop: space.xl,
    marginTop: -space.lg,
  },
  stepBody: { paddingTop: space.lg },
  heading: { gap: space.xs, marginBottom: space.xl },
  cta: { marginTop: space.xl },
  ctaTight: { marginTop: space.md },
  devCode: { marginTop: space.sm, letterSpacing: 0.4 },
  otpLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.xs,
  },
  consentWrap: { marginTop: space.lg },
  spacer: { height: space.xxl },
  footer: { alignItems: "center", gap: space.xs },
  trustRow: { flexDirection: "row", alignItems: "center", gap: space.xs + 1 },
});
