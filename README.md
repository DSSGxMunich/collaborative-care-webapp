# Predict Care

Predict Care is a web-based prediction tool for structured depression care. Built on patient-level and study-level data from an individual patient data (IPD) meta-analysis, it estimates how effective different care components - and combinations of them - are likely to be for a specific patient profile. It is designed to be introduced by a GP and completed by patients, either at the practice or independently at home, through an easy-to-navigate interface.

The tool is explicitly practice-oriented: its form and design are shaped in close contact with GP offices and patient feedback, aiming for clear practical value and real-world relevance that extends existing evidence towards patient-level prediction and everyday clinical use. It is built in layers to allow flexibility as development continues. The core feature is a questionnaire — including the PHQ-9 for depressive symptom severity plus basic clinical and demographic information — that is evaluated to produce an evidence-informed, patient-level prediction of probable depression outcomes under different treatments and potentially helpful components of structured depression care. The questionnaire also runs a safety algorithm that surfaces appropriate warning messages, crisis contacts, and guidance on urgent help-seeking whenever it detects indications of acute risk, including possible suicidal tendencies. The tool can additionally present aggregated data to the GP or other mental health providers to save time, and may include a page for patient-tailored social prescribing — pointing patients towards practical, low-threshold activities and services suited to their needs, ranging from general recommendations to geographically specific local offers (e.g. public insurance offerings in Germany, community activities, exercise groups, courses, or other publicly available support services).

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing via TanStack Router)
- [Tailwind CSS](https://tailwindcss.com/) v4 + [shadcn/ui](https://ui.shadcn.com/) components
- [Vite](https://vite.dev/) + [Nitro](https://nitro.build/) for dev/build/server output
- TypeScript, ESLint, Prettier

## Development

### Prerequisites

- [Bun](https://bun.sh/) 1.x (the project uses `bun.lock` and `bunfig.toml`)
- Node.js 20+ is required at runtime for the built server output

### Setup

```sh
git clone https://github.com/DSSGxMunich/collaborative-care-webapp
cd collaborative-care-webapp
bun install
bun run dev
```

The dev server starts at `http://localhost:3000` by default, with hot module reloading.

### Available scripts

| Command                | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `bun run dev`          | Start the Vite dev server                                    |
| `bun run build`        | Build the production app into `.output/`                     |
| `bun run build:dev`    | Build in development mode (unminified, useful for debugging) |
| `bun run preview`      | Preview the production build locally                         |
| `bun run lint`         | Run ESLint over the project                                  |
| `bun run format`       | Format the project with Prettier                             |
| `bun run format:check` | Check formatting with Prettier without writing changes       |
| `bun run typecheck`    | Type-check the project with `tsc`                            |

### Running the production build

```sh
bun run build
node .output/server/index.mjs
```

### Deployment

Every push to `main` builds the app as a fully static site (all routes have no
dynamic segments, so they're prerendered to HTML) and publishes it to
**GitHub Pages** via `.github/workflows/deploy-pages.yml`. Enable it once
under repo Settings → Pages → Source: "GitHub Actions".

The build is prefixed with `/collaborative-care-webapp/` (via `GITHUB_PAGES_BASE`,
matching the repo name) so assets and links resolve correctly at
`https://dssgxmunich.github.io/collaborative-care-webapp/`. Running `bun run build`
locally without that env var builds for a root path instead, e.g. for a
custom domain.

### Project structure

- `src/routes/` - file-based routes (see `src/routes/README.md` for the routing conventions)
- `src/components/` - shared React components, including `src/components/ui/` (shadcn/ui primitives)
- `src/content/` — all bilingual (German/English) user-facing copy, as JSON (`{ "de": ..., "en": ... }` per string), one file per page/topic. Edit these to change wording without touching component code.
- `src/lib/` — domain logic: PHQ-9 scoring, the risk score + network meta-regression outcome model (`model.ts`, `safety.ts`), i18n, session state
- `src/server.ts` / `src/start.ts` — server entry and middleware (SSR error handling, CSRF)

### Model

Predictions come from two independent parts, both prototype/provisional:

1. **Safety risk score** (`src/lib/safety.ts`) — from the three safety questions plus PHQ-9 severity. Drives the crisis message only, no outcome numbers.
2. **Outcome model** (`src/lib/riskScore.ts` + `src/lib/model.ts`) — a two-step model estimating the 12-month PHQ-9 score under usual care and under each structured-care component/package added to usual care:
   - **Step 1** (`src/lib/riskScore.ts`, data: `src/lib/data/risk-model.json`) — an ordinal regression (`rms::orm`), fitted on individual patient data, predicting each patient's expected 12-month PHQ-9 under usual care ("risk score") from age, sex, baseline PHQ-9 and GAD-7.
   - **Step 2** (`src/lib/model.ts`, data: `src/lib/data/nma-posterior.json`) — a 6-component network meta-analysis (CNMA) fitted with PyMC on individual-patient data across 7 trials, estimating the 12-month PHQ-9 for usual care plus each trial-observed combination of structured-care components, letting each component's effect vary with the Step-1 risk score. `nma-posterior.json` holds the real (thinned) MCMC posterior draws — 4 chains x 4000 draws, thinned to every 8th (2000 draws) — for `alpha_study`, `lambda_risk`, `beta_component` and `delta_component_risk`, plus a `summary` of posterior means/95% credible intervals from the full unthinned posterior, kept for transparency. Every prediction, including the posterior-distribution chart on the results page (`posteriorEndpointDraws`), is a Monte Carlo simulation over these real draws — not an approximation from a summary-table CI.
