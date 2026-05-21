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

  const currentForecast = data.forecast?.[0];
  const tempNow = currentForecast?.tempMax ?? currentForecast?.tempMin;
  const hasRain = data.forecast?.some((item) => String(item.label || item.description || "").toLowerCase().includes("rain"));

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Weather Forecast">
        <div className="modernWeatherShell">
          <section className="modernWeatherHero">
            <div>
              <span className="eyebrow">Live agriculture weather</span>
              <h1>{city}</h1>
              <p>{currentForecast ? `${currentForecast.label || "Forecast"} - ${currentForecast.description || "weather outlook"}` : "Search any city to plan irrigation, spraying, and selling decisions."}</p>
            </div>
            <div className="modernWeatherNow">
              <span className="label">Current slot</span>
              <strong>{tempNow !== undefined ? `${Math.round(Number(tempNow))} C` : "--"}</strong>
              <small>{currentForecast?.datetime || "Waiting for forecast"}</small>
              <div className="weatherMetricRow">
                <span>{currentForecast?.humidity ?? "--"}% humidity</span>
                <span>{currentForecast?.windSpeed ?? "--"} wind</span>
              </div>
            </div>
          </section>

          <form className="modernWeatherSearch" onSubmit={searchWeather}>
            <input
              placeholder={t("Search city or location like Delhi, Mumbai, Udupi")}
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? t("Searching...") : t("Search Weather")}
            </button>
          </form>

          {loading ? <div className="alert alert-info mb-3">{t("Loading weather forecast...")}</div> : null}
          {feedback ? <div className="alert alert-warning mb-3">{feedback}</div> : null}
          {!loading && !data.forecast?.length ? (
            <div className="alert alert-secondary mb-0">{t("No forecast data is available right now.")}</div>
          ) : (
            <>
              <div className="weatherForecastGrid">
                {data.forecast?.map((f) => (
                  <article className="weatherForecastCard" key={f.datetime}>
                    <span className="weatherTime">{String(f.datetime).slice(0, 16)}</span>
                    <strong>{f.label || "Forecast"}</strong>
                    <p>{f.description}</p>
                    <div className="weatherMetricRow">
                      <span>{f.tempMax} C / {f.tempMin} C</span>
                      <span>{f.humidity}% humidity</span>
                      <span>{f.windSpeed} wind</span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="weatherTip">
                {hasRain
                  ? "Rain is expected in the forecast. Avoid pesticide spraying near rainy slots and protect harvested produce."
                  : "No rain is highlighted in the visible forecast. Check soil moisture before irrigation and avoid afternoon heat stress."}
              </div>
            </>
          )}
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
