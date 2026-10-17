import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { categories, products, type Product } from "./catalog";
import siteContent from "./site-content.json";
import { removeCategoryImage, saveCategoryImage, useLocalCategoryImages } from "./local-category-images";

const brandName = siteContent.brandName;
const brandWord = brandName.replace(/\s+Jewellery$/i, "").toLowerCase();
const configuredWhatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
const whatsappNumber = configuredWhatsappNumber.length >= 8 && configuredWhatsappNumber.length <= 15 ? configuredWhatsappNumber : "";
const instagramUrl = siteContent.instagramUrl;
const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const canonicalBaseUrl = (import.meta.env.VITE_SITE_URL || new URL(import.meta.env.BASE_URL, window.location.origin).toString()).replace(/\/+$/, "");

function appPathname() {
  let path = decodeURIComponent(window.location.pathname);
  if (appBasePath && path.startsWith(`${appBasePath}/`)) path = path.slice(appBasePath.length);
  else if (path === appBasePath) path = "/";
  return path.replace(/\/+$/, "") || "/";
}

function compareNewest(first: Product, second: Product) {
  const firstAdded = first.createdAt ? Date.parse(first.createdAt) : Number.NaN;
  const secondAdded = second.createdAt ? Date.parse(second.createdAt) : Number.NaN;
  if (Number.isFinite(firstAdded) && Number.isFinite(secondAdded) && firstAdded !== secondAdded) return secondAdded - firstAdded;
  return Number(second.isNew) - Number(first.isNew) || (first.sortOrder ?? Infinity) - (second.sortOrder ?? Infinity);
}

function Icon({ name, size = 19 }: { name: "search" | "arrow" | "menu" | "close" | "whatsapp" | "share" | "external" | "chevron"; size?: number }) {
  if (name === "whatsapp") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#25D366" d="M12 1.25a10.7 10.7 0 0 0-9.2 16.16L1.4 22.6l5.32-1.4A10.7 10.7 0 1 0 12 1.25Z" />
        <path fill="#fff" d="M8.14 6.8c-.28-.62-.58-.63-.86-.64h-.73c-.26 0-.67.1-1.02.48-.35.38-1.34 1.31-1.34 3.2s1.37 3.71 1.56 3.97c.19.26 2.65 4.25 6.54 5.79 3.24 1.29 3.9 1.03 4.6.96.7-.07 2.25-.92 2.57-1.8.32-.9.32-1.67.23-1.83-.1-.16-.35-.26-.73-.45-.38-.19-2.25-1.11-2.6-1.24-.35-.13-.6-.19-.86.19-.25.38-.98 1.24-1.2 1.5-.22.25-.44.28-.82.09-.38-.19-1.61-.59-3.07-1.89-1.14-1.02-1.91-2.28-2.13-2.66-.22-.38-.02-.58.17-.77.17-.17.38-.45.57-.67.19-.22.25-.38.38-.64.13-.25.06-.48-.03-.67-.09-.19-.83-2.07-1.16-2.82Z" transform="translate(1.2 0.4) scale(.91)" />
      </svg>
    );
  }
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" /></>,
    external: <><path d="M14 4h6v6" /><path d="m20 4-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function InstagramIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="#C13584" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="#C13584" strokeWidth="1.8" />
      <circle cx="17.6" cy="6.6" r="1.1" fill="#F56040" />
    </svg>
  );
}

function ReelIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m10 8 6 4-6 4V8Z" /><path d="m7 3 4 5M15 3l4 5" /></svg>;
}

