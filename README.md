# Sumukha Jewellery catalogue

A responsive React and TypeScript catalogue for discovering jewellery and starting product enquiries over WhatsApp. It does not include checkout, payment processing, customer accounts, or a shared/admin publishing system.

## Run locally

```sh
npm install
npm run dev
```

The development site includes clearly marked sample products and Unsplash imagery to demonstrate the layouts. Sample products are omitted from production builds. Do not treat the preview content as confirmed Sumukha inventory.

The temporary published preview is hosted at `https://neha-pd.github.io/sumukha-jewellery/`. Until DNS is configured for the custom domain, the GitHub Pages project URL is the working public address.

While the development server is running, open `/admin` (or use “Manage collection images” in the preview banner) to try different collection images. This preview tool accepts JPG, PNG, WebP, and GIF images up to 8 MB. It stores them in IndexedDB in the current browser, so they remain after a reload on this device, but are not uploaded, shared, or published. The admin page is disabled in production builds and is not an authenticated CMS.

## Configure before launch

1. Copy `.env.example` to `.env`.
2. Set `VITE_WHATSAPP_NUMBER` to the business WhatsApp number in international format using digits only.
3. Set `VITE_SITE_URL` to the deployed site origin (for example, `https://your-domain.example`) for absolute canonical metadata, product structured data, and sitemap generation.
4. Replace preview content and imagery with approved brand assets, product details, prices, and availability.
5. Review the privacy, shipping, and returns pages and update them with the business's confirmed practices.

Without a WhatsApp number, WhatsApp actions display a setup message rather than linking to an invalid number. Without a site URL, the build succeeds but skips sitemap generation.

## Catalogue updates

Edit `src/catalog.json`:

- Add customer-facing products to `products`. Set `published` to `true` only when the product information and images are approved.
- Keep layout-only examples in `previewProducts`; preview items are shown only in development.
- Set optional prices in INR, `available`, `featured`, `isNew`, and `isBestseller` from confirmed catalogue information.
- Optional fields include `fullDescription`, `collection`, `imageAlt`, `images`, `videoUrl`, `material`, `dimensions`, `careInstructions`, `createdAt` (ISO date), `sortOrder`, `seoTitle`, and `seoDescription`.
- Add optional `variants` as `{ "name": "…", "available": true }` entries. Unavailable variants cannot be selected for enquiries.
- Add or update categories in `categories`. Collection routes are generated from each category slug. Set `preview` to `false` or omit it when the category and its image are approved; suggested category cards are hidden in production until then.

Edit `src/site-content.json` for the announcement, hero and brand-story copy and imagery, footer description, Instagram profile/logo, curated gallery, and Reels. The sample gallery is development-only; add approved imagery to `instagramGallery` for production. Reel thumbnails are saved from the public account profile in `public/instagram/reels` and link to their original Instagram posts; update the Reel list and thumbnails when the account's featured posts change.

The JSON file keeps catalogue content separate from the page components. The development-only image preview tool does not edit this file or publish uploads. Editing shared catalogue content requires a code change and redeploy; add Shopify or another protected CMS and shared image storage if staff need to manage live content.

## Build and hosting

```sh
npm run build
npm run preview
```

The build creates a static site in `dist/`. Configure the host to serve `index.html` for application routes; the included `public/_redirects` and `vercel.json` provide fallback rewrites for Netlify- and Vercel-style hosting. Set `VITE_SITE_URL` in the build environment to generate `sitemap.xml` and its `robots.txt` reference.

The Instagram gallery is a manually curated set of design-preview imagery that links to the public profile; it is not a live feed. Replace it with brand-approved images before launch.
