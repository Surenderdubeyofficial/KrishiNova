export default function AdminAuthFields({ form, updateForm }) {
  return (
    <>
      <div className="authFieldGroup">
        <label className="authFieldLabel">Admin username</label>
        <input
          placeholder="Enter admin username"
          value={form.username}
          onChange={(e) => updateForm("username", e.target.value)}
        />
      </div>
      <div className="authFieldGroup">
        <label className="authFieldLabel">Password</label>
        <input
          placeholder="Enter password"
          type="password"
          value={form.password}
          onChange={(e) => updateForm("password", e.target.value)}
        />
      </div>
    </>
  );
}
