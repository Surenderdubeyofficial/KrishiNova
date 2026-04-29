import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext.jsx";
import { BRAND } from "../branding.js";
import AdminAuthFields from "../components/auth/AdminAuthFields.jsx";
import BrandLockup from "../components/BrandLockup.jsx";
import CustomerAuthFields from "../components/auth/CustomerAuthFields.jsx";
import FarmerAuthFields from "../components/auth/FarmerAuthFields.jsx";
import PhoneAuthFields from "../components/auth/PhoneAuthFields.jsx";
import { useUi } from "../UiContext.jsx";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function isValidIndianMobile(value) {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));
}

const initialForm = {
  username: "",
  name: "",
  email: "",
  password: "",
  mobile: "",
  gender: "Male",
  dob: "",
  stateCode: "",
  district: "",
  city: "",
  address: "",
  pincode: "",
};

const initialRecoveryForm = {
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
};

function normalizeList(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.value)) {
    return result.value;
  }

  return [];
}

export default function AuthPage() {
  const { login } = useAuth();
  const { t } = useUi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("farmer");
  const [authMethod, setAuthMethod] = useState("email");
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState(initialForm);
  const [otp, setOtp] = useState("");
  const [pendingOtp, setPendingOtp] = useState(null);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [pendingPhoneOtp, setPendingPhoneOtp] = useState(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState("email");
  const [recoveryForm, setRecoveryForm] = useState(initialRecoveryForm);
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [pendingRecovery, setPendingRecovery] = useState(null);
  const [verifiedRecovery, setVerifiedRecovery] = useState(null);

  useEffect(() => {
    const target = searchParams.get("target");
    if (target === "farmer-login") {
      setMode("login");
      setRole("farmer");
    }
    if (target === "farmer-register") {
      setMode("register");
      setRole("farmer");
    }
    if (target === "customer-login") {
      setMode("login");
      setRole("customer");
    }
    if (target === "customer-register") {
      setMode("register");
      setRole("customer");
    }
    if (target === "admin-login") {
      setMode("login");
      setRole("admin");
    }
  }, [searchParams]);

  useEffect(() => {
    api("/public/states")
      .then((result) => setStates(normalizeList(result)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.stateCode) {
      setDistricts([]);
      return;
    }

    api(`/public/districts/${form.stateCode}`)
      .then((result) => setDistricts(normalizeList(result)))
      .catch(console.error);
  }, [form.stateCode]);

  useEffect(() => {
    if (role === "admin") {
      setAuthMethod("email");
      return;
    }

    if (mode === "register" && authMethod === "phone") {
      setForm((current) => ({
        ...current,
        email: "",
        password: "",
        name: "",
        stateCode: "",
        district: "",
        city: "",
        address: "",
        pincode: "",
        dob: "",
      }));
    }
  }, [mode, role, authMethod]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRecoveryForm(key, value) {
    setRecoveryForm((current) => ({ ...current, [key]: value }));
  }

  function clearPendingStates() {
    setPendingOtp(null);
    setPendingPhoneOtp(null);
    setOtp("");
    setPhoneOtp("");
  }

  function clearRecoveryStates() {
    setPendingRecovery(null);
    setVerifiedRecovery(null);
    setRecoveryOtp("");
    setRecoveryForm(initialRecoveryForm);
  }

  function openForgotPassword() {
    clearPendingStates();
    clearRecoveryStates();
    setForgotMode(true);
    setRecoveryMethod("email");
    setFeedback("");
  }

  function closeForgotPassword() {
    clearRecoveryStates();
    setForgotMode(false);
    setFeedback("");
  }

  function finishLogin(result) {
    login(result);

    if (result.user?.role === "admin") {
      navigate("/admin/aprofile");
      return;
    }

    if (result.user?.role === "farmer") {
      navigate(result.user?.profileComplete === false ? "/farmer/fprofile" : "/farmer/fprofile");
      return;
    }

    navigate(result.user?.profileComplete === false ? "/customer/cprofile" : "/customer/cprofile");
  }

  async function submit(event) {
    event.preventDefault();
    setFeedback("");

    if (role !== "admin" && authMethod !== "phone") {
      if (!emailPattern.test(String(form.email || "").trim())) {
        setFeedback("Enter a valid email address");
        return;
      }
    }

    if (role !== "admin" && (authMethod === "phone" || mode === "register")) {
      if (!isValidIndianMobile(form.mobile)) {
        setFeedback("Enter a valid 10-digit mobile number");
        return;
      }
    }

    try {
      if (authMethod === "phone" && role !== "admin") {
        const result = await api(`/auth/phone/start/${role}`, {
          method: "POST",
          body: JSON.stringify({ mobile: form.mobile, mode }),
        });
        setPendingPhoneOtp({
          phoneOtpToken: result.phoneOtpToken,
          user: result.user,
          role: result.user?.role,
        });
        setPendingOtp(null);
        setPhoneOtp("");
        setFeedback(result.message || "SMS OTP sent.");
        return;
      }

      const path = mode === "login" ? `/auth/login/${role}` : `/auth/register/${role}`;
      const payload = role === "admin" ? { username: form.username, password: form.password } : form;
      const result = await api(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (result.requiresOtp) {
        setPendingOtp({
          otpToken: result.otpToken,
          user: result.user,
          role: result.user?.role,
          mode,
        });
        setPendingPhoneOtp(null);
        setOtp("");
        setFeedback(result.message || "OTP sent to your email.");
        return;
      }

      finishLogin(result);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setFeedback("");

    try {
      const result = await api("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          otpToken: pendingOtp?.otpToken,
          otp,
        }),
      });
      clearPendingStates();
      finishLogin(result);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function resendOtp() {
    setFeedback("");

    try {
      const result = await api("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ otpToken: pendingOtp?.otpToken }),
      });
      setPendingOtp((current) => ({
        ...current,
        otpToken: result.otpToken,
      }));
      setFeedback(result.message || "OTP sent again.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function verifyPhoneOtp(event) {
    event.preventDefault();
    setFeedback("");

    try {
      const result = await api("/auth/phone/verify", {
        method: "POST",
        body: JSON.stringify({
          phoneOtpToken: pendingPhoneOtp?.phoneOtpToken,
          otp: phoneOtp,
        }),
      });
      clearPendingStates();
      finishLogin(result);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function handleGoogleSuccess(response) {
    setFeedback("");

    try {
      const result = await api(`/auth/google/${role}`, {
        method: "POST",
        body: JSON.stringify({
          credential: response.credential,
          mode,
        }),
      });
      finishLogin(result);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function cancelPending() {
    clearPendingStates();
    setFeedback("");
  }

  async function startRecovery(event) {
    event.preventDefault();
    setFeedback("");

    if (recoveryMethod === "email") {
      if (!emailPattern.test(String(recoveryForm.email || "").trim())) {
        setFeedback("Enter a valid email address");
        return;
      }
    } else if (!isValidIndianMobile(recoveryForm.mobile)) {
      setFeedback("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      const path =
        recoveryMethod === "email" ? `/auth/forgot/email/start/${role}` : `/auth/forgot/phone/start/${role}`;
      const payload =
        recoveryMethod === "email"
          ? { email: recoveryForm.email.trim() }
          : { mobile: recoveryForm.mobile.trim() };
      const result = await api(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPendingRecovery({
        resetToken: result.resetToken,
        channel: recoveryMethod,
        role,
        user: result.user,
      });
      setVerifiedRecovery(null);
      setRecoveryOtp("");
      setFeedback(result.message || "Recovery OTP sent.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function resendRecoveryOtp() {
    setFeedback("");

    try {
      const result = await api("/auth/forgot/resend", {
        method: "POST",
        body: JSON.stringify({ resetToken: pendingRecovery?.resetToken }),
      });

      setPendingRecovery((current) =>
        current
          ? {
              ...current,
              resetToken: result.resetToken,
            }
          : current,
      );
      setFeedback(result.message || "Recovery OTP sent again.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function verifyRecoveryOtp(event) {
    event.preventDefault();
    setFeedback("");

    try {
      const result = await api("/auth/forgot/verify", {
        method: "POST",
        body: JSON.stringify({
          resetToken: pendingRecovery?.resetToken,
          otp: recoveryOtp,
        }),
      });

      setVerifiedRecovery({
        passwordResetToken: result.passwordResetToken,
        channel: pendingRecovery?.channel,
      });
      setPendingRecovery((current) => (current ? { ...current } : current));
      setRecoveryOtp("");
      setFeedback(result.message || "OTP verified.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    setFeedback("");

    if (String(recoveryForm.password || "").trim().length < 6) {
      setFeedback("Password must be at least 6 characters");
      return;
    }

    if (recoveryForm.password !== recoveryForm.confirmPassword) {
      setFeedback("Passwords do not match");
      return;
    }

    try {
      const result = await api("/auth/forgot/reset", {
        method: "POST",
        body: JSON.stringify({
          passwordResetToken: verifiedRecovery?.passwordResetToken,
          password: recoveryForm.password,
        }),
      });

      closeForgotPassword();
      setMode("login");
      setForm((current) => ({
        ...current,
        email: recoveryMethod === "email" ? recoveryForm.email : current.email,
        mobile: recoveryMethod === "phone" ? recoveryForm.mobile : current.mobile,
        password: "",
      }));
      setFeedback(result.message || "Password reset successful.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  const showGoogle = role !== "admin" && Boolean(googleClientId);
  const quickFlow = authMethod === "phone" || authMethod === "google";
  const authTitle = forgotMode
    ? verifiedRecovery
      ? t("Create your new password")
      : pendingRecovery
        ? t("Verify your recovery OTP")
        : t("Forgot your password?")
    : pendingOtp || pendingPhoneOtp
      ? t("Verify access")
      : t("Sign in or create your account");
  const roleSummary = {
    farmer: t("Sell crops, use predictions, and manage your farm profile."),
    customer: t("Buy directly from farmers and track crop availability."),
    admin: t("Monitor users, crops, and platform activity."),
  };
  const methodSummary = {
    email: mode === "register" ? t("Full details now, verified by email OTP.") : t("Password login with email OTP verification."),
    phone: mode === "register" ? t("Fast signup by mobile, complete profile after entry.") : t("Instant mobile login through SMS OTP."),
    google: mode === "register" ? t("Quick account creation with Google identity.") : t("Direct Google sign-in for existing accounts."),
  };
  const statusTiles = [
    { label: t("Security"), value: "OTP + JWT" },
    { label: t("Payments"), value: "Razorpay" },
    { label: t("Support"), value: "AI + Weather" },
  ];

  return (
    <main className="authExperience authRefresh authBackdrop authPagePremium">
      <span className="authAmbientOrb authAmbientOrbOne" aria-hidden="true" />
      <span className="authAmbientOrb authAmbientOrbTwo" aria-hidden="true" />
      <span className="authAmbientOrb authAmbientOrbThree" aria-hidden="true" />

      <section className="authShowcase authShowcaseModal">
        <div className="authShowcasePanel authShowcasePanelRich">
          <div className="authShowcaseCopy">
            <div className="authBrandHeader">
              <BrandLockup theme="light" />
              <span className="eyebrow">{BRAND.subtitle}</span>
            </div>
            <h1>{t("Secure access for a smarter agricultural marketplace.")}</h1>
            <p className="lede">
              {BRAND.name} brings farmers, buyers, and admins into one polished experience with quick entry methods, verified access, and complete profile workflows.
            </p>
          </div>

          <div className="authStatusRail">
            {statusTiles.map((tile) => (
              <div className="authStatusTile" key={tile.label}>
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
              </div>
            ))}
          </div>

          <div className="authMetricStrip authMetricStripSoft">
            <div className="authMetricCard">
              <strong>3</strong>
              <span>{t("Access methods")}</span>
            </div>
            <div className="authMetricCard">
              <strong>3</strong>
              <span>{t("User roles")}</span>
            </div>
            <div className="authMetricCard">
              <strong>1</strong>
              <span>{t("Unified entry screen")}</span>
            </div>
          </div>

          <div className="authFlowRibbon">
            <div>
              <span className="authFlowLabel">{t("Manual")}</span>
              <strong>{t("Email and password")}</strong>
            </div>
            <div>
              <span className="authFlowLabel">{t("Quick")}</span>
              <strong>{t("Mobile OTP or Google")}</strong>
            </div>
            <div>
              <span className="authFlowLabel">{t("After entry")}</span>
              <strong>{t("Complete missing profile details")}</strong>
            </div>
          </div>

          <div className="authFeatureStack">
            <article className="authFeatureItem">
              <strong>{t("Role-based access")}</strong>
              <span>{t("Switch between farmer, customer, and admin without leaving the screen.")}</span>
            </article>
            <article className="authFeatureItem">
              <strong>{t("Verified entry")}</strong>
              <span>{t("Email OTP and SMS OTP flows keep manual and mobile access consistent.")}</span>
            </article>
            <article className="authFeatureItem">
              <strong>{t("Profile completion")}</strong>
              <span>{t("Quick signup methods can enter first and complete business details afterward.")}</span>
            </article>
          </div>

          <div className="authPreviewWindow">
            <div className="authPreviewTop">
              <span />
              <span />
              <span />
            </div>

            <div className="authPreviewHero">
              <div>
                <strong>{BRAND.name} access flow</strong>
                <p>One responsive screen for sign in, signup, OTP verification, and profile completion.</p>
              </div>
              <div className="authPreviewBadge">Live</div>
            </div>

            <div className="authPreviewFormMock">
              <div className="authPreviewLine authPreviewLineWide" />
              <div className="authPreviewLine" />
              <div className="authPreviewLine" />
              <div className="authPreviewButton">Continue to dashboard</div>
            </div>

            <div className="authBenefitList authBenefitListCompact">
              <article className="authBenefitCard">
                <strong>Email + OTP</strong>
                <span>Best for complete registration with full details up front.</span>
              </article>
              <article className="authBenefitCard">
                <strong>Google + Mobile</strong>
                <span>Faster access with profile completion handled after login.</span>
              </article>
            </div>
          </div>
        </div>

        <section className="authWorkspace authWorkspaceModern authWorkspaceModal">
          <div className="authWorkspaceHeader authWorkspaceHeaderPremium">
            <div>
              <span className="eyebrow">{t("Secure Access")}</span>
              <h2>{authTitle}</h2>
              <p className="sectionText authHeaderText">
                {forgotMode
                  ? verifiedRecovery
                    ? "Choose a strong new password for your account."
                    : pendingRecovery
                      ? pendingRecovery.channel === "email"
                        ? `Enter the email OTP sent to ${pendingRecovery.user?.email}.`
                        : `Enter the SMS OTP sent to ${pendingRecovery.user?.mobile}.`
                      : "Choose whether to recover your password by email or mobile OTP."
                  : pendingOtp
                  ? `Enter the email OTP sent to ${pendingOtp.user?.email}.`
                  : pendingPhoneOtp
                    ? `Enter the SMS OTP sent to ${pendingPhoneOtp.user?.mobile}.`
                    : "Choose a role, pick your preferred method, and continue through the matching flow."}
              </p>
            </div>
            <div className="authMiniChecklist">
              <span>Farmer</span>
              <span>Customer</span>
              <span>Admin</span>
            </div>
          </div>

          {forgotMode ? (
            verifiedRecovery ? (
              <form className="authVerifyCard authVerifyCardModern authCardShell" onSubmit={submitPasswordReset}>
                <div className="authInlineHeading">
                  <strong>{t("Set a new password")}</strong>
                  <span>{t("Your OTP is verified. Choose a new password to finish recovery.")}</span>
                </div>
                <div className="authFieldGroup">
                  <label className="authFieldLabel">{t("New Password")}</label>
                  <input
                    placeholder={t("Enter new password")}
                    type="password"
                    value={recoveryForm.password}
                    onChange={(e) => updateRecoveryForm("password", e.target.value)}
                  />
                </div>
                <div className="authFieldGroup">
                  <label className="authFieldLabel">{t("Confirm Password")}</label>
                  <input
                    placeholder={t("Confirm new password")}
                    type="password"
                    value={recoveryForm.confirmPassword}
                    onChange={(e) => updateRecoveryForm("confirmPassword", e.target.value)}
                  />
                </div>
                <button className="button" type="submit">{t("Update Password")}</button>
                <div className="authActionRow">
                  <button className="ghostAction" type="button" onClick={closeForgotPassword}>{t("Back to login")}</button>
                </div>
              </form>
            ) : pendingRecovery ? (
              <form className="authVerifyCard authVerifyCardModern authCardShell" onSubmit={verifyRecoveryOtp}>
                <div className="authInlineHeading">
                  <strong>{pendingRecovery.channel === "email" ? t("Email recovery") : t("Mobile recovery")}</strong>
                  <span>
                    {pendingRecovery.channel === "email"
                      ? t("Use the OTP we sent to your email address.")
                      : t("Use the SMS OTP we sent to your phone.")}
                  </span>
                </div>
                <input
                  placeholder={pendingRecovery.channel === "email" ? t("Enter email OTP") : t("Enter SMS OTP")}
                  value={recoveryOtp}
                  onChange={(e) => setRecoveryOtp(e.target.value)}
                  maxLength={6}
                />
                <button className="button" type="submit">{t("Verify Recovery OTP")}</button>
                <div className="authActionRow">
                  <button className="ghostAction" type="button" onClick={resendRecoveryOtp}>{t("Resend OTP")}</button>
                  <button className="ghostAction" type="button" onClick={closeForgotPassword}>{t("Back")}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="authControlStrip authCardShell">
                  <div className="authTopControls authTopControlsModal">
                    <div className="authRoleSelectWrap">
                      <label className="authFieldLabel">{t("Role")}</label>
                      <div className="authSelectShell">
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                          <option value="farmer">{t("Farmer")}</option>
                          <option value="customer">{t("Customer")}</option>
                          <option value="admin">{t("Admin")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <section className="authSectionBlock authCardShell">
                  <div className="authSectionHeader">
                    <strong>{t("Choose recovery method")}</strong>
                    <span>{t("Verify ownership through email OTP or mobile OTP before resetting your password.")}</span>
                  </div>
                  <div className="authMethodGrid authMethodGridModern">
                    <button className={recoveryMethod === "email" ? "authMethodCard activeAuthMethod" : "authMethodCard"} type="button" onClick={() => setRecoveryMethod("email")}>
                      <strong>{t("Email")}</strong>
                      <span>{t("Send a reset OTP to the email linked to your account.")}</span>
                    </button>
                    <button className={recoveryMethod === "phone" ? "authMethodCard activeAuthMethod" : "authMethodCard"} type="button" onClick={() => setRecoveryMethod("phone")}>
                      <strong>{t("Mobile")}</strong>
                      <span>{t("Send a reset OTP to the mobile number saved in your profile.")}</span>
                    </button>
                  </div>
                </section>

                <form className="authFormGrid authFormGridModern authCardShell" onSubmit={startRecovery}>
                  {recoveryMethod === "email" ? (
                    <div className="authFieldGroup authFieldGroupWide">
                      <label className="authFieldLabel">{t("Email")}</label>
                      <input
                        placeholder={t("Enter account email")}
                        type="email"
                        value={recoveryForm.email}
                        onChange={(e) => updateRecoveryForm("email", e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="authFieldGroup authFieldGroupWide">
                      <label className="authFieldLabel">{t("Mobile")}</label>
                      <input
                        placeholder={t("Enter account mobile number")}
                        value={recoveryForm.mobile}
                        onChange={(e) => updateRecoveryForm("mobile", e.target.value)}
                      />
                    </div>
                  )}

                  <button className="button authPrimaryButton" type="submit">
                    {recoveryMethod === "email" ? t("Send Email OTP") : t("Send SMS OTP")}
                  </button>
                </form>

                <div className="authActionRow">
                  <button className="ghostAction" type="button" onClick={closeForgotPassword}>{t("Back to login")}</button>
                </div>
              </>
            )
          ) : pendingOtp ? (
            <form className="authVerifyCard authVerifyCardModern authCardShell" onSubmit={verifyOtp}>
              <div className="authInlineHeading">
                <strong>{t("Email verification")}</strong>
                <span>{t("Use the OTP we sent to your email address.")}</span>
              </div>
              <input placeholder={t("Enter email OTP")} value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
              <button className="button" type="submit">{t("Verify Email OTP")}</button>
              <div className="authActionRow">
                <button className="ghostAction" type="button" onClick={resendOtp}>{t("Resend OTP")}</button>
                <button className="ghostAction" type="button" onClick={cancelPending}>{t("Back")}</button>
              </div>
            </form>
          ) : pendingPhoneOtp ? (
            <form className="authVerifyCard authVerifyCardModern authCardShell" onSubmit={verifyPhoneOtp}>
              <div className="authInlineHeading">
                <strong>{t("Mobile verification")}</strong>
                <span>{t("Use the SMS OTP just sent to your phone.")}</span>
              </div>
              <input placeholder={t("Enter SMS OTP")} value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} maxLength={6} />
              <button className="button" type="submit">{t("Verify SMS OTP")}</button>
              <div className="authActionRow">
                <button className="ghostAction" type="button" onClick={cancelPending}>{t("Back")}</button>
              </div>
            </form>
          ) : (
            <>
              <div className="authControlStrip authCardShell">
                <div className="authTopControls authTopControlsModal">
                  <div className="authToggleRow authModeTabs">
                    <button className={mode === "login" ? "activePill" : "pill"} type="button" onClick={() => setMode("login")}>
                      {t("Login")}
                    </button>
                    <button className={mode === "register" ? "activePill" : "pill"} type="button" onClick={() => setMode("register")}>
                      {t("Signup")}
                    </button>
                  </div>
                  <div className="authRoleSelectWrap">
                    <label className="authFieldLabel">{t("Role")}</label>
                    <div className="authSelectShell">
                      <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="farmer">{t("Farmer")}</option>
                        <option value="customer">{t("Customer")}</option>
                        <option value="admin">{t("Admin")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="authRoleHighlight authCardShell">
                <strong>{role.charAt(0).toUpperCase() + role.slice(1)} access</strong>
                <span>{roleSummary[role]}</span>
              </div>

              {role !== "admin" ? (
                <section className="authSectionBlock authCardShell">
                  <div className="authSectionHeader">
                    <strong>{t("Choose sign in method")}</strong>
                    <span>{t("Email for full forms, or use quick access methods.")}</span>
                  </div>
                  <div className="authMethodGrid authMethodGridModern">
                    <button className={authMethod === "email" ? "authMethodCard activeAuthMethod" : "authMethodCard"} type="button" onClick={() => setAuthMethod("email")}>
                      <strong>{t("Email")}</strong>
                      <span>{methodSummary.email}</span>
                    </button>
                    <button className={authMethod === "phone" ? "authMethodCard activeAuthMethod" : "authMethodCard"} type="button" onClick={() => setAuthMethod("phone")}>
                      <strong>{t("Mobile")}</strong>
                      <span>{methodSummary.phone}</span>
                    </button>
                    <button className={authMethod === "google" ? "authMethodCard activeAuthMethod" : "authMethodCard"} type="button" onClick={() => setAuthMethod("google")} disabled={!showGoogle}>
                      <strong>{t("Google")}</strong>
                      <span>{methodSummary.google}</span>
                    </button>
                  </div>
                </section>
              ) : null}

              {authMethod === "google" && showGoogle ? (
                <div className="authGoogleCard authGoogleCardModern authCardShell">
                  <div>
                    <strong>{mode === "register" ? "Continue with Google to create an account" : "Continue with Google to sign in"}</strong>
                    <p className="sectionText">
                      {mode === "register"
                        ? "After Google verification, we will create the account instantly and send you to complete the remaining required profile fields."
                        : "Use a Google account whose verified email already exists in the selected role table."}
                    </p>
                  </div>
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setFeedback("Google sign-in failed")} />
                </div>
              ) : null}

              {authMethod !== "google" ? (
                <form className="authFormGrid authFormGridModern authCardShell" onSubmit={submit}>
                  {role === "admin" ? (
                    <AdminAuthFields form={form} updateForm={updateForm} />
                  ) : authMethod === "phone" ? (
                    <PhoneAuthFields form={form} updateForm={updateForm} mode={mode} />
                  ) : (
                    role === "farmer" ? (
                      <FarmerAuthFields
                        mode={mode}
                        form={form}
                        updateForm={updateForm}
                        states={states}
                        districts={districts}
                        t={t}
                      />
                    ) : (
                      <CustomerAuthFields
                        mode={mode}
                        form={form}
                        updateForm={updateForm}
                        states={states}
                        t={t}
                      />
                    )
                  )}

                  <button className="button authPrimaryButton" type="submit">
                    {role === "admin"
                      ? t("Login")
                      : authMethod === "phone"
                        ? t("Send SMS OTP")
                        : mode === "login"
                          ? t("Continue with Email")
                          : t("Create Account")}
                  </button>
                  {mode === "login" && role !== "admin" ? (
                    <div className="authFormFooter authFieldGroupWide">
                      <button className="ghostAction authInlineLink" type="button" onClick={openForgotPassword}>
                        {t("Forgot password? Reset by email or mobile")}
                      </button>
                    </div>
                  ) : null}
                </form>
              ) : null}

              {quickFlow ? (
                <p className="authFootnote authFootnoteModern">
                  Quick methods do not ask for every business field up front. After entry, the app will redirect the user to the role profile page to finish required details.
                </p>
              ) : null}

              {!showGoogle && role !== "admin" ? (
                <p className="authFootnote">Google login will appear after the frontend Google client ID is loaded.</p>
              ) : null}
            </>
          )}

          {feedback ? <p className="feedback authFeedbackBanner">{feedback}</p> : null}
        </section>
      </section>
    </main>
  );
}
