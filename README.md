# From Idea to App · UN Day

Student website for the UNIS UN Day software workshop: *Turn your idea into a working app using AI and real-world data. Build something useful inspired by the UN Sustainable Development Goals. No coding experience needed.*

| Page | What's on it |
|---|---|
| `index.html` · **Ideas** | Workshop framing, four starter questions with ready-to-paste prompts, the annoyance scale, a 3-sentence pitch builder that writes the first AI prompt, the "AI is your intern" rules, how projects are judged, and 2026 industry stats |
| `start.html` · **5-min setup** | Three lanes from computer to code: Gemini Canvas (no new accounts), GitHub Pages (put it online), Codespaces + Copilot (pro setup). Also an age-checked tool table and troubleshooting |
| `apis.html` · **Live data** | Opens with a live explorer for the UN's official [SDG API](https://unstats.un.org/sdgapi/swagger/): pick a goal, indicator and country, see the official numbers, copy the request URL or a starter prompt. Then 33 free APIs that need no key and work from a web page, each with a live **Try it** preview, a build idea and a starter prompt. Filter by topic or SDG |
| `design.html` · **Design kit** | Opens with the UN's official [SDG icons, logo and color wheel](https://www.un.org/sustainabledevelopment/news/communications-material/), a download pack for each goal, the UN's do's and don'ts, and the disclaimer line to paste. Then 26 free front-end resources: animation (GSAP, Anime.js, Motion, Animate.css, AOS, confetti, LottieFiles), components (shadcn/ui, Basecoat, Magic UI, Tailwind, daisyUI, Pico, Uiverse), fonts and icons (Google Fonts, Fontshare, Lucide, Phosphor), charts and maps (Chart.js, Leaflet, D3), and images and color tools. Each card has the line to paste, a sentence to tell the AI, and a live demo whose code students can copy. Also the SDG color palette and "glow-up" prompts |

## Run it locally

No build step. From this folder:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Edit it

- **Add or change an API:** edit the `APIS` list in `assets/apis.js`. Each entry needs `id`, `name`, `cat`, `sdg`, `what`, `idea`, `url`, `docs`, and a `render(data)` function that returns `{ facts, list, images }` for the live preview. Check that the endpoint sends CORS headers, for example: `curl -sI -H 'Origin: https://example.com' URL | grep -i access-control`.
- **Add or change a design resource:** edit the `KIT` list in `assets/design.js`. Pin CDN links to an exact version. A `demo` (`style`, `body`, `script`, optional `include` and `height`) becomes a complete page that runs in a sandboxed iframe and is shown as copyable code.
- **Change the starter questions:** the cards are in `index.html`. Their prompts are in `SPARKS` in `assets/home.js`.
- **Change the prompt template every page uses:** `starterPrompt()` in `assets/site.js`.
- **Colors and layout:** `assets/style.css`. It uses the official SDG colors, light and dark mode, and works at phone width.

## Before the workshop (instructor checklist)

- [ ] **Gemini for students.** Lane 1 relies on Gemini Canvas with school Google accounts. Make sure Gemini is turned on for the student OUs in the Google Admin console. Under-18 school accounts can use Canvas, but file upload and GitHub connect are off for them.
- [ ] **GitHub accounts.** GitHub is 13+. Ask students to sign up before the session. Students who want Copilot Student should apply for [GitHub Education](https://education.github.com/pack) early, because approval can take days.
- [ ] **Backup AI.** ChatGPT is 13+, and under-18s need parent or guardian permission. Settle this ahead of time if it's the fallback.
- [ ] **Claude and Claude Code are 18+**, and Claude Code needs a paid plan. Use them for the instructor demo only: the "yellow website with a header that says Agentic Workshop" race.
- [ ] **Re-test the APIs that morning.** Open the Live data page and press Try it on the ones you plan to feature. The public Overpass (OpenStreetMap) servers were overloaded when this was built.
- [ ] **One school IP, many students.** Watch the rate limits: Open Trivia DB allows 1 request per 5 seconds per IP, Open-Meteo 10,000 calls a day, Where the ISS at about 1 per second.

Tool age rules and API checks were last verified on **October 12, 2026**. The sources are linked on `start.html`.

## Deploy

GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**. `.nojekyll` is included so the files are served as-is.
