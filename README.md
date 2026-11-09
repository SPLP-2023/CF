# Curiosity Fox

Static website for Curiosity Fox: one-of-a-kind paintings, diorama models and curiosities, plus commissions. No build step; it runs on GitHub Pages as-is.

## Deploy to GitHub Pages
1. Create a new repository (e.g. `curiosity-fox`) and upload everything in this folder, including `.nojekyll`.
2. Repo **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
3. After a minute the site is live at `https://<your-username>.github.io/curiosity-fox/`.
4. Custom domain (optional): add it under Settings → Pages, then point your DNS at GitHub as the page instructs.

## Things to change before launch
- **Products:** edit `js/products.js`. Put photos in `images/` and point each item's `image` at them. Delete the placeholder SVGs.
- **Taking payment:** GitHub Pages can't run a checkout, so each item links out. Create a Stripe Payment Link per piece (Stripe dashboard → Payment Links, limit quantity to 1) and paste it into `buyUrl`. Leave `buyUrl` empty and the button becomes "Enquire to buy" by email.
- **Commission form:** sign up at formspree.io (free tier), create a form, and replace `YOUR_FORM_ID` in `index.html`.
- **Email:** replace `hello@curiosityfox.co.uk` in `index.html` and `js/main.js`.
- **About text and social links:** in `index.html`.

## Preview locally
Open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit http://localhost:8000.
