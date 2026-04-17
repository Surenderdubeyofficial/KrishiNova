import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function FarmerNewsPage() {
  const { t } = useUi();
  const [news, setNews] = useState({ articles: [] });
  useEffect(() => { api("/integrations/news?q=farmers").then(setNews).catch(console.error); }, []);
  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="News" containerClass="container-fluid">
        <div className="row row-content"><div className="col-md-12 mb-3"><div className="row"><div className="col-md-12"><div className="card text-white bg-gradient-secondary mb-3"><div className="card-header"><span className="text-warning display-4"> {t("News List")} </span></div><div className="card-body text-dark"><table className="table table-striped table-hover table-responsive table-bordered bg-gradient-white text-center display"><thead><tr className="font-weight-bold text-default"><th><center>{t("Image")}</center></th><th><center>{t("Title")}</center></th><th><center>{t("Author")}</center></th><th><center>{t("Published")}</center></th><th><center>{t("Visit")}</center></th></tr></thead><tbody>{news.articles?.map((article)=><tr className="text-center" key={article.url}><td>{article.imageUrl ? <img className="img img-thumbnail" src={article.imageUrl} alt="News thumbnail" width="100px" /> : null}</td><td className="text-wrap text-justify">{article.title}</td><td className="text-wrap text-justify">{article.author}</td><td className="text-justify">{article.publishedAt}</td><td><button className="btn btn-sm btn-info"><a className="nav-link text-white p-0" href={article.url} target="_blank" rel="noreferrer">{t("Visit")}</a></button></td></tr>)}</tbody></table></div></div></div></div></div></div>
      </LegacySection>
    </ProtectedRoute>
  );
}
