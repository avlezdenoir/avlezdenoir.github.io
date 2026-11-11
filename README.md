# Avlez dé noir System

Starter website for GitHub Pages (static public pages) and Vercel (full site + protected API).

## Included
- Animated welcome / loading intro
- Home, About, and editable Pricelist sections
- Private System login
- Vercel serverless API proxy for Bot-Hosting
- API key stays on the server in Vercel Environment Variables
- Dashboard: deployments, status, resource usage, logs, Start / Stop / Restart

## Important architecture
Use **Vercel as the main deployment** for the complete protected System dashboard. GitHub Pages can host a static copy of the public landing/pricelist. The GitHub Pages copy should send its System button to the Vercel `system.html` URL, because GitHub Pages cannot run the private `/api` backend.

## 1. Configure Vercel
Import this repository into Vercel. In Project > Settings > Environment Variables, add:

- `BOT_HOSTING_API_KEY` = your Bot-Hosting API key (starts with `bhk_`)
- `ADMIN_PASSWORD` = a long, unique dashboard password
- `SESSION_SECRET` = a random secret of at least 32 characters
- `APP_ORIGIN` = the exact origin serving the System dashboard, e.g. `https://your-project.vercel.app` (no trailing slash). If you use a custom domain, set that exact origin instead.

Redeploy after adding variables.

Do not put the Bot-Hosting key in HTML, JavaScript, GitHub, or a public `.env` file.

## 2. Create a restricted Bot-Hosting API key
In Bot-Hosting, open Account > Developer > create an API key. For this starter, grant only:
- `deployments:read`
- `deployments:power`

The dashboard currently only reads deployment information/resources/logs and sends Start / Stop / Restart actions. These scopes match the official Bot-Hosting API reference. It does not expose shell execution, file deletion, file upload, or deployment deletion.

## 3. Local CSS build (optional)
```bash
npm install
npm run build:css
```
The compiled CSS file is included at `assets/css/main.css`. The project uses SCSS source in `assets/scss/main.scss`.

## 4. Deploy to Vercel
- Push the project to a GitHub repository.
- Import the repository in Vercel.
- Framework preset: Other.
- Build command: `npm run build:css` (or leave blank if you do not edit SCSS; compiled CSS is included).
- Output directory: leave blank.
- Add the environment variables above and redeploy.

## 5. GitHub Pages mirror
GitHub Pages can serve the static public pages, but cannot execute Vercel Functions. Edit:
`assets/js/config.js`
and set `VERCEL_SYSTEM_URL` to your actual Vercel `system.html` URL. If you publish the exact same code to GitHub Pages, change the System links in `index.html` to that Vercel URL, or keep GitHub Pages as a public-only mirror.

## 6. Edit your pricelist
Edit the cards in `index.html`. Replace the example WhatsApp links (`https://wa.me/`) with your own link and update prices/services.

## Security notes
- Login is protected by a signed, HttpOnly, Secure, SameSite=Strict cookie.
- The backend only allows a small set of Bot-Hosting API paths.
- Never use a full-permission API key for a public dashboard.
- Keep `SESSION_SECRET` private and rotate/revoke API keys if exposed.
- `APP_ORIGIN` is checked for login, logout, and power actions. Use the exact origin of the dashboard.
- The dashboard uses a single shared admin password. Do not share it with visitors; add a proper user/auth provider before offering public customer accounts.
- This starter has a single admin password, not multi-user accounts or a database-backed user system.


## GitHub Pages automated SCSS build
A GitHub Actions workflow is included at `.github/workflows/pages.yml`. Enable Pages with **GitHub Actions** as the build source. On pushes to `main`, it installs Sass, compiles SCSS, and deploys the static site. This does not deploy or run the private API; use Vercel for the System dashboard.
