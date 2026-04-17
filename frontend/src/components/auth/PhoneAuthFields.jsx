export default function PhoneAuthFields({ form, updateForm, mode }) {
  return (
    <>
      <div className="authFieldGroup authFieldGroupWide">
        <label className="authFieldLabel">Mobile number</label>
        <input
          placeholder="Enter mobile number"
          value={form.mobile}
          onChange={(e) => updateForm("mobile", e.target.value)}
        />
      </div>
      <div className="authNote">
        {mode === "register"
          ? "We will verify your number first, create the account immediately, and then ask you to complete the remaining fields inside your profile."
          : "We will verify your number with SMS OTP and sign you in directly."}
      </div>
    </>
  );
}
