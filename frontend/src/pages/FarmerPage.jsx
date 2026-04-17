import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import { useUi } from "../UiContext.jsx";

const cropOptions = ["arhar", "bajra", "barley", "cotton", "gram", "jowar", "jute", "lentil", "maize", "moong", "ragi", "rice", "soyabean", "urad", "wheat"];
const rainfallMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export default function FarmerPage() {
  const { t } = useUi();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [tradeForm, setTradeForm] = useState({ crop: "rice", quantity: 1, costPerKg: 20 });
  const [predictionState, setPredictionState] = useState({});
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [predictionMessages, setPredictionMessages] = useState({});
  const [weather, setWeather] = useState({ forecast: [] });
  const [news, setNews] = useState({ articles: [] });

  useEffect(() => {
    Promise.all([
      api("/dashboard/farmer"),
      api("/public/states"),
      api("/integrations/news?q=farmers"),
    ])
      .then(([dashboardData, statesData, newsData]) => {
        setDashboard(dashboardData);
        setStates(statesData);
        setNews(newsData);
      })
      .catch((error) => {
        console.error(error);
        setPageError(error.message || t("Unable to load farmer dashboard"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!predictionState.cropPredictionStateCode) return;
    api(`/public/districts/${predictionState.cropPredictionStateCode}`).then(setDistricts).catch(console.error);
  }, [predictionState.cropPredictionStateCode]);

  useEffect(() => {
    const city = dashboard?.profile?.F_District || dashboard?.profile?.F_Location;
    if (!city) return;
    api(`/integrations/weather?city=${encodeURIComponent(city)}`).then(setWeather).catch(console.error);
  }, [dashboard?.profile?.F_District, dashboard?.profile?.F_Location]);

  async function refreshDashboard() {
    const data = await api("/dashboard/farmer");
    setDashboard(data);
  }

  async function submitTrade(event) {
    event.preventDefault();
    try {
      await api("/market/crops", { method: "POST", body: JSON.stringify(tradeForm) });
      await refreshDashboard();
      setPredictionMessages((current) => ({ ...current, trade: "Crop listed successfully" }));
    } catch (error) {
      setPredictionMessages((current) => ({ ...current, trade: error.message }));
    }
  }

  async function runPrediction(key, path, body) {
    try {
      const result = await api(path, { method: "POST", body: JSON.stringify(body) });
      setPredictionMessages((current) => ({ ...current, [key]: result.result }));
    } catch (error) {
      setPredictionMessages((current) => ({ ...current, [key]: error.message }));
    }
  }

  const stateLabel = useMemo(
    () => states.find((state) => String(state.StCode) === String(predictionState.cropPredictionStateCode))?.StateName || "",
    [states, predictionState.cropPredictionStateCode],
  );

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Farmer">
        {loading ? <div className="alert alert-info">{t("Loading farmer dashboard...")}</div> : null}
        {pageError ? <div className="alert alert-danger">{pageError}</div> : null}
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-success display-4"> {t("Farmer Dashboard")} </span>
              </div>
              <div className="card-body text-dark">
                <div className="row text-center">
                  <div className="col-md-3 mb-3">
                    <div className="card"><div className="card-body"><h6>{t("Orders fulfilled")}</h6><h3>{dashboard?.historySummary?.orders || 0}</h3></div></div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="card"><div className="card-body"><h6>{t("Revenue tracked")}</h6><h3>Rs. {dashboard?.historySummary?.revenue || 0}</h3></div></div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="card"><div className="card-body"><h6>{t("Current listings")}</h6><h3>{dashboard?.listedCrops?.length || 0}</h3></div></div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="card"><div className="card-body"><h6>{t("Total listed quantity")}</h6><h3>{Math.round(dashboard?.listingSummary?.totalQuantity || 0)} kg</h3></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="panel split">
          <form className="card" onSubmit={submitTrade}>
            <SectionHeading eyebrow={t("Trade")} title={t("List crop for sale")} />
            <select value={tradeForm.crop} onChange={(e) => setTradeForm({ ...tradeForm, crop: e.target.value })}>
              {cropOptions.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
            <input type="number" min="1" placeholder={t("Quantity")} value={tradeForm.quantity} onChange={(e) => setTradeForm({ ...tradeForm, quantity: Number(e.target.value) })} />
            <input type="number" min="1" placeholder={t("Cost per kg")} value={tradeForm.costPerKg} onChange={(e) => setTradeForm({ ...tradeForm, costPerKg: Number(e.target.value) })} />
            <button className="button" type="submit">
              {t("Add Listing")}
            </button>
            {predictionMessages.trade ? <p className="feedback">{predictionMessages.trade}</p> : null}
          </form>

          <div className="card">
            <SectionHeading eyebrow={t("Listings")} title={t("Current crop listings")} />
            <div className="tableLike">
              {dashboard?.listedCrops?.map((item) => (
                <div className="rowItem" key={item.trade_id}>
                  <span>{item.Trade_crop}</span>
                  <span>{item.Crop_quantity} kg</span>
                  <span>Rs. {item.costperkg}/kg</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel split">
          <div className="card">
            <SectionHeading
              eyebrow={t("Weather")}
              title={`${t("Forecast")}${weather.city ? ` for ${weather.city}` : ""}`}
              description={weather.configured === false ? weather.message : undefined}
            />
            <div className="grid">
              {weather.forecast?.slice(0, 5).map((item) => (
                <article className="forecastCard" key={item.datetime}>
                  <strong>{item.datetime}</strong>
                  <p>{item.label}</p>
                  <p>{item.description}</p>
                  <p>
                    {item.tempMax} C / {item.tempMin} C
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="card">
            <SectionHeading eyebrow={t("News")} title={t("Farmer news feed")} description={news.configured === false ? news.message : undefined} />
            <div className="grid">
              {news.articles?.slice(0, 4).map((article) => (
                <article className="articleCard" key={article.url}>
                  <h3>{article.title}</h3>
                  <p>{article.source}</p>
                  <a className="textLink" href={article.url} target="_blank" rel="noreferrer">
                    {t("Visit")} article
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel split">
          <div className="card">
            <SectionHeading
              eyebrow={t("Performance")}
              title={t("Sales insights")}
              description="A production dashboard should help the farmer see which crops are actually moving."
            />
            <div className="tableLike">
              {dashboard?.topSelling?.length ? (
                dashboard.topSelling.map((item) => (
                  <div className="rowItem" key={item.farmer_crop}>
                    <span>{item.farmer_crop}</span>
                    <span>{item.quantity} kg</span>
                    <span>{item.orders} orders</span>
                  </div>
                ))
              ) : (
                <div className="emptyState">No selling history yet. Add listings and complete purchases to build insights.</div>
              )}
            </div>
          </div>

          <div className="card insightCard">
            <SectionHeading
              eyebrow={t("Pricing")}
              title={t("Listing health")}
              description="These quick indicators make the trade side feel more like a real operating dashboard."
            />
            <div className="insightList">
              <div className="insightRow">
                <span>{t("Average listed price")}</span>
                <strong>Rs. {Math.round(dashboard?.listingSummary?.averagePrice || 0)}</strong>
              </div>
              <div className="insightRow">
                <span>{t("Active listings")}</span>
                <strong>{dashboard?.listedCrops?.length || 0}</strong>
              </div>
              <div className="insightRow">
                <span>{t("Total listed stock")}</span>
                <strong>{Math.round(dashboard?.listingSummary?.totalQuantity || 0)} kg</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <SectionHeading
            eyebrow={t("Predictions")}
            title={t("Agriculture ML tools")}
            description="These forms call the copied Python models from the original project through the new Express API."
          />
          <div className="grid two">
            <form className="card" onSubmit={(e) => {
              e.preventDefault();
              runPrediction("cropPrediction", "/predictions/crop-prediction", {
                state: stateLabel,
                district: predictionState.cropPredictionDistrict,
                season: predictionState.cropPredictionSeason,
              });
            }}>
              <h3>{t("Crop Prediction")}</h3>
              <select value={predictionState.cropPredictionStateCode || ""} onChange={(e) => setPredictionState({ ...predictionState, cropPredictionStateCode: e.target.value })}>
                <option value="">{t("Select state")}</option>
                {states.map((state) => (
                  <option key={state.StCode} value={state.StCode}>
                    {state.StateName}
                  </option>
                ))}
              </select>
              <select value={predictionState.cropPredictionDistrict || ""} onChange={(e) => setPredictionState({ ...predictionState, cropPredictionDistrict: e.target.value })}>
                <option value="">{t("Select district")}</option>
                {districts.map((district) => (
                  <option key={district.DistCode} value={district.DistrictName}>
                    {district.DistrictName}
                  </option>
                ))}
              </select>
              <input placeholder={t("Season")} value={predictionState.cropPredictionSeason || ""} onChange={(e) => setPredictionState({ ...predictionState, cropPredictionSeason: e.target.value })} />
              <button className="button">{t("Predict crop")}</button>
              <p className="feedback">{predictionMessages.cropPrediction || t("Waiting for input")}</p>
            </form>

            <form className="card" onSubmit={(e) => {
              e.preventDefault();
              runPrediction("cropRecommendation", "/predictions/crop-recommendation", predictionState);
            }}>
              <h3>{t("Crop Recommendation")}</h3>
              <input placeholder={t("Nitrogen")} onChange={(e) => setPredictionState({ ...predictionState, n: e.target.value })} />
              <input placeholder={t("Phosphorous")} onChange={(e) => setPredictionState({ ...predictionState, p: e.target.value })} />
              <input placeholder={t("Potassium")} onChange={(e) => setPredictionState({ ...predictionState, k: e.target.value })} />
              <input placeholder={t("Temperature")} onChange={(e) => setPredictionState({ ...predictionState, temperature: e.target.value })} />
              <input placeholder={t("Humidity")} onChange={(e) => setPredictionState({ ...predictionState, humidity: e.target.value })} />
              <input placeholder={t("pH")} onChange={(e) => setPredictionState({ ...predictionState, ph: e.target.value })} />
              <input placeholder={t("Rainfall")} onChange={(e) => setPredictionState({ ...predictionState, rainfall: e.target.value })} />
              <button className="button">{t("Recommend crop")}</button>
              <p className="feedback">{predictionMessages.cropRecommendation || t("Waiting for input")}</p>
            </form>

            <form className="card" onSubmit={(e) => {
              e.preventDefault();
              runPrediction("fertilizer", "/predictions/fertilizer-recommendation", predictionState);
            }}>
              <h3>{t("Fertilizer Recommendation")}</h3>
              <input placeholder={t("Nitrogen")} onChange={(e) => setPredictionState({ ...predictionState, n: e.target.value })} />
              <input placeholder={t("Phosphorous")} onChange={(e) => setPredictionState({ ...predictionState, p: e.target.value })} />
              <input placeholder={t("Potassium")} onChange={(e) => setPredictionState({ ...predictionState, k: e.target.value })} />
              <input placeholder={t("Temperature")} onChange={(e) => setPredictionState({ ...predictionState, temperature: e.target.value })} />
              <input placeholder={t("Humidity")} onChange={(e) => setPredictionState({ ...predictionState, humidity: e.target.value })} />
              <input placeholder={t("Soil moisture")} onChange={(e) => setPredictionState({ ...predictionState, soilMoisture: e.target.value })} />
              <input placeholder={t("Soil type")} onChange={(e) => setPredictionState({ ...predictionState, soilType: e.target.value })} />
              <input placeholder={t("Crop type")} onChange={(e) => setPredictionState({ ...predictionState, cropType: e.target.value })} />
              <button className="button">{t("Recommend fertilizer")}</button>
              <p className="feedback">{predictionMessages.fertilizer || t("Waiting for input")}</p>
            </form>

            <form className="card" onSubmit={(e) => {
              e.preventDefault();
              runPrediction("rainfall", "/predictions/rainfall", {
                subdivision: predictionState.subdivision,
                month: predictionState.month,
              });
            }}>
              <h3>{t("Rainfall Prediction")}</h3>
              <input placeholder={t("Subdivision")} onChange={(e) => setPredictionState({ ...predictionState, subdivision: e.target.value })} />
              <select onChange={(e) => setPredictionState({ ...predictionState, month: e.target.value })} defaultValue="">
                <option value="" disabled>{t("Select month")}</option>
                {rainfallMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              <button className="button">{t("Predict rainfall")}</button>
              <p className="feedback">{predictionMessages.rainfall || t("Waiting for input")}</p>
            </form>

            <form className="card" onSubmit={(e) => {
              e.preventDefault();
              runPrediction("yield", "/predictions/yield", predictionState);
            }}>
              <h3>{t("Yield Prediction")}</h3>
              <input placeholder={t("State name")} onChange={(e) => setPredictionState({ ...predictionState, state: e.target.value })} />
              <input placeholder={t("District name")} onChange={(e) => setPredictionState({ ...predictionState, district: e.target.value })} />
              <input placeholder={t("Season")} onChange={(e) => setPredictionState({ ...predictionState, season: e.target.value })} />
              <input placeholder={t("Crop")} onChange={(e) => setPredictionState({ ...predictionState, crop: e.target.value })} />
              <input placeholder={t("Area")} onChange={(e) => setPredictionState({ ...predictionState, area: e.target.value })} />
              <button className="button">{t("Predict yield")}</button>
              <p className="feedback">{predictionMessages.yield || t("Waiting for input")}</p>
            </form>
          </div>
        </section>
      </LegacySection>
    </ProtectedRoute>
  );
}
