export default function CustomerAuthFields({ mode, form, updateForm, states, t }) {
  return (
    <>
      {mode === "register" ? (
        <div className="authFieldGroup">
          <label className="authFieldLabel">Customer name</label>
          <input
            placeholder="Enter full customer name"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
          />
        </div>
      ) : null}

      <div className="authFieldGroup">
        <label className="authFieldLabel">{t("Email")}</label>
        <input
          placeholder={t("Enter email address")}
          type="email"
          value={form.email}
          onChange={(e) => updateForm("email", e.target.value)}
        />
      </div>

      <div className="authFieldGroup">
        <label className="authFieldLabel">{t("Password")}</label>
        <input
          placeholder={t("Enter password")}
          type="password"
          value={form.password}
          onChange={(e) => updateForm("password", e.target.value)}
        />
      </div>

      {mode === "register" ? (
        <>
          <div className="authFieldGroup">
            <label className="authFieldLabel">{t("Mobile")}</label>
            <input
              placeholder={t("Enter mobile number")}
              value={form.mobile}
              onChange={(e) => updateForm("mobile", e.target.value)}
            />
          </div>
          <div className="authFieldGroup">
            <label className="authFieldLabel">{t("State")}</label>
            <select value={form.stateCode} onChange={(e) => updateForm("stateCode", e.target.value)}>
              <option value="">{t("Select state")}</option>
              {states.map((state) => (
                <option
                  key={state.StCode ?? state.stateCode ?? state.id}
                  value={String(state.StCode ?? state.stateCode ?? state.id ?? "")}
                >
                  {state.StateName ?? state.stateName ?? state.name ?? "Unnamed state"}
                </option>
              ))}
            </select>
          </div>
          <div className="authFieldGroup">
            <label className="authFieldLabel">{t("City")}</label>
            <input placeholder="Enter city" value={form.city} onChange={(e) => updateForm("city", e.target.value)} />
          </div>
          <div className="authFieldGroup authFieldGroupWide">
            <label className="authFieldLabel">{t("Address")}</label>
            <input
              placeholder="Enter address"
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
            />
          </div>
          <div className="authFieldGroup">
            <label className="authFieldLabel">{t("Pincode")}</label>
            <input
              placeholder="Enter pincode"
              value={form.pincode}
              onChange={(e) => updateForm("pincode", e.target.value)}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
