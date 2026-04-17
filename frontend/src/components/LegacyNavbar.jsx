import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useUi } from "../UiContext.jsx";
import BrandLockup from "./BrandLockup.jsx";
import LegacyDropdownNav from "./LegacyDropdownNav.jsx";

function PublicNav() {
  const { t } = useUi();
  return (
    <ul className="navbar-nav align-items-lg-center ml-auto">
      <li className="nav-item">
        <Link to="/" className="nav-link">
          <span className="text-white nav-link-inner--text">
            <i className="text-white fas fa-home" /> Home
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/contact.php" className="nav-link">
          <span className="text-white nav-link-inner--text">
            <i className="text-white fas fa-address-card" /> {t("Contact")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/farmer/fregister" className="nav-link">
          <span className="text-white nav-link-inner--text">
            <i className="text-white fas fa-user-plus" /> {t("Sign Up")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/farmer/flogin" className="nav-link">
          <span className="text-white nav-link-inner--text">
            <i className="text-white fas fa-sign-in-alt" /> {t("Login")}
          </span>
        </Link>
      </li>
    </ul>
  );
}

function FarmerNav({ name, logout }) {
  const { t } = useUi();
  return (
    <ul className="navbar-nav align-items-lg-center ml-auto topnav">
      <li className="nav-item">
        <Link to="/" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-home" /> Home
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/farmer" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-chart-line" /> Dashboard
          </span>
        </Link>
      </li>
      <LegacyDropdownNav
        icon="fas fa-magic"
        label="Prediction"
        items={[
          { to: "/farmer/fcrop_prediction", label: "Crop Prediction" },
          { to: "/farmer/fyield_prediction", label: "Yield Prediction" },
          { to: "/farmer/frainfall_prediction", label: "Rainfall Prediction" },
        ]}
      />
      <LegacyDropdownNav
        icon="fas fa-gavel"
        label="Recommendation"
        items={[
          { to: "/farmer/fcrop_recommendation", label: "Crop Recommendation" },
          { to: "/farmer/ffertilizer_recommendation", label: "Fertilizer Recommendation" },
        ]}
      />
      <LegacyDropdownNav
        icon="fas fa-shopping-cart"
        label="Trade"
        items={[
          { to: "/farmer/ftradecrops", label: "Trade Crops" },
          { to: "/farmer/fstock_crop", label: "Crop Stocks" },
          { to: "/farmer/fselling_history", label: "Selling History" },
        ]}
      />
      <LegacyDropdownNav
        icon="fas fa-gear"
        label="Tools"
        items={[
          { to: "/farmer/fchatgpt", label: "Chat Bot" },
          { to: "/farmer/fweather_prediction", label: "Weather Forecast" },
          { to: "/farmer/fnewsfeed", label: "News Feed" },
        ]}
      />
      <li className="nav-item">
        <Link to="/farmer/fprofile" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-user" /> {name}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <button onClick={logout} className="nav-link btn btn-link p-0">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-danger fas fa-power-off" /> {t("Logout")}
          </span>
        </button>
      </li>
    </ul>
  );
}

function CustomerNav({ name, logout }) {
  const { t } = useUi();
  return (
    <ul className="navbar-nav align-items-lg-center ml-auto topnav">
      <li className="nav-item">
        <Link to="/" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-home" /> Home
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/customer" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-chart-pie" /> Dashboard
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/customer/cbuy_crops" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-shopping-cart" /> {t("Buy Crops")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/customer/cstock_crop" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fad fa-store-alt" /> {t("Crop Stocks")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/customer/cinvoices" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-file-invoice" /> {t("Invoices")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/customer/cprofile" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-user" /> {name}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <button onClick={logout} className="nav-link btn btn-link p-0">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-danger fas fa-power-off" /> {t("Logout")}
          </span>
        </button>
      </li>
    </ul>
  );
}

function AdminNav({ name, logout }) {
  const { t } = useUi();
  return (
    <ul className="navbar-nav align-items-lg-center ml-auto topnav">
      <li className="nav-item">
        <Link to="/" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-home" /> Home
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/admin" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-chart-bar" /> Dashboard
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/admin/afarmers" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-users" /> {t("Farmers")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/admin/acustomers" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-users" /> {t("Customers")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/admin/aproducedcrop" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fad fa-store-alt" /> {t("Crop Stock")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/admin/aviewmsg" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-address-card" /> {t("Queries")}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <Link to="/admin/aprofile" className="nav-link">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-white fas fa-user" /> {name}
          </span>
        </Link>
      </li>
      <li className="nav-item">
        <button onClick={logout} className="nav-link btn btn-link p-0">
          <span className="text-white nav-link-inner--text font-weight-bold">
            <i className="text-danger fas fa-power-off" /> {t("Logout")}
          </span>
        </button>
      </li>
    </ul>
  );
}

export default function LegacyNavbar() {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, theme, toggleTheme } = useUi();

  return (
    <nav id="navbar-main" className="navbar navbar-main navbar-expand-lg bg-default navbar-light position-sticky top-0 shadow py-0">
      <div className={user ? "container-fluid" : "container"}>
        <ul className="navbar-nav navbar-nav-hover align-items-lg-center">
          <li className="nav-item dropdown">
            <Link to="/" className="navbar-brand mr-lg-5 text-white">
              <BrandLockup theme="dark" compact subtitle={false} />
            </Link>
          </li>
        </ul>

        <div className="navUtilityControls">
          <button type="button" className="uiToggleBtn" onClick={toggleLanguage}>
            {language === "en" ? "हिंदी" : "ENG"}
          </button>
          <button type="button" className="uiToggleBtn" onClick={toggleTheme}>
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>

        {user?.role === "farmer" ? <FarmerNav name={user.name} logout={logout} /> : null}
        {user?.role === "customer" ? <CustomerNav name={user.name} logout={logout} /> : null}
        {user?.role === "admin" ? <AdminNav name={user.name} logout={logout} /> : null}
        {!user ? <PublicNav /> : null}
      </div>
    </nav>
  );
}
