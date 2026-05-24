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

function authMessage(result, fallback) {
  const baseMessage = result.message || fallback;
  return result.devOtp ? `${baseMessage} Local test OTP: ${result.devOtp}` : baseMessage;
}

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
      setMode("login");
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

  function clearPendingStates() {
    setPendingOtp(null);
    setPendingPhoneOtp(null);
    setOtp("");
    setPhoneOtp("");
  }

  function finishLogin(result) {
    login(result);

    if (result.user?.role === "admin") {
      navigate("/admin");
      return;
    }

    if (result.user?.role === "farmer") {
      navigate(result.user?.profileComplete === false ? "/farmer/fprofile" : "/farmer");
      return;
    }

    navigate(result.user?.profileComplete === false ? "/customer/cprofile" : "/customer");
  }

  async function submit(event) {
    event.preventDefault();
    setFeedback("");

    if (role !== "admin" && authMethod !== "phone") {
      if (String(form.email || "").trim().toLowerCase() === "admin") {
        setFeedback("Select the Admin role to login with admin username and password.");
        return;
      }

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
          devOtp: result.devOtp,
        });
        setPendingOtp(null);
        setPhoneOtp(result.devOtp || "");
        setFeedback(authMessage(result, "SMS OTP sent."));
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
        setFeedback(authMessage(result, "OTP sent to your email."));
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
      setFeedback(authMessage(result, "OTP sent again."));
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

  const showGoogle = role !== "admin" && Boolean(googleClientId);
  const quickFlow = authMethod === "phone" || authMethod === "google";
  const authTitle = pendingOtp || pendingPhoneOtp ? t("Verify access") : t("Sign in or create your account");
  const roleSummary = {
    farmer: t("Sell crops, use predictions, and manage your farm profile."),
    customer: t("Buy directly from farmers and track crop availability."),
    admin: t("Monitor users, crops, and platform activity."),
  };
  const methodSummary = {
    email: mode === "register" ? t("Full details now, verified by email OTP.") : t("Password login with email OTP verification."),
    phone: mode === "register" ? t("Fast signup by mobile, complete profile after entry.") : t("Instant mobile login through SMS OTP."),
    google: t("Google verifies the email and opens the role workspace. New users get a quick account and complete profile after entry."),
  };
  const statusTiles = [
    { label: t("Security"), value: "OTP + JWT" },
    { label: t("Payments"), value: "Razorpay" },
    { label: t("Support"), value: "AI + Weather" },
  ];
  const roleOptions = [
    { id: "farmer", label: t("Farmer"), hint: t("Sell crops and manage farm orders.") },
    { id: "customer", label: t("Customer"), hint: t("Buy crops and track deliveries.") },
    { id: "admin", label: t("Admin"), hint: t("Control trust, orders, and payouts.") },
  ];
  const methodOptions = [
    { id: "email", label: t("Email"), hint: methodSummary.email },
    { id: "phone", label: t("Mobile OTP"), hint: methodSummary.phone },
    { id: "google", label: t("Google"), hint: showGoogle ? methodSummary.google : t("Enable Google client ID to use this.") },
  ];

  return (
    <main className="authEasyPage">
      <section className="authEasyHero">
        <div>
          <BrandLockup theme="light" />
          <p className="eyebrow">{BRAND.subtitle}</p>
          <h1>{t("Welcome to KrishiNova")}</h1>
          <p className="sectionText">
            {t("A simple entry screen for farmers, customers, and admins to reach their own workspace quickly.")}
          </p>
        </div>
        <div className="authEasyStats" aria-label="Platform access summary">
          {statusTiles.map((tile) => (
            <article key={tile.label}>
              <span>{tile.label}</span>
              <strong>{tile.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="authEasyShell">
        <aside className="authEasySteps" aria-label="Authentication choices">
          <div className="authEasyPanel">
            <span className="authStepNumber">1</span>
            <div>
              <h2>{t("Choose your role")}</h2>
              <p>{roleSummary[role]}</p>
            </div>
            <div className="authRoleCards">
              {roleOptions.map((option) => (
                <button
                  className={role === option.id ? "selected" : ""}
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setRole(option.id);
                    clearPendingStates();
                  }}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="authEasyPanel">
            <span className="authStepNumber">2</span>
            <div>
              <h2>{t("Select access type")}</h2>
              <p>{role === "admin" ? t("Admin access uses username and password.") : methodSummary[authMethod]}</p>
            </div>
            <div className="authModeSwitch">
              <button className={mode === "login" ? "selected" : ""} type="button" onClick={() => setMode("login")}>
                {t("Login")}
              </button>
              {role !== "admin" ? (
                <button className={mode === "register" ? "selected" : ""} type="button" onClick={() => setMode("register")}>
                  {t("Signup")}
                </button>
              ) : null}
            </div>
            {role !== "admin" ? (
              <div className="authMethodCards">
                {methodOptions.map((option) => (
                  <button
                    className={authMethod === option.id ? "selected" : ""}
                    disabled={option.id === "google" && !showGoogle}
                    key={option.id}
                    type="button"
                    onClick={() => setAuthMethod(option.id)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="authEasyPanel authEasyHelp">
            <span className="authStepNumber">3</span>
            <div>
              <h2>{t("Go to dashboard")}</h2>
              <p>{t("After verification, every role lands in its own workspace with protected access.")}</p>
            </div>
          </div>
        </aside>

        <section className="authEasyFormCard">
          <div className="authEasyFormHeader">
            <div>
              <span className="eyebrow">{t("Secure Access")}</span>
              <h2>{authTitle}</h2>
              <p>
                {pendingOtp
                  ? `Enter the email OTP sent to ${pendingOtp.user?.email}.`
                  : pendingPhoneOtp
                    ? `Enter the SMS OTP sent to ${pendingPhoneOtp.user?.mobile}.`
                    : `${roleOptions.find((option) => option.id === role)?.label} ${mode === "login" ? "login" : "signup"}`}
              </p>
            </div>
            <span className="authEasyBadge">{role}</span>
          </div>

          {pendingOtp ? (
            <form className="authVerifyCard authEasyInnerCard" onSubmit={verifyOtp}>
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
            <form className="authVerifyCard authEasyInnerCard" onSubmit={verifyPhoneOtp}>
              <div className="authInlineHeading">
                <strong>{t("Mobile verification")}</strong>
                <span>{t("Use the SMS OTP just sent to your phone.")}</span>
              </div>
              {pendingPhoneOtp.devOtp ? (
                <div className="authNote">
                  Local test OTP: <strong>{pendingPhoneOtp.devOtp}</strong>
                </div>
              ) : null}
              <input placeholder={t("Enter SMS OTP")} value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} maxLength={6} />
              <button className="button" type="submit">{t("Verify SMS OTP")}</button>
              <div className="authActionRow">
                <button className="ghostAction" type="button" onClick={cancelPending}>{t("Back")}</button>
              </div>
            </form>
          ) : (
            <>
              {authMethod === "google" && showGoogle ? (
                <div className="authGoogleCard authEasyInnerCard">
                  <div>
                    <strong>{mode === "register" ? "Continue with Google to create an account" : "Continue with Google to sign in"}</strong>
                    <p className="sectionText">
                      Google will verify your email, create the role account if needed, and then send you to complete any missing profile fields.
                    </p>
                  </div>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setFeedback("Google sign-in failed. Check that this Google OAuth client allows http://localhost:5173 as an authorized JavaScript origin.")}
                    useOneTap={false}
                  />
                </div>
              ) : null}

              {authMethod !== "google" ? (
                <form className="authFormGrid authEasyFormGrid" onSubmit={submit}>
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
                </form>
              ) : null}

              {quickFlow ? (
                <p className="authFootnote authEasyFootnote">
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
