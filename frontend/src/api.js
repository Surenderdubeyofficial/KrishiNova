const PRODUCTION_API_URL = "https://krishinova.onrender.com/api";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : PRODUCTION_API_URL);

export async function api(path, options = {}) {
  const token = localStorage.getItem("agri_token");
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error(
      import.meta.env.DEV
        ? "Backend API is not reachable. Make sure the backend is running on http://localhost:5000."
        : "Backend API is not reachable. Please try again in a moment.",
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}
