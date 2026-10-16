# From Idea to App · UN Day

Student website for the UNIS UN Day software workshop: *Turn your idea into a working app using AI and real-world data. Build something useful inspired by the UN Sustainable Development Goals. No coding experience needed.*

The site follows the workshop's 5 steps. The nav is the step bar, and every page ends with a link to the next step.

| Step · page | What's on it |
|---|---|
| ① **Ideate** · `index.html` | Live numbers from free APIs, the 5 steps, four starter questions that each show their real data (latest earthquakes, a birthday-heat chart, a snack battle, wildlife photos) with a prompt to copy, a 3-sentence pitch builder that writes the first AI prompt, a vague-vs-specific prompt comparison, and 2026 industry stats that count up |
| ② **Data** · `apis.html` | Opens with a live explorer for the UN's official [SDG API](https://unstats.un.org/sdgapi/swagger/). Then 19 more free, no-key APIs in 7 topics; each card shows 5 live rows of that API's real fields as you scroll, a build idea, and a starter prompt. Filter by topic or SDG. Ends with a fetch snippet you can run on the page |
| ③ **Build** · `start.html` | Three lanes as tabs: Gemini Canvas (no new accounts), GitHub Pages (put it online), Codespaces + Copilot (pro setup). Each step shows the buttons to click and ticks off with a progress bar; Lane 2 builds your GitHub Pages link as you type. Then troubleshooting and the AI coding tools, each in a few words |
| ④ **Design** · `design.html` | The UN's official [SDG icons, colors and logo](https://www.un.org/sustainabledevelopment/news/communications-material/) (tap a goal for its color and pack, do's and don'ts, the disclaimer line), a type tester for 9 free fonts, 10 libraries with live demos (animation, components and icons, charts and maps, art and music: Strudel, p5.js), links to more tools such as CodePen and Teachable Machine, and "glow-up" prompts that restyle a mock app one step at a time |
| ⑤ **Ship** · `ship.html` | The 5-second test, three ways to share and demo, and what to do after today: NASA Space Apps (NYC), AI4ALL and Encode, plus more learning: NextWork (projects) and CodeHS (practice) |

On a computer with a mouse, `site.js` swaps in a custom cursor: a paper plane that turns to face the way you move, leaves a trail of SDG colors and pops confetti on click. Touch screens and "reduce motion" keep the normal one.

## Run it locally

No build step. From this folder:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Edit it

- **Add or change an API:** edit the `APIS` list in `assets/apis.js`. Each entry needs `id`, `name`, `cat`, `sdg`, `what` (used by search), `idea`, `url`, `docs`, and a `peek(data)` function that returns `{ cols, rows, total, images }`: the preview shows the first 5 rows, so use the API's real field names as `cols`. An optional `note` is added to the starter prompt for the AI. Set `manual: true` for heavy, slow or rate-limited APIs so they wait for a click instead of loading on scroll. Any `<div data-peek="id">` on any page shows that API's live rows. Check that the endpoint sends CORS headers, for example: `curl -sI -H 'Origin: https://example.com' URL | grep -i access-control`.
- **Add or change a design resource:** edit the `KIT` list in `assets/design.js`. Pin CDN links to an exact version. A `demo` (`style`, `body`, `script`, optional `include` and `height`) becomes a complete page that runs in a sandboxed iframe and can be copied (`sameOrigin: true` drops the sandbox, which OpenStreetMap's tiles need). Sites with nothing to demo go in `LINKS`, under their group. A demo with `embed` shows a real site in an iframe instead (used for Strudel); the type tester's fonts are in `FONTS` (and in the font links at the top of `design.html`).
- **Change the events:** the "Keep building" cards on `ship.html`. Check dates and age rules each year.
- **Change the starter questions:** the cards are in `index.html`. Their prompts and the birthday and snack widgets are in `assets/home.js`.
- **Change the prompt template every page uses:** `starterPrompt()` in `assets/site.js`.
- **Change the 5 steps:** the nav is the same in all five HTML files, and each page's "Next" card sits at the end of its last section.
- **Colors and layout:** `assets/style.css`. It uses the official SDG colors, light and dark mode, and works at phone width.

## Before the workshop (instructor checklist)

- [ ] **Gemini for students.** Lane 1 relies on Gemini Canvas with school Google accounts. Make sure Gemini is turned on for the student OUs in the Google Admin console. Under-18 school accounts can use Canvas, but file upload and GitHub connect are off for them.
- [ ] **GitHub accounts.** GitHub is 13+. Ask students to sign up before the session. Students who want Copilot Student should apply for [GitHub Education](https://education.github.com/pack) early, because approval can take days.
- [ ] **Backup AI.** ChatGPT is 13+, and under-18s need parent or guardian permission. Settle this ahead of time if it's the fallback.
- [ ] **Claude and Claude Code are 18+**, and Claude Code needs a paid plan. Use them for the instructor demo only: the "yellow website with a header that says Agentic Workshop" race.
- [ ] **Re-test the APIs that morning.** Scroll through the Live data page: every card loads its data as it comes on screen (the heavy ones have a **Load live data** button).
- [ ] **One school IP, many students.** Watch the rate limits: Open-Meteo allows 10,000 calls a day (the birthday chart on the home page uses 5 per date), Where the ISS at about 1 per second.

Tool age rules and API checks were last verified on **October 12, 2026**. Sources: [Gemini for Education](https://support.google.com/a/answer/14571493) · [OpenAI terms](https://openai.com/policies/terms-of-use/) · [GitHub terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) · [Copilot plans](https://docs.github.com/en/copilot/get-started/plans) · [Netlify terms](https://www.netlify.com/legal/terms-of-use/) · [Vercel terms](https://vercel.com/legal/terms) · [Anthropic terms](https://www.anthropic.com/legal/consumer-terms) · [Claude pricing](https://claude.com/pricing) · [Cursor terms](https://cursor.com/terms-of-service) · [Google AI Studio terms](https://ai.google.dev/gemini-api/terms).

## Deploy

GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**. `.nojekyll` is included so the files are served as-is.
