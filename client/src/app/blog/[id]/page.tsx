// src/app/blog/[id]/page.tsx
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchBlogByIdOrSlug, type BlogPost } from "@/lib/blog";
import BreadcrumbsJsonLd from "@/components/seo/BreadcrumbsJsonLd";
import ArticleJsonLd from "@/components/seo/ArticleJsonLd";
import ShareButton from "@/components/blog/ShareButton";

function parseDMMMYYYY(s?: string): Date | null {
  if (!s) return null;
  const [dStr, monStr, yStr] = s.split(" ");
  const day = Number(dStr);
  const year = Number(yStr);
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const mi = months.indexOf(monStr.toLowerCase().slice(0, 3));
  if (!Number.isFinite(day) || !Number.isFinite(year) || mi < 0) return null;
  return new Date(Date.UTC(year, mi, day));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await fetchBlogByIdOrSlug(id);
  if (!post) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com";
  const description = post.excerpt?.slice(0, 160) || "";
  const url = `/blog/${post.slug || post.id}`;
  const fullUrl = `${siteUrl}${url}`;
  const imageUrl = post.image || post.featuredImage || "";

  return {
    title: `${post.title} | Wild n' Root Blog`,
    description,
    alternates: { canonical: fullUrl },
    openGraph: {
      title: post.title,
      description,
      url: fullUrl,
      type: "article",
      publishedTime: post.publishedAt || undefined,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags || [],
      images: imageUrl
        ? [{ url: imageUrl, width: 1200, height: 630, alt: post.title }]
        : [],
      siteName: "Wild n' Root",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    keywords: post.tags?.join(", ") || undefined,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // The id param is the MongoDB ID
  // fetchBlogByIdOrSlug handles both ID and slug for backward compatibility
  const post = await fetchBlogByIdOrSlug(id);
  if (!post) {
    console.error(`Blog not found for: ${id}`);
    return notFound();
  }

  const published = post.publishedAt
    ? new Date(post.publishedAt)
    : post.date
      ? parseDMMMYYYY(post.date) || new Date(post.date)
      : null;
  
  // Use ID for URL
  const url = `/blog/${post.id}`;

  return (
    <main className="bg-[var(--wnr-cream)] text-[var(--wnr-text)]">
      <section className="py-16 md:py-20 mt-[calc(5rem+var(--offer-strip-height,0px))]">
        <div className="wnr-container max-w-4xl">
          {/* --- Title --- */}
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-center leading-tight md:leading-[1.1]">
            {post.title}
          </h1>

          {/* --- Meta Information --- */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm md:text-base text-neutral-600">
            {published && (
              <time
                dateTime={published.toISOString()}
                className="flex items-center gap-1"
              >
                <span>{published.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</span>
              </time>
            )}
            {post.author && (
              <>
                <span className="text-neutral-400">•</span>
                <span className="flex items-center gap-1">
                  <span>By {post.author}</span>
                </span>
              </>
            )}
            {post.content && (
              <>
                <span className="text-neutral-400">•</span>
                <span className="flex items-center gap-1">
                  <span>{Math.ceil(post.content.split(/\s+/).length / 200)} min read</span>
                </span>
              </>
            )}
          </div>

          {/* --- Hero Image --- */}
          {(post.image || post.featuredImage) && (
            <div className="mt-10 relative aspect-[16/9] rounded-3xl overflow-hidden ring-1 ring-black/5 shadow-xl">
              <Image
                src={post.image || post.featuredImage || ""}
                alt={post.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* --- Excerpt --- */}
          {post.excerpt && (
            <p className="mt-10 text-[1.5rem] md:text-[1.7rem] text-neutral-700 text-center leading-relaxed md:leading-[2] max-w-3xl mx-auto font-light">
              {post.excerpt}
            </p>
          )}

          {/* --- Share Button --- */}
          <div className="mt-8 flex justify-center">
            <ShareButton
              title={post.title}
              url={url}
              excerpt={post.excerpt}
              image={post.image || post.featuredImage || undefined}
            />
          </div>

          {/* --- Divider --- */}
          <div className="mt-12 h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--wnr-berry)]/40 to-transparent rounded-full" />

          {/* --- Main Content --- */}
          <article
            className={[
              "prose prose-neutral max-w-none",
              // SEO-optimized readable font sizes (16px base for accessibility)
              "text-base md:text-lg leading-[1.75] md:leading-[1.8] tracking-wide",
              // headings - proper SEO hierarchy with readable sizes
              "prose-headings:font-semibold prose-headings:text-[var(--wnr-text)] prose-headings:font-serif",
              "prose-h1:text-3xl md:prose-h1:text-4xl lg:prose-h1:text-5xl prose-h1:mt-12 prose-h1:mb-6 prose-h1:leading-tight",
              "prose-h2:text-2xl md:prose-h2:text-3xl lg:prose-h2:text-4xl prose-h2:mt-10 prose-h2:mb-5 prose-h2:leading-tight prose-h2:border-b prose-h2:border-[var(--wnr-berry)]/20 prose-h2:pb-3",
              "prose-h3:text-xl md:prose-h3:text-2xl lg:prose-h3:text-3xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:leading-snug",
              "prose-h4:text-lg md:prose-h4:text-xl lg:prose-h4:text-2xl prose-h4:mt-6 prose-h4:mb-3 prose-h4:leading-snug",
              "prose-h5:text-base md:prose-h5:text-lg lg:prose-h5:text-xl prose-h5:mt-5 prose-h5:mb-2",
              "prose-h6:text-sm md:prose-h6:text-base lg:prose-h6:text-lg prose-h6:mt-4 prose-h6:mb-2",
              // paragraphs - optimal reading line length and spacing
              "prose-p:text-base md:prose-p:text-lg prose-p:leading-[1.75] md:prose-p:leading-[1.8] prose-p:my-6 prose-p:max-w-none",
              "prose-p:font-sans prose-p:text-[var(--wnr-text)]",
              // lists - readable with proper spacing
              "prose-ul:my-6 prose-ol:my-6 prose-li:my-3 prose-li:text-base md:prose-li:text-lg",
              "prose-li:leading-[1.75] prose-li:pl-2",
              "prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6",
              // blockquote style
              "prose-blockquote:border-l-4 prose-blockquote:border-[var(--wnr-berry)]/40 prose-blockquote:italic",
              "prose-blockquote:bg-[rgba(0,0,0,0.03)] prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:my-6 rounded-r-xl",
              "prose-blockquote:text-base md:prose-blockquote:text-lg",
              // links and emphasis
              "prose-a:text-[var(--wnr-berry)] hover:prose-a:underline prose-a:font-medium prose-a:transition-colors prose-a:decoration-2",
              "prose-strong:text-[var(--wnr-text)] prose-strong:font-semibold prose-strong:text-base md:prose-strong:text-lg",
              "prose-em:text-[var(--wnr-text)] prose-em:italic",
              // images - responsive and accessible
              "prose-img:rounded-xl prose-img:ring-1 prose-img:ring-black/5 prose-img:shadow-md prose-img:my-8 prose-img:w-full prose-img:h-auto",
              // code blocks
              "prose-pre:bg-neutral-100 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:text-sm",
              "prose-code:bg-black/[0.06] prose-code:text-[var(--wnr-berry)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
              "prose-code:before:content-none prose-code:after:content-none",
              // horizontal rules
              "prose-hr:border-[var(--wnr-berry)]/20 prose-hr:my-8",
              // tables - responsive
              "prose-table:my-6 prose-th:bg-neutral-100 prose-th:font-semibold prose-th:p-3 prose-td:p-3 prose-td:border prose-td:border-neutral-200 prose-table:text-sm md:prose-table:text-base",
              // container layout
              "mt-12 bg-white/80 backdrop-blur-[1px] rounded-3xl border border-black/5 shadow-lg",
              "px-6 py-8 md:px-12 md:py-12",
            ].join(" ")}
          >
            {post.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom heading styles with proper SEO hierarchy
                  h1: ({ node, ...props }) => (
                    <h1 className="text-[var(--wnr-text)] font-semibold font-serif text-3xl md:text-4xl lg:text-5xl mt-12 mb-6 leading-tight" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-[var(--wnr-text)] font-semibold font-serif text-2xl md:text-3xl lg:text-4xl mt-10 mb-5 leading-tight border-b border-[var(--wnr-berry)]/20 pb-3" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-[var(--wnr-text)] font-semibold font-serif text-xl md:text-2xl lg:text-3xl mt-8 mb-4 leading-snug" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-[var(--wnr-text)] font-semibold font-serif text-lg md:text-xl lg:text-2xl mt-6 mb-3 leading-snug" {...props} />
                  ),
                  h5: ({ node, ...props }) => (
                    <h5 className="text-[var(--wnr-text)] font-semibold text-base md:text-lg lg:text-xl mt-5 mb-2" {...props} />
                  ),
                  h6: ({ node, ...props }) => (
                    <h6 className="text-[var(--wnr-text)] font-semibold text-sm md:text-base lg:text-lg mt-4 mb-2" {...props} />
                  ),
                  // Paragraph spacing with optimal readability
                  p: ({ node, ...props }) => (
                    <p className="mb-6 last:mb-0 text-base md:text-lg leading-[1.75] md:leading-[1.8] text-[var(--wnr-text)]" {...props} />
                  ),
                  // List spacing
                  ul: ({ node, ...props }) => (
                    <ul className="my-6 space-y-2 list-disc pl-6" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="my-6 space-y-2 list-decimal pl-6" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="ml-2 text-base md:text-lg leading-[1.75] pl-2" {...props} />
                  ),
                  // Blockquote
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-[var(--wnr-berry)]/40 italic bg-[rgba(0,0,0,0.03)] px-6 py-4 my-6 rounded-r-xl text-base md:text-lg" {...props} />
                  ),
                  // Links
                  a: ({ node, ...props }) => (
                    <a className="text-[var(--wnr-berry)] hover:underline font-medium transition-colors decoration-2" {...props} />
                  ),
                  // Strong and emphasis
                  strong: ({ node, ...props }) => (
                    <strong className="text-[var(--wnr-text)] font-semibold text-base md:text-lg" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    <em className="text-[var(--wnr-text)] italic" {...props} />
                  ),
                  // Images
                  img: ({ node, ...props }) => (
                    <img className="rounded-xl ring-1 ring-black/5 shadow-md my-8 w-full h-auto" {...props} />
                  ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            ) : (
              <p>
                Wild n Root celebrates natural wellness through Ayurvedic blends that align your
                mind, body, and spirit. Explore our range of brews that connect you with the roots
                of calmness.
              </p>
            )}
          </article>

          {/* --- Share Button Bottom --- */}
          <div className="mt-8 flex justify-center">
            <ShareButton
              title={post.title}
              url={url}
              excerpt={post.excerpt}
              image={post.image || post.featuredImage || undefined}
            />
          </div>

          <BreadcrumbsJsonLd
            id={`blog-${post.slug || post.id}`}
            items={[
              { name: "Home", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}/` },
              { name: "Blog", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}/blog` },
              { name: post.title, url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}${url}` },
            ]}
          />
          <ArticleJsonLd
            headline={post.title}
            description={post.excerpt}
            image={post.image}
            datePublished={published ? published.toISOString() : undefined}
            url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com"}${url}`}
          />
        </div>
      </section>
    </main>
  );
}
