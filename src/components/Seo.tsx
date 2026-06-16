/**
 * Per-page metadata. React 19 hoists <title>/<meta>/<link> rendered anywhere
 * in the tree into <head>, so this component just renders them inline.
 */
interface SeoProps {
  title: string;
  description?: string;
  /** canonical path, e.g. "/havzalar" */
  path?: string;
  /** Schema.org structured data to embed as JSON-LD */
  jsonLd?: object;
}

const SITE = 'İTA — İslam Tarihyazım Atlası';
const BASE = 'https://alicetinkaya76.github.io/ita';

export default function Seo({ title, description, path, jsonLd }: SeoProps) {
  const full = title === SITE ? title : `${title} · İTA`;
  const url = path ? `${BASE}${path}` : undefined;
  return (
    <>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary" />
      {url && <link rel="canonical" href={url} />}
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
    </>
  );
}