function whatsappHref(message: string) {
  if (!whatsappNumber || whatsappNumber.length < 8) return undefined;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function productMessage(product: Product, variant = "", quantity = 1) {
  const link = `${canonicalBaseUrl}/products/${product.slug}`;
  const variantText = variant ? `\nSelected style: ${variant}` : "";
  const quantityText = quantity > 1 ? `\nQuantity: ${quantity}` : "";
  return `Hi Sumukha Jewellery! I'm interested in ${product.name}.${variantText}${quantityText} Could you please share more details and availability? Product link: ${link}`;
}

function WhatsAppLink({ children, message, className = "", label }: { children: ReactNode; message: string; className?: string; label?: string }) {
  const href = whatsappHref(message);
  if (!href) {
    return (
      <span className={`${className} whatsapp-disabled`} aria-label={label ?? "WhatsApp contact is not configured"}>
        {children}
        <span className="whatsapp-note">WhatsApp contact to be configured</span>
      </span>
    );
  }
  return <a className={className} href={href} target="_blank" rel="noreferrer" aria-label={label}>{children}</a>;
}

function ProductImage({ src, alt, className = "", eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = src.startsWith("/") ? `${appBasePath}${src}` : src;
  return (
    <div className={`image-wrap ${className}`}>
      {failed ? <div className="image-fallback" aria-label="Image unavailable"><span>SUMUKHA</span></div> : (
        <img src={imageSrc} alt={alt} loading={eager ? "eager" : "lazy"} onError={() => setFailed(true)} />
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <a className="product-image-link" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        <ProductImage src={product.image} alt={product.imageAlt ?? product.name} className="product-image" />
        {product.images?.[0] && <ProductImage src={product.images[0]} alt={`${product.name}, alternate view`} className="product-image product-image-secondary" />}
        {product.preview && <span className="preview-label">Preview</span>}
        {(product.isNew || product.isBestseller) && <span className="product-badge">{product.isNew ? "New" : "Bestseller"}</span>}
        <span className="product-quick-link">Discover <Icon name="arrow" size={15} /></span>
      </a>
      <div className="product-info">
        <div><a className="product-name" href={`/products/${product.slug}`}>{product.name}</a><span className="product-category">{product.category}</span></div>
        {product.price !== undefined ? <span className="product-price">{product.originalPrice !== undefined && product.originalPrice > product.price && <del>₹{product.originalPrice.toLocaleString("en-IN")} </del>}₹{product.price.toLocaleString("en-IN")}</span> : <span className="price-on-request">Price on enquiry</span>}
      </div>
      {product.available === false
        ? <span className="product-unavailable">Currently unavailable</span>
        : <WhatsAppLink className="product-enquire" message={productMessage(product)} label={`Enquire about ${product.name} on WhatsApp`}>
          Enquire on WhatsApp <Icon name="arrow" size={15} />
        </WhatsAppLink>}
    </article>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const links = [
    ["Shop all", "/shop"],
    ["New arrivals", "/new-arrivals"],
    ["Bestsellers", "/bestsellers"],
    ["Collections", "/#collections"],
    ["Our story", "/about"],
  ];
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = `${appBasePath}/shop${searchText.trim() ? `?q=${encodeURIComponent(searchText.trim())}` : ""}`;
  }
  return (
    <>
      <div className="announcement">{siteContent.announcement} <span aria-hidden="true">✳</span></div>
      <header className="site-header">
        <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
          <Icon name={menuOpen ? "close" : "menu"} size={22} />
        </button>
        <a href="/" className="wordmark" aria-label={`${brandName} home`}><img className="brand-avatar" src={siteContent.brandLogo} alt="" /><span className="wordmark-text"><span>{brandWord}</span><small>JEWELLERY</small></span></a>
        <nav className={`main-nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
          {links.map(([label, href]) => <a href={href} key={label} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <a href="/contact" className="mobile-contact-link">Say hello <Icon name="arrow" size={15} /></a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label={searchOpen ? "Close search" : "Open search"} aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Icon name={searchOpen ? "close" : "search"} size={20} /></button>
          <WhatsAppLink className="header-chat" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections." label="Chat with Sumukha on WhatsApp"><Icon name="whatsapp" size={18} /><span>Let’s chat</span></WhatsAppLink>
        </div>
        {searchOpen && <form className="header-search" onSubmit={submitSearch}><Icon name="search" size={19} /><input autoFocus aria-label="Search products" placeholder="What are you looking for?" value={searchText} onChange={(event) => setSearchText(event.target.value)} /><button type="submit">Search</button></form>}
      </header>
      <div className={`mobile-backdrop ${menuOpen ? "visible" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
    </>
  );
}

function SectionHeading({ eyebrow, title, copy, href, linkLabel }: { eyebrow?: string; title: string; copy?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="section-heading">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{copy && <p className="section-copy">{copy}</p>}</div>
      {href && <a className="text-link" href={href}>{linkLabel ?? "Explore all"} <Icon name="arrow" size={16} /></a>}
    </div>
  );
}

function HomePage() {
  const featured = products.filter((product) => product.featured).sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity)).slice(0, 4);
  const arrivals = products.filter((product) => product.isNew).sort(compareNewest).slice(0, 4);
  const { images: categoryImages, error: categoryImageError } = useLocalCategoryImages();
  return (
    <main>
      {import.meta.env.DEV && <div className="preview-banner">You’re viewing a design preview. Sample products and imagery are for layout demonstration only. <a href="/admin">Manage collection images</a></div>}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{siteContent.hero.eyebrow}</p>
          <h1>{siteContent.hero.headline}<br /><em>{siteContent.hero.emphasis}</em></h1>
          <p className="hero-description">{siteContent.hero.description}</p>
          <div className="hero-actions"><a className="button button-dark" href="/shop">Explore the collection <Icon name="arrow" size={17} /></a><WhatsAppLink className="button button-light" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections.">Let’s talk <Icon name="whatsapp" size={17} /></WhatsAppLink></div>
          <div className="hero-note"><span className="hero-note-line" /> {siteContent.hero.note}</div>
        </div>
        <div className="hero-visual">
          <ProductImage src={siteContent.hero.image} alt="Close-up of a contemporary gold-toned jewellery piece" className="hero-image" eager />
          <div className="hero-image-caption"><span>Little details,</span><em>big feeling.</em></div>
          <span className="hero-index">01 — 04</span>
        </div>
        <span className="hero-side-note">JEWELLERY FOR YOUR EVERYDAY</span>
      </section>

      <section className="category-section page-section" id="collections">
        <SectionHeading eyebrow="FIND YOUR FAVOURITE" title="A mood for every moment" copy="Start with the pieces you love to wear." href="/shop" linkLabel="View all pieces" />
        {categoryImageError && <p className="local-image-error" role="alert">Local collection images could not be loaded: {categoryImageError}</p>}
        {categories.length ? <div className="category-grid">
          {categories.map((category, index) => <a className="category-card" href={`/collections/${category.slug}`} key={category.slug}>
            <ProductImage key={categoryImages[category.slug] ?? category.image} src={categoryImages[category.slug] ?? category.image} alt={`${category.name} collection`} className="category-image" />
            <span className="category-number">0{index + 1}</span><span className="category-title">{category.name}<Icon name="arrow" size={16} /></span>
          </a>)}
        </div> : <EmptyCatalogue compact />}
      </section>

      <section className="featured-section page-section">
        <SectionHeading eyebrow="A FEW GOOD THINGS" title="Pieces you’ll love" copy="Little details that make getting dressed feel like you." href="/shop" linkLabel="Shop all pieces" />
        {featured.length ? <div className="product-grid">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyCatalogue />}
      </section>

      <section className="editorial-section">
        <div className="editorial-photo"><ProductImage src={siteContent.story.image} alt="Jewellery details arranged in warm natural light" /></div>
        <div className="editorial-copy"><p className="eyebrow">{siteContent.story.eyebrow}</p><h2>{siteContent.story.headline}<br /><em>{siteContent.story.emphasis}</em></h2><p>{siteContent.story.description}</p><a href="/about" className="text-link">Discover Sumukha <Icon name="arrow" size={16} /></a><span className="editorial-stamp">S<br /><small>EST. IN STYLE</small></span></div>
      </section>

      <section className="arrivals-section page-section">
        <SectionHeading eyebrow="JUST FOUND ITS WAY HERE" title="New little loves" copy="Fresh finds, ready to find their way into your rotation." href="/new-arrivals" linkLabel="View all new arrivals" />
        {arrivals.length ? <div className="product-grid">{arrivals.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyCatalogue compact />}
      </section>

      <section className="inspiration-section">
        <div className="inspiration-heading"><p className="eyebrow">A MOMENT OF INSPIRATION</p><h2>Jewellery that goes<br /><em>where you do.</em></h2><p>Little finishing touches for everything on your calendar — and the plans you haven’t made yet.</p></div>
        <div className="inspiration-collage">{siteContent.inspirationImages.map(({ image, alt }) => <ProductImage src={image} alt={alt} key={image} />)}</div>
      </section>

      <InstagramSection />
      <TrustStrip />
    </main>
  );
}

function EmptyCatalogue({ compact = false }: { compact?: boolean }) {
  return <div className={`empty-catalogue ${compact ? "empty-compact" : ""}`}><span className="empty-mark">S.</span><h3>The next little love is on its way.</h3><p>We’re getting the collection ready. In the meantime, say hello and we’ll help you find your something.</p><WhatsAppLink className="text-link" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections.">Ask us on WhatsApp <Icon name="arrow" size={16} /></WhatsAppLink></div>;
}

function InstagramSection() {
  const gallery = import.meta.env.DEV ? siteContent.previewInstagramGallery : siteContent.instagramGallery;
  return <section className="instagram-section page-section">
    <SectionHeading eyebrow="FOLLOW ALONG" title="Styled by Sumukha" copy="A little inspiration for your next favourite look." />
    {gallery.length ? <div className="instagram-grid">{gallery.map(({ image, alt }) => <a href={instagramUrl} target="_blank" rel="noreferrer" className="instagram-tile" key={image} aria-label={`Visit Sumukha on Instagram — ${alt}`}><ProductImage src={image} alt={alt} /><span>↗</span></a>)}</div> : <div className="instagram-empty">A few lovely things are being gathered here. In the meantime, find us on Instagram.</div>}
    <div className="instagram-follow"><a className="button button-outline" href={instagramUrl} target="_blank" rel="noreferrer"><InstagramIcon /> Follow us on Instagram <Icon name="external" size={16} /></a><p>@sumukha.in · Curated inspiration, not a live feed</p></div>
    {siteContent.instagramReels.length > 0 && <div className="reels-section">
      <div className="reels-heading"><div><p className="eyebrow">A LITTLE IN MOTION</p><h3>Sumukha Reels</h3></div><a className="text-link" href={`${instagramUrl}reels/`} target="_blank" rel="noreferrer">See all reels <Icon name="arrow" size={16} /></a></div>
      <div className="reels-grid">{siteContent.instagramReels.map((reel) => <a className="reel-card" href={reel.url} key={reel.url} target="_blank" rel="noreferrer" aria-label={`Watch Sumukha Reel, ${reel.publishedAt}, on Instagram`}>
        <ProductImage src={reel.image} alt={reel.alt} className="reel-image" />
        <span className="reel-play"><ReelIcon size={24} /></span>
        <span className="reel-date">{reel.publishedAt}</span>
      </a>)}</div>
    </div>}
  </section>;
}

function TrustStrip() {
  return <section className="trust-strip"><div><span className="trust-icon">01</span><strong>{whatsappNumber ? "Here to help" : "Find us on Instagram"}</strong><span>{whatsappNumber ? "Real conversations, on WhatsApp." : "@sumukha.in"}</span></div><div><span className="trust-icon">02</span><strong>Details, on request</strong><span>Ask us anything about a piece.</span></div><div><span className="trust-icon">03</span><strong>Made for your moments</strong><span>Find something that feels like you.</span></div></section>;
}

function Footer() {
  return <footer className="site-footer">
    <div className="footer-main"><div className="footer-brand"><a href="/" className="wordmark"><img className="brand-avatar" src={siteContent.brandLogo} alt="" /><span className="wordmark-text"><span>{brandWord}</span><small>JEWELLERY</small></span></a><p>{siteContent.footerDescription}</p><a className="footer-social" href={instagramUrl} target="_blank" rel="noreferrer"><InstagramIcon size={16} /> @sumukha.in <Icon name="external" size={14} /></a></div>
      <div className="footer-links"><h3>Explore</h3><a href="/shop">Shop all</a><a href="/new-arrivals">New arrivals</a><a href="/bestsellers">Bestsellers</a><a href="/#collections">Collections</a>{import.meta.env.DEV && <a href="/admin">Local image admin</a>}</div>
      <div className="footer-links"><h3>The details</h3><a href="/about">Our story</a><a href="/contact">Contact</a><a href="/faq">FAQs</a><a href="/shipping-returns">Shipping &amp; returns</a><a href="/privacy">Privacy policy</a></div>
      <div className="footer-connect"><p className="eyebrow">GOOD THINGS START HERE</p><h3>Have a question?<br /><em>We’re all ears.</em></h3><WhatsAppLink className="footer-chat" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections."><Icon name="whatsapp" size={18} /> Chat with us <Icon name="arrow" size={16} /></WhatsAppLink></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Sumukha Jewellery</span><span>Made for your moments <i>✳</i></span><a href="#top">Back to top ↑</a></div>
  </footer>;
}

function CatalogPage({ mode, collectionSlug = "" }: { mode: "shop" | "new" | "best" | "collection"; collectionSlug?: string }) {
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(collectionSlug ? categories.find((item) => item.slug === collectionSlug)?.name ?? "" : "");
  const [sort, setSort] = useState("featured");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [limit, setLimit] = useState(8);
  const pageInfo = {
    shop: ["The collection", "A little something for every day.", "SHOP ALL"],
    new: ["Just arrived", "New finds, ready to be your new favourites.", "FRESHLY FOUND"],
    best: ["The favourites", "The pieces you keep coming back to.", "MOST LOVED"],
    collection: [category || "The collection", "Find a piece that feels like you.", "EXPLORE THE EDIT"],
  }[mode];
  const hasPrices = products.some((product) => product.price !== undefined);
  const hasAvailability = products.some((product) => product.available !== undefined);
  const filtered = useMemo(() => {
    let matches = products.filter((product) => {
      if (mode === "new" && !product.isNew) return false;
      if (mode === "best" && !product.isBestseller) return false;
      if (category && product.category.toLowerCase() !== category.toLowerCase()) return false;
      if (query && !`${product.name} ${product.category} ${product.collection ?? ""} ${product.description} ${product.fullDescription ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (availableOnly && product.available !== true) return false;
      if (minimumPrice !== "" && (product.price === undefined || product.price < Number(minimumPrice))) return false;
      if (maximumPrice !== "" && (product.price === undefined || product.price > Number(maximumPrice))) return false;
      return true;
    });
    if (sort === "price-low") matches.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === "price-high") matches.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sort === "featured") matches.sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity));
    if (sort === "newest" || mode === "new") matches = [...matches].sort(compareNewest);
    return matches;
  }, [availableOnly, category, maximumPrice, minimumPrice, mode, query, sort]);
  const displayed = filtered.slice(0, limit);
  return <main className="catalog-page page-section">
    <div className="breadcrumbs"><a href="/">Home</a><span>/</span><span>{pageInfo[0]}</span></div>
    {import.meta.env.DEV && <div className="preview-banner">Design preview — sample products and imagery are not confirmed Sumukha inventory.</div>}
    <div className="catalog-intro"><p className="eyebrow">{pageInfo[2]}</p><h1>{pageInfo[0]}</h1><p>{pageInfo[1]}</p></div>
    <div className="catalog-toolbar"><label className="catalog-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" aria-label="Search products" /></label>
      <div className="catalog-controls"><label>Category <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All pieces</option>{categories.map((item) => <option value={item.name} key={item.slug}>{item.name}</option>)}</select></label><label>Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>{hasPrices && <div className="price-range"><span>₹</span><input type="number" min="0" aria-label="Minimum price in rupees" placeholder="Min" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} /><span>–</span><input type="number" min="0" aria-label="Maximum price in rupees" placeholder="Max" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} /></div>}{hasAvailability && <label className="availability-filter"><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /> Available only</label>}</div>
    </div>
    <div className="results-line"><span>{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</span>{(query || category || minimumPrice || maximumPrice || availableOnly) && <button className="clear-filters" onClick={() => { setQuery(""); setCategory(""); setMinimumPrice(""); setMaximumPrice(""); setAvailableOnly(false); }}>Clear filters</button>}</div>
    {displayed.length ? <div className="product-grid catalog-grid">{displayed.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><span className="empty-mark">S.</span><h2>No pieces just yet.</h2><p>{query || category || minimumPrice || maximumPrice || availableOnly ? "Try changing your search or clearing a filter." : "We’re getting this collection ready. Check back soon or get in touch to ask us about what’s coming."}</p>{query || category || minimumPrice || maximumPrice || availableOnly ? <button className="button button-outline" onClick={() => { setQuery(""); setCategory(""); setMinimumPrice(""); setMaximumPrice(""); setAvailableOnly(false); }}>Clear filters</button> : <WhatsAppLink className="text-link" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections.">Ask us on WhatsApp <Icon name="arrow" size={16} /></WhatsAppLink>}</div>}
    {displayed.length < filtered.length && <button className="button button-outline load-more" onClick={() => setLimit((current) => current + 8)}>Load more pieces</button>}
    <div className="collection-prompt"><span className="eyebrow">NEED A LITTLE HELP?</span><span>Not sure where to start? We’d love to help.</span><WhatsAppLink message="Hi Sumukha Jewellery! Can you help me find the right piece?">Let’s find your piece <Icon name="arrow" size={15} /></WhatsAppLink></div>
  </main>;
}

function ProductPage({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const images = [...new Set([product.image, ...(product.images ?? [])])];
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.find((variant) => variant.available)?.name ?? "");
  const [notice, setNotice] = useState("");
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  const canonical = `${canonicalBaseUrl}/products/${product.slug}`;
  const hasVariants = Boolean(product.variants?.length);
  const selectedVariantAvailable = !hasVariants || product.variants?.some((variant) => variant.name === selectedVariant && variant.available) === true;
  const canEnquire = product.available !== false && selectedVariantAvailable;
  const noAvailableVariant = hasVariants && !product.variants?.some((variant) => variant.available);
  useEffect(() => {
    if (product.preview || document.head.querySelector('script[data-product-schema]')) return;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.fullDescription ?? product.description,
      image: product.image,
      url: canonical,
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
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.productSchema = "true";
    script.textContent = JSON.stringify(structuredData);
    document.head.append(script);
    return () => script.remove();
  }, [canonical, product]);
  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    if (lightboxOpen && !dialog.open) dialog.showModal();
    if (!lightboxOpen && dialog.open) dialog.close();
  }, [lightboxOpen]);
  useEffect(() => {
    if (!lightboxOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setLightboxOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [lightboxOpen]);
  async function shareProduct() {
    setNotice("");
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: `Take a look at ${product.name} from Sumukha Jewellery.`, url: canonical });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(canonical);
        setNotice("Product link copied.");
      } else {
        setNotice(`Copy this link: ${canonical}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNotice("Couldn’t share the link. You can copy the page URL from your browser.");
    }
  }
  return <main className="product-page page-section">
    {product.preview && <div className="preview-banner">Design preview — this is a sample product, not confirmed Sumukha inventory.</div>}
    <div className="breadcrumbs"><a href="/">Home</a><span>/</span><a href="/shop">Shop</a><span>/</span><span>{product.name}</span></div>
    <section className="product-detail">
      <div className="product-gallery"><button className="detail-image-button" onClick={() => setLightboxOpen(true)} aria-label={`Zoom image of ${product.name}`}><ProductImage src={selectedImage} alt={product.name} className="detail-image" /><span>Click to enlarge</span></button><div className="gallery-thumbnails">{images.map((image, index) => <button className={`thumbnail ${selectedImage === image ? "selected" : ""}`} onClick={() => setSelectedImage(image)} aria-label={`View product image ${index + 1}`} key={image}><ProductImage src={image} alt="" /></button>)}</div></div>
      <div className="product-detail-copy"><p className="eyebrow">{(product.collection ?? product.category).toUpperCase()} · THE SUMUKHA EDIT</p><h1>{product.name}</h1><p className="detail-price">{product.price !== undefined ? <>{product.originalPrice !== undefined && product.originalPrice > product.price && <del>₹{product.originalPrice.toLocaleString("en-IN")} </del>}₹{product.price.toLocaleString("en-IN")}</> : "Price on enquiry"}</p><p className="detail-description">{product.fullDescription ?? product.description}</p>
        {(product.available === false || noAvailableVariant) && <p className="availability-unavailable">{noAvailableVariant ? "No styles currently available" : "Currently unavailable"}</p>}
        {product.available === true && !noAvailableVariant && <p className="availability-available"><span /> Available to enquire</p>}
        {product.available === undefined && !noAvailableVariant && <p className="availability-on-request">Ask us about availability</p>}
        {hasVariants && <label className="variant-control">Choose a style<select value={selectedVariant} onChange={(event) => setSelectedVariant(event.target.value)}><option value="" disabled>Select a style</option>{product.variants?.map((variant) => <option value={variant.name} disabled={!variant.available} key={variant.name}>{variant.name}{!variant.available ? " — unavailable" : ""}</option>)}</select></label>}
        <div className="quantity-control"><span>Quantity</span><div><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity" disabled={quantity <= 1}>−</button><span aria-live="polite">{quantity}</span><button onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity">+</button></div></div>
        {canEnquire ? <WhatsAppLink className="button button-dark product-whatsapp" message={productMessage(product, selectedVariant, quantity)} label={`Enquire about ${product.name} on WhatsApp`}><Icon name="whatsapp" size={19} /> Enquire on WhatsApp</WhatsAppLink> : <span className="button button-dark product-whatsapp button-disabled" aria-disabled="true">{product.available === false || noAvailableVariant ? "Currently unavailable" : "Choose an available style"}</span>}
        <button className="share-button" onClick={shareProduct}><Icon name="share" size={18} /> Share this piece</button>{notice && <p className="share-notice" role="status">{notice}</p>}
        {(product.material || product.dimensions || product.careInstructions) && <dl className="product-attributes">{product.material && <div><dt>Material</dt><dd>{product.material}</dd></div>}{product.dimensions && <div><dt>Dimensions</dt><dd>{product.dimensions}</dd></div>}{product.careInstructions && <div><dt>Care</dt><dd>{product.careInstructions}</dd></div>}</dl>}
        {product.videoUrl && <video className="product-video" controls preload="metadata" aria-label={`${product.name} product video`} src={product.videoUrl}>Your browser does not support product video.</video>}
        <div className="product-detail-note"><span>01</span><p>Curious about materials, sizing or care? Just ask us — we’re happy to share more details.</p></div>
      </div>
    </section>
    <dialog ref={lightboxRef} className="product-lightbox" onCancel={() => setLightboxOpen(false)} onClose={() => setLightboxOpen(false)} aria-label={`Enlarged image of ${product.name}`}><button className="lightbox-close" onClick={() => setLightboxOpen(false)}>Close <Icon name="close" size={18} /></button><img src={selectedImage} alt={product.name} /></dialog>
    {related.length > 0 && <section className="related-section"><SectionHeading eyebrow="MORE TO LOVE" title="You might also like" href="/shop" /> <div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
  </main>;
}

function ContentPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <main className="content-page page-section"><div className="breadcrumbs"><a href="/">Home</a><span>/</span><span>{title}</span></div><div className="content-page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="content-body">{children}</div></main>;
}

function AboutPage() {
  return <ContentPage eyebrow={siteContent.about.eyebrow} title={siteContent.about.title}><p className="content-lead">{siteContent.about.lead}</p>{siteContent.about.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<WhatsAppLink className="button button-dark" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections.">Get to know us <Icon name="arrow" size={16} /></WhatsAppLink></ContentPage>;
}

function ContactPage() {
  return <ContentPage eyebrow="WE’RE HERE FOR YOU" title="Say hello."><p className="content-lead">A question, a little styling help, or just want to know more? We’d love to hear from you.</p><div className="contact-card"><span className="eyebrow">THE EASIEST WAY TO REACH US</span><h2>Let’s chat on WhatsApp.</h2><p>Ask us about a piece, availability, or anything else on your mind.</p><WhatsAppLink className="button button-dark" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections."><Icon name="whatsapp" size={18} /> Start a conversation</WhatsAppLink></div><p className="contact-instagram">You can also find us on <a href={instagramUrl} target="_blank" rel="noreferrer">@sumukha.in <Icon name="external" size={13} /></a>.</p></ContentPage>;
}

function FAQPage() {
  const questions = [
    ["How can I place an order?", "Send us an enquiry on WhatsApp about the piece you love. We’ll share the details and help you with the next steps directly."],
    ["How do I find out the price?", "Prices are shared directly by our team. Enquire about any piece and we’ll be happy to help."],
    ["Can I ask about materials or sizing?", "Of course. Send us the product link on WhatsApp and ask us anything. We’ll share the available product information."],
    ["Where can I find shipping and returns information?", "Please contact us before ordering and we’ll share the current delivery and return information for your order."],
  ];
  return <ContentPage eyebrow="A FEW HELPFUL THINGS" title="Good to know."><p className="content-lead">A few answers to get you started. If you don’t see what you’re looking for, just ask.</p><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<Icon name="chevron" size={18} /></summary><p>{answer}</p></details>)}</div><WhatsAppLink className="text-link faq-contact" message="Hi Sumukha Jewellery! I have a question about your jewellery.">Still curious? Talk to us <Icon name="arrow" size={16} /></WhatsAppLink></ContentPage>;
}

function PolicyPage({ type }: { type: "privacy" | "shipping" }) {
  if (type === "privacy") return <ContentPage eyebrow="YOUR PRIVACY MATTERS" title="Privacy policy."><p className="content-lead">Your trust matters. This site is a catalogue designed to help you discover pieces and contact us directly.</p><h2>Information you share</h2><p>This site does not ask you to create an account or enter payment details. If you choose to contact us through WhatsApp or Instagram, the information you share is handled by those services and by us to respond to your enquiry.</p><h2>Cookies and analytics</h2><p>This catalogue does not currently use advertising cookies or analytics tracking. If this changes, this policy will be updated before any optional tracking is introduced.</p><h2>Questions</h2><p>For questions about privacy or a conversation you have started with us, <a href="/contact">get in touch</a>.</p><p className="policy-note">Please have this policy reviewed and updated with the business’s contact and data-retention details before launch.</p></ContentPage>;
  return <ContentPage eyebrow="THE PRACTICAL DETAILS" title="Shipping & returns."><p className="content-lead">We want you to know what to expect. Shipping and return details are shared directly before an order is confirmed.</p><h2>Before you order</h2><p>Delivery timelines, charges, availability, and return or exchange terms may depend on the piece and destination. Please contact us on WhatsApp to confirm the current details for your order.</p><h2>Need help?</h2><p>Send us your question before placing an order and our team will share the information you need.</p><WhatsAppLink className="button button-dark" message="Hi Sumukha Jewellery! Could you please share your current shipping and returns information?">Ask about delivery <Icon name="arrow" size={16} /></WhatsAppLink><p className="policy-note">Replace this general information with the business’s confirmed shipping and return terms before launch.</p></ContentPage>;
}

function NotFoundPage() {
  return <ContentPage eyebrow="NOT QUITE THE RIGHT PLACE" title="This page wandered off."><p className="content-lead">Let’s find you something lovely instead.</p><a className="button button-dark" href="/shop">Explore the collection <Icon name="arrow" size={16} /></a></ContentPage>;
}

function LocalImageAdminPage() {
  const { images, error } = useLocalCategoryImages();
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function uploadImage(slug: string, input: HTMLInputElement) {
    const image = input.files?.[0];
    input.value = "";
    if (!image) return;
    setMessages((current) => ({ ...current, [slug]: "Saving image in this browser…" }));
    try {
      await saveCategoryImage(slug, image);
      setMessages((current) => ({ ...current, [slug]: "Image saved in this browser." }));
    } catch (reason) {
      setMessages((current) => ({ ...current, [slug]: `Upload failed: ${reason instanceof Error ? reason.message : String(reason)}` }));
    }
  }

  async function resetImage(slug: string) {
    setMessages((current) => ({ ...current, [slug]: "Restoring the demo image…" }));
    try {
      await removeCategoryImage(slug);
      setMessages((current) => ({ ...current, [slug]: "Demo image restored." }));
    } catch (reason) {
      setMessages((current) => ({ ...current, [slug]: `Could not reset image: ${reason instanceof Error ? reason.message : String(reason)}` }));
    }
  }

  return <main className="local-admin page-section">
    <div className="breadcrumbs"><a href="/">Home</a><span>/</span><span>Local image admin</span></div>
    <div className="content-page-heading"><p className="eyebrow">DESIGN PREVIEW TOOL</p><h1>Collection images.</h1><p className="content-lead">Choose an image for each collection to preview it on the homepage. Uploads are saved only in this browser.</p></div>
    <aside className="local-admin-warning" role="note"><strong>Local preview only — not a secure admin or publishing tool.</strong><span>Images are stored on this device and browser only. They are not shared with other visitors, synced to Shopify, or published online. These demo collections and images are not confirmed store inventory.</span></aside>
    {error && <p className="local-image-error" role="alert">Saved images could not be loaded: {error}</p>}
    <div className="local-admin-grid">{categories.map((category) => {
      const inputId = `collection-image-${category.slug}`;
      const image = images[category.slug] ?? category.image;
      return <section className="local-admin-card" key={category.slug}>
        <ProductImage key={image} src={image} alt={`${category.name} collection preview`} className="local-admin-image" />
        <div className="local-admin-card-content">
          <p className="eyebrow">COLLECTION PREVIEW</p>
          <h2>{category.name}</h2>
          <label className="button button-dark local-upload-button" htmlFor={inputId}>Choose image</label>
          <input id={inputId} className="local-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { void uploadImage(category.slug, event.currentTarget); }} />
          {images[category.slug] && <button className="button button-outline local-reset-button" type="button" onClick={() => { void resetImage(category.slug); }}>Restore demo image</button>}
          {messages[category.slug] && <p className="local-admin-status" role="status">{messages[category.slug]}</p>}
        </div>
      </section>;
    })}</div>
    <a className="text-link local-admin-back" href="/">Back to the homepage <Icon name="arrow" size={16} /></a>
  </main>;
}

function FloatingWhatsApp() {
  return <WhatsAppLink className="floating-whatsapp" message="Hi Sumukha Jewellery! I'd love to know more about your jewellery collections." label="Chat with Sumukha Jewellery on WhatsApp"><Icon name="whatsapp" size={22} /><span>Let’s talk</span></WhatsAppLink>;
}

function routePage() {
  const path = appPathname();
  if (path === "/admin" && import.meta.env.DEV) return <LocalImageAdminPage />;
  if (path === "/") return <HomePage />;
  if (path === "/shop") return <CatalogPage mode="shop" />;
  if (path === "/new-arrivals") return <CatalogPage mode="new" />;
  if (path === "/bestsellers") return <CatalogPage mode="best" />;
  if (path.startsWith("/collections/")) {
    const collectionSlug = path.split("/")[2] ?? "";
    return categories.some((category) => category.slug === collectionSlug)
      ? <CatalogPage mode="collection" collectionSlug={collectionSlug} />
      : <NotFoundPage />;
  }
  if (path.startsWith("/products/")) {
    const product = products.find((item) => item.slug === path.split("/")[2]);
    return product ? <ProductPage product={product} /> : <NotFoundPage />;
  }
  if (path === "/about") return <AboutPage />;
  if (path === "/contact") return <ContactPage />;
  if (path === "/faq") return <FAQPage />;
  if (path === "/privacy") return <PolicyPage type="privacy" />;
  if (path === "/shipping-returns") return <PolicyPage type="shipping" />;
  return <NotFoundPage />;
}

export default function App() {
  const path = appPathname();
  useEffect(() => {
    function routeInternalLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname !== "/" && !url.pathname.startsWith("/"))) return;
      if (appBasePath && (url.pathname === appBasePath || url.pathname.startsWith(`${appBasePath}/`))) return;
      event.preventDefault();
      window.location.assign(`${appBasePath}${url.pathname}${url.search}${url.hash}`);
    }
    document.addEventListener("click", routeInternalLink);
    return () => document.removeEventListener("click", routeInternalLink);
  }, []);
  useEffect(() => {
    const normalizedPath = path;
    const product = normalizedPath.startsWith("/products/")
      ? products.find((item) => item.slug === normalizedPath.split("/")[2])
      : undefined;
    const category = normalizedPath.startsWith("/collections/")
      ? categories.find((item) => item.slug === normalizedPath.split("/")[2])
      : undefined;
    const metadata: Record<string, [string, string]> = {
      "/": [`${brandName} — Pieces to make your own`, "Discover contemporary jewellery by Sumukha. Browse the collection and enquire directly on WhatsApp."],
      "/shop": [`Shop all | ${brandName}`, "Explore the Sumukha Jewellery collection and find a piece that feels like you."],
      "/new-arrivals": [`New arrivals | ${brandName}`, "See the latest additions to the Sumukha Jewellery collection."],
      "/bestsellers": [`Bestsellers | ${brandName}`, "Discover favourite pieces from the Sumukha Jewellery collection."],
      "/about": [`Our story | ${brandName}`, "Discover the spirit of Sumukha Jewellery and find pieces that feel like you."],
      "/contact": [`Contact | ${brandName}`, "Get in touch with Sumukha Jewellery for product details and assistance."],
      "/faq": [`FAQs | ${brandName}`, "Answers to common questions about Sumukha Jewellery and how to enquire."],
      "/privacy": [`Privacy policy | ${brandName}`, "Learn how Sumukha Jewellery handles information shared through this catalogue."],
      "/shipping-returns": [`Shipping & returns | ${brandName}`, "Find out how to get current shipping and return information from Sumukha Jewellery."],
      ...(import.meta.env.DEV ? { "/admin": [`Local image preview | ${brandName}`, "Preview collection images locally in this browser."] as [string, string] } : {}),
    };
    const [title, description] = product
      ? [product.seoTitle ?? `${product.name} | ${brandName}`, product.seoDescription ?? product.description]
      : category
        ? [`${category.name} collection | ${brandName}`, `Explore ${category.name.toLowerCase()} in the Sumukha Jewellery collection.`]
        : metadata[normalizedPath] ?? [`Page not found | ${brandName}`, "Explore the Sumukha Jewellery collection."];
    const canonicalUrl = `${canonicalBaseUrl}${normalizedPath}`;
    const setMeta = (selector: string, attribute: string, value: string) => {
      let element = document.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, selector.includes("property=") ? selector.match(/property="([^"]+)"/)?.[1] ?? "" : selector.match(/name="([^"]+)"/)?.[1] ?? "");
        document.head.append(element);
      }
      element.setAttribute("content", value);
    };
    document.title = title;
    setMeta('meta[name="description"]', "name", description);
    setMeta('meta[property="og:title"]', "property", title);
    setMeta('meta[property="og:description"]', "property", description);
    setMeta('meta[property="og:url"]', "property", canonicalUrl);
    if (product) setMeta('meta[property="og:image"]', "property", product.image);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;
  }, [path]);
  return <div id="top"><Header />{import.meta.env.DEV && !whatsappNumber && <div className="setup-notice" role="status">WhatsApp enquiries are disabled in this preview. Add a valid number to <code>VITE_WHATSAPP_NUMBER</code>.</div>}{routePage()}<Footer /><FloatingWhatsApp /></div>;
}
