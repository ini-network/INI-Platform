// Placeholder shown instantly inside the modal while the article streams in, so
// the open animation plays immediately on click instead of after the fetch.
export function ArticleReaderSkeleton() {
  return (
    <div className="cs-reader-skeleton" aria-hidden="true">
      <div className="cs-skel cs-skel-badge" />
      <div className="cs-skel cs-skel-title" />
      <div className="cs-skel cs-skel-title is-short" />
      <div className="cs-skel cs-skel-meta" />
      <div className="cs-skel cs-skel-hero" />
      <div className="cs-skel cs-skel-line" />
      <div className="cs-skel cs-skel-line" />
      <div className="cs-skel cs-skel-line is-short" />
    </div>
  );
}
