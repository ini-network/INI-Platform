import { formatNewsDate, type NewsArticle } from "../../lib/news";
import { ArticleActions } from "./article-actions";
import { MarkReadOnView } from "./mark-read-on-view";
import { NewsCard } from "./news-card";
import { ReaderHero } from "./reader-hero";

// Presentational reader. Prefers our transformative AI summary as the body
// (so readers get the substance in-app); when none exists yet it falls back to
// the outlet's snippet + a "read the full story" link. Degrades gracefully when
// fields are absent.
export function ArticleReader({ article }: { article: NewsArticle }) {
  const when = formatNewsDate(article.published_at, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const body = article.ai_summary ?? article.summary;
  const isAi = Boolean(article.ai_summary);

  return (
    <article className="cs-reader">
      <MarkReadOnView id={article.id} />
      <div className="cs-reader-badges">
        {article.category_label ? <span className="cs-reader-cat">{article.category_label}</span> : null}
        {article.borough ? <span className="cs-reader-boro">{article.borough}</span> : null}
        {article.verified ? <span className="cs-reader-verified">Verified source</span> : null}
      </div>

      <h1 className="cs-reader-title">{article.title}</h1>

      <div className="cs-reader-meta">
        {article.outlet ? <span>{article.outlet}</span> : null}
        {when ? <span>{when}</span> : null}
      </div>

      {article.image_url ? <ReaderHero src={article.image_url} /> : null}

      {isAi ? <p className="cs-reader-ai-label">Summary</p> : null}
      {body ? <p className="cs-reader-summary">{body}</p> : null}

      {article.source_url ? (
        <a
          className={isAi ? "cs-reader-readorig" : "cs-reader-readmore"}
          href={article.source_url}
          target="_blank"
          rel="noreferrer"
        >
          {isAi ? "Read the original" : "Read the full story"}
          {article.outlet ? ` at ${article.outlet}` : ""} →
        </a>
      ) : null}

      <ArticleActions articleId={article.id} />

      <section className="cs-reader-details">
        <h2>Key details</h2>
        <dl>
          {article.borough ? (
            <div className="cs-reader-detail">
              <dt>Area</dt>
              <dd>{article.borough}</dd>
            </div>
          ) : null}
          {article.outlet ? (
            <div className="cs-reader-detail">
              <dt>Source</dt>
              <dd>
                {article.outlet}
                {article.verified ? " · Verified" : ""}
              </dd>
            </div>
          ) : null}
          {when ? (
            <div className="cs-reader-detail">
              <dt>Published</dt>
              <dd>{when}</dd>
            </div>
          ) : null}
          {article.category_label ? (
            <div className="cs-reader-detail">
              <dt>Topic</dt>
              <dd>{article.category_label}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {article.related.length > 0 ? (
        <section className="cs-reader-related">
          <h2>Related in {article.borough ?? "NYC"}</h2>
          <div className="cs-newscard-list">
            {article.related.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
