import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function readConfiguredSiteUrl() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL;
  for (const filename of [".env.production", ".env"]) {
    if (!existsSync(filename)) continue;
    const line = readFileSync(filename, "utf8").split(/\r?\n/).find((entry) => entry.startsWith("VITE_SITE_URL="));
    if (line) return line.slice("VITE_SITE_URL=".length).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return "";
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

const configuredUrl = readConfiguredSiteUrl();
let origin = "";
if (configuredUrl) {
  try {
    const url = new URL(configuredUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an http or https URL.");
    origin = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch (error) {
    throw new Error(`Invalid VITE_SITE_URL: ${configuredUrl}`, { cause: error });
  }
} else {
  console.warn("VITE_SITE_URL is not set; route metadata is generated, but canonical URLs and the sitemap need a configured site origin.");
}

const catalogue = JSON.parse(readFileSync(resolve("src/catalog.json"), "utf8"));
const content = JSON.parse(readFileSync(resolve("src/site-content.json"), "utf8"));
const brand = content.brandName;
const categoryRoutes = catalogue.categories
  .filter((category) => category.slug && !category.preview && catalogue.products.some((product) => product.published && product.category === category.name))
  .map((category) => ({
    path: `/collections/${category.slug}`,
    title: `${category.name} collection | ${brand}`,
    description: `Explore ${category.name.toLowerCase()} in the ${brand} collection.`,
  }));
const productRoutes = catalogue.products
  .filter((product) => product.published && !product.preview && product.slug)
  .map((product) => ({
    path: `/products/${product.slug}`,
    title: product.seoTitle ?? `${product.name} | ${brand}`,
    description: product.seoDescription ?? product.description,
    product,
  }));
const routes = [
  { path: "/", title: `${brand} — Pieces to make your own`, description: "Discover contemporary jewellery by Sumukha. Browse the collection and enquire directly on WhatsApp." },
  { path: "/shop", title: `Shop all | ${brand}`, description: `Explore the ${brand} collection and find a piece that feels like you.` },
  { path: "/new-arrivals", title: `New arrivals | ${brand}`, description: `See the latest additions to the ${brand} collection.` },
  { path: "/bestsellers", title: `Bestsellers | ${brand}`, description: `Discover favourite pieces from the ${brand} collection.` },
  { path: "/about", title: `Our story | ${brand}`, description: "Discover the spirit of Sumukha Jewellery and find pieces that feel like you." },
  { path: "/contact", title: `Contact | ${brand}`, description: `Get in touch with ${brand} for product details and assistance.` },
  { path: "/faq", title: `FAQs | ${brand}`, description: `Answers to common questions about ${brand} and how to enquire.` },
  { path: "/privacy", title: `Privacy policy | ${brand}`, description: `Learn how ${brand} handles information shared through this catalogue.` },
  { path: "/shipping-returns", title: `Shipping & returns | ${brand}`, description: `Find out how to get current shipping and return information from ${brand}.` },
  ...categoryRoutes,
  ...productRoutes,
];

const baseHtml = readFileSync(resolve("dist/index.html"), "utf8");
for (const route of routes) {
  let html = baseHtml
    .replace(/<title>.*?<\/title>/, `<title>${escapeAttribute(route.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttribute(route.description)}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttribute(route.title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttribute(route.description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeAttribute(origin ? `${origin}${route.path}` : "")}" />`);
  if (route.product) html = html.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeAttribute(route.product.image)}" />`);
  if (origin) html = html.replace("</head>", `  <link rel="canonical" href="${escapeAttribute(`${origin}${route.path}`)}" />\n  </head>`);
  if (origin && route.product) {
    const product = route.product;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.fullDescription ?? product.description,
      image: [product.image, ...(product.images ?? [])],
      url: `${origin}${route.path}`,
      ...(product.price !== undefined && {
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          price: product.price,
          ...(product.available !== undefined && {
            availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          }),
        },
      }),
    };
    html = html.replace("</head>", `  <script type="application/ld+json" data-product-schema>${escapeJsonForHtml(structuredData)}</script>\n  </head>`);
  }
  const outputPath = route.path === "/" ? resolve("dist/index.html") : resolve("dist", route.path.slice(1), "index.html");
  mkdirSync(resolve(outputPath, ".."), { recursive: true });
  writeFileSync(outputPath, html);
}

if (origin) {
  const locations = routes.map((route) => `  <url><loc>${origin}${route.path}</loc></url>`).join("\n");
  writeFileSync(resolve("dist/sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations}\n</urlset>\n`);

  const robotsPath = resolve("dist/robots.txt");
  const robots = existsSync(robotsPath) ? readFileSync(robotsPath, "utf8").trimEnd() : "User-agent: *\nAllow: /";
  writeFileSync(robotsPath, `${robots}\nSitemap: ${origin}/sitemap.xml\n`);
  console.info(`Generated sitemap for ${routes.length} public routes at ${origin}.`);
} else {
  console.info(`Generated route metadata for ${routes.length} public routes.`);
}
