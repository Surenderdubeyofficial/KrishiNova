import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function FarmerWeatherPage() {
  const { user } = useAuth();
  const { t } = useUi();
  const [city, setCity] = useState("Udupi");
  const [searchCity, setSearchCity] = useState("");
  const [data, setData] = useState({ forecast: [] });
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadWeather(preferredCity) {
    const attempts = [
      preferredCity,
      "Delhi",
      "New Delhi",
      "Udupi",
    ].filter(Boolean);

    let lastError = null;

    for (const candidate of [...new Set(attempts)]) {
      try {
        const result = await api(`/integrations/weather?city=${encodeURIComponent(candidate)}`);
        setCity(result.city || candidate);
        setData(result);
        setFeedback(result.configured === false ? result.message || t("Weather service is not configured.") : "");
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(t("Unable to load weather forecast"));
  }

  useEffect(() => {
    let active = true;

    async function fetchWeather() {
      setLoading(true);
      setFeedback("");

      try {
        const res = await api("/dashboard/farmer");
        const nextCity = res.profile?.F_Location || res.profile?.F_District || res.profile?.F_State || "Udupi";
        if (!active) return;
        await loadWeather(nextCity);
      } catch (error) {
        if (!active) return;
        setData({ forecast: [] });
        setFeedback(error.message || t("Unable to load weather forecast"));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchWeather().catch(console.error);
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function searchWeather(event) {
    event.preventDefault();
    if (!searchCity.trim()) {
      setFeedback(t("Enter a city or real location name first"));
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      await loadWeather(searchCity.trim());
    } catch (error) {
      setData({ forecast: [] });
      setFeedback(error.message || t("Unable to load weather forecast"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Weather Forecast">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="row">
              <div className="col-md-12">
                <div className="card text-white bg-gradient-secondary mb-3">
                  <div className="card-header">
                    <span>{city}</span>
                  </div>
                  <div className="card-body text-dark">
                    <form className="mb-3" onSubmit={searchWeather}>
                      <div className="row">
                        <div className="col-md-9 mb-2 mb-md-0">
                          <input
                            className="form-control"
                            placeholder={t("Search city or location like Delhi, Mumbai, Udupi")}
                            value={searchCity}
                            onChange={(e) => setSearchCity(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                        <div className="col-md-3">
                          <button className="btn btn-success btn-block" type="submit" disabled={loading}>
                            {loading ? t("Searching...") : t("Search Weather")}
                          </button>
                        </div>
                      </div>
                    </form>
                    {loading ? <div className="alert alert-info mb-3">{t("Loading weather forecast...")}</div> : null}
                    {feedback ? <div className="alert alert-warning mb-3">{feedback}</div> : null}
                    {!loading && !data.forecast?.length ? (
                      <div className="alert alert-secondary mb-0">{t("No forecast data is available right now.")}</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display mb-0">
                          <thead>
                            <tr className="font-weight-bold text-default">
                              <th><center>{t("Date")}</center></th>
                              <th><center>{t("Time")}</center></th>
                              <th><center>{t("Temperature (Max / Min)")}</center></th>
                              <th><center>{t("Description")}</center></th>
                              <th><center>{t("Humidity")}</center></th>
                              <th><center>{t("Wind")}</center></th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.forecast?.map((f) => (
                              <tr className="text-center" key={f.datetime}>
                                <td>{String(f.datetime).slice(0, 10)}</td>
                                <td>{String(f.datetime).slice(11)}</td>
                                <td>{f.tempMax} C / {f.tempMin} C</td>
                                <td>{f.label}, {f.description}</td>
                                <td>{f.humidity}%</td>
                                <td>{f.windSpeed} km/h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
