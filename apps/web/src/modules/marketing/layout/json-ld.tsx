import { appConfig } from "~/config/app";

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Organization + Website schema for the root layout */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: appConfig.name,
        url: appConfig.url,
        logo: `${appConfig.url}/favicon.ico`,
        sameAs: [
          "https://github.com/WOOK98/aireseach",
          "https://x.com/ZHENGWOOK",
          "https://www.facebook.com/profile.php?id=100013239642815",
        ],
      }}
    />
  );
}

/** Website + SearchAction schema for the root layout */
export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: appConfig.name,
        url: appConfig.url,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${appConfig.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

interface ArticleJsonLdProps {
  title: string;
  description: string;
  publishedAt: string;
  modifiedAt?: string;
  thumbnail?: string;
  slug: string;
  tags?: string[];
}

/** Article schema for blog posts */
export function ArticleJsonLd({
  title,
  description,
  publishedAt,
  modifiedAt,
  thumbnail,
  slug,
  tags,
}: ArticleJsonLdProps) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        datePublished: publishedAt,
        dateModified: modifiedAt ?? publishedAt,
        author: {
          "@type": "Organization",
          name: appConfig.name,
        },
        publisher: {
          "@type": "Organization",
          name: appConfig.name,
          logo: {
            "@type": "ImageObject",
            url: `${appConfig.url}/favicon.ico`,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${appConfig.url}/blog/${slug}`,
        },
        ...(thumbnail && { image: thumbnail }),
        ...(tags?.length && { keywords: tags.join(", ") }),
      }}
    />
  );
}

interface FaqItem {
  question: string;
  answer: string;
}

/** FAQ schema for pages with Q&A content */
export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }}
    />
  );
}
