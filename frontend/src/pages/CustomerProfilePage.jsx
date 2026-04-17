import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function CustomerProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t } = useUi();
  const [data, setData] = useState(null);
  const [states, setStates] = useState([]);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    stateCode: "",
    city: "",
    address: "",
    pincode: "",
    password: "",
  });

  async function load() {
    const [profileData, stateData] = await Promise.all([api("/dashboard/customer"), api("/public/states")]);
    setData(profileData);
    setStates(stateData);

    const profile = profileData?.profile;
    if (profile) {
      const matchedState = stateData.find((state) => state.StateName === profile.state);
      setForm({
        name: profile.cust_name || "",
        email: profile.email || "",
        mobile: profile.phone_no || "",
        stateCode: matchedState?.StCode ? String(matchedState.StCode) : "",
        city: profile.city || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
        password: "",
      });
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function saveProfile(event) {
    event.preventDefault();

    try {
      const result = await api("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setFeedback(result.message);
      setEditing(false);
      await refreshUser();
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  const p = data?.profile;
  const incomplete = user?.profileComplete === false || String(p?.email || "").includes("@pending.local");

  useEffect(() => {
    if (incomplete) {
      setEditing(true);
      setFeedback(t("Complete your profile details to unlock the rest of the customer portal."));
    }
  }, [incomplete]);

  return (
    <ProtectedRoute role="customer">
      <LegacySection badge="Profile">
        <div className="row row-content">
          <div className="col-md-4 mb-3">
            <div className="card">
              <div className="card-body bg-gradient-warning">
                <div className="d-flex flex-column align-items-center text-center">
                  <img src="/img/customers.png" alt="customer" className="rounded-circle img-fluid" width="202px" />
                  <div className="mt-3">
                    <h4>{t("Welcome")} {p?.cust_name}</h4>
                    <button className="btn btn-danger" type="button" onClick={() => setEditing((current) => !current)}>
                      {editing ? t("Cancel") : t("Edit Profile")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <div className="card mb-3">
              <div className="card-body bg-gradient-success">
                {p
                  ? Object.entries({
                      [t("Customer ID")]: p.cust_id,
                      [t("Customer Name")]: p.cust_name,
                      [t("Email Address")]: p.email,
                      [t("Mobile No")]: p.phone_no,
                      [t("State")]: p.state,
                      [t("City")]: p.city,
                      [t("Address")]: p.address,
                      [t("Pincode")]: p.pincode,
                      [t("Password")]: "********",
                    }).map(([k, v]) => (
                      <div className="row mb-1" key={k}>
                        <div className="col-sm-3"><h6 className="mb-0 font-weight-bold">{k}</h6></div>
                        <div className="col-sm-9 text-dark">{v}</div>
                      </div>
                    ))
                  : null}
                {feedback ? <div className="alert alert-info mt-3">{feedback}</div> : null}
                {incomplete ? <div className="alert alert-warning mt-3">{t("Your account was created with a quick method. Please complete the missing profile details below.")}</div> : null}
              </div>
            </div>
            {editing ? (
              <div className="card mb-3">
                <div className="card-body bg-gradient-danger text-white">
                  <form onSubmit={saveProfile}>
                    <div className="form-group mb-3">
                      <label>{t("Customer Name")}</label>
                      <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-group mb-3">
                      <label>{t("Mobile No")}</label>
                      <input className="form-control" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                    </div>
                    <div className="form-group mb-3">
                      <label>{t("Email Address")}</label>
                      <input className="form-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="form-group mb-3">
                      <label>{t("State")}</label>
                      <select className="form-control" value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value })}>
                        <option value="">{t("Select state")}</option>
                        {states.map((state) => (
                          <option key={state.StCode} value={state.StCode}>
                            {state.StateName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-3">
                      <label>{t("City")}</label>
                      <input className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="form-group mb-3">
                      <label>{t("Address")}</label>
                      <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="form-group mb-3">
                      <label>{t("Pincode")}</label>
                      <input className="form-control" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                    </div>
                    <div className="form-group mb-3">
                      <label>{t("New Password")}</label>
                      <input className="form-control" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("Leave blank to keep current password")} />
                    </div>
                    <button className="btn btn-success" type="submit">{t("Save Profile")}</button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
