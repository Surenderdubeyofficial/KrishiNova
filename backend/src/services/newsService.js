export async function fetchAgricultureNews(query = "farmers", pageSize = 6) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      articles: [],
      message: "NEWS_API_KEY is not configured",
    };
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", query);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("language", "en");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to fetch agriculture news");
  }

  const data = await response.json();
  return {
    configured: true,
    articles: (data.articles || []).map((article) => ({
      title: article.title,
      author: article.author,
      description: article.description,
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source?.name,
    })),
  };
}
