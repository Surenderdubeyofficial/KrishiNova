import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cityListPath = path.resolve(__dirname, "..", "..", "..", "shared", "static", "citylist.json");

let cachedCityList = null;

async function getCityList() {
  if (cachedCityList) {
    return cachedCityList;
  }
  const raw = await fs.readFile(cityListPath, "utf8");
  cachedCityList = JSON.parse(raw);
  return cachedCityList;
}

export async function fetchWeatherForecast(cityName) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      forecast: [],
      message: "OPENWEATHER_API_KEY is not configured",
    };
  }

  const cityList = await getCityList();
  const normalized = cityName.trim().toLowerCase();
  const cityMatch = cityList.find((city) => city.name?.trim().toLowerCase() === normalized);

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  if (cityMatch?.id) {
    url.searchParams.set("id", String(cityMatch.id));
  } else {
    url.searchParams.set("q", cityName);
  }
  url.searchParams.set("lang", "en");
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to fetch weather forecast");
  }

  const data = await response.json();
  return {
    configured: true,
    city: data.city?.name || cityName,
    forecast: (data.list || []).slice(0, 8).map((entry) => ({
      datetime: entry.dt_txt,
      tempMax: entry.main?.temp_max,
      tempMin: entry.main?.temp_min,
      humidity: entry.main?.humidity,
      windSpeed: entry.wind?.speed,
      label: entry.weather?.[0]?.main,
      description: entry.weather?.[0]?.description,
      icon: entry.weather?.[0]?.icon,
    })),
  };
}
