# Predict Care

i want to create a prediction tool with a easy-to-navigate interface that will help predict the effectiveness of different components of structured depression care and potentially their combinations for specific patient profiles. we have patient level and study level of datas of IPD meta analysis, if possible with the given data, an intuitive prediction tool will be developed based on these results for use in general practice. the tool is intended to be introduced by GP and completed by patients either at the practice or independently at home.

The tool is intended to be explicitly practice-oriented. Its form and design will be therefore adapted in close contact with GP offices and patient feedback to develop something with clear practical value and real-world relevance that can be used in the future and thus extend existing evidence towards patient-level prediction and practical implementation. The tool will be developed with several layers of features building on top of each other to allow for flexibility during development. The main goal will be the predictive tool, that presents a questionnaire (incl. the PHQ-9 for depressive symptom severity and basic clinical and demographic information) to the patient, evaluates it and then provides an evidence-informed, patient-level prediction of probable depression outcomes under different forms of depression treatment as well as potentially helpful components of structured depression care. The questionnaire will include a depression scale as well as a safety algorithm with appropriate warning messages, crisis contacts, and guidance on urgent help-seeking, if indications of acute risks, including possible suicidal tendencies, are detected. The tool will further include an option to display aggregated data to the GP or other mental health providers to save time. If time permits, the tool will also include an extra page for explicit, patient-tailored social prescribing components beyond general advice to point the patient towards practical, low-threshold activities and services suited to their needs and circumstances (depending on feasibility ranging from general recommendations to geographically specific local offers). This list may be sourced from generally applicable sources, the offerings of public insurances in Germany or potentially even a list of local providers within a certain geographic region, e.g. community activities, exercise groups, courses, or publicly available support services.

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

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Build the production app into `.output/` |
| `bun run build:dev` | Build in development mode (unminified, useful for debugging) |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint over the project |
| `bun run format` | Format the project with Prettier |

### Running the production build

```sh
bun run build
node .output/server/index.mjs
```

### Project structure

- `src/routes/` — file-based routes (see `src/routes/README.md` for the routing conventions)
- `src/components/` — shared React components, including `src/components/ui/` (shadcn/ui primitives)
- `src/lib/` — domain logic: PHQ-9 scoring, prediction model, safety checks, i18n, session state
- `src/server.ts` / `src/start.ts` — server entry and middleware (SSR error handling, CSRF)
