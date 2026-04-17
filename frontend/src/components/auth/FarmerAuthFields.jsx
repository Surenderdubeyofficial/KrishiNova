export default function FarmerAuthFields({
  mode,
  form,
  updateForm,
  states,
  districts,
  t,
}) {
  return (
    <>
      {mode === "register" ? (
        <div className="authFieldGroup">
          <label className="authFieldLabel">Farmer name</label>
          <input
            placeholder="Enter full farmer name"
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
            <label className="authFieldLabel">Gender</label>
            <select value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="authFieldGroup">
            <label className="authFieldLabel">Date of birth</label>
            <input type="date" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} />
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
            <label className="authFieldLabel">{t("District")}</label>
            <select value={form.district} onChange={(e) => updateForm("district", e.target.value)}>
              <option value="">{t("Select district")}</option>
              {districts.map((district) => (
                <option
                  key={district.DistCode ?? district.distCode ?? district.id}
                  value={district.DistrictName ?? district.districtName ?? district.name ?? ""}
                >
                  {district.DistrictName ?? district.districtName ?? district.name ?? "Unnamed district"}
                </option>
              ))}
            </select>
          </div>
          <div className="authFieldGroup authFieldGroupWide">
            <label className="authFieldLabel">City / Location</label>
            <input
              placeholder="Enter city or location"
              value={form.city}
              onChange={(e) => updateForm("city", e.target.value)}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
