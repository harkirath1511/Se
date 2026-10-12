# Journal 3 — Report and Verification

**Course:** UCS503 — Software Engineering  
**Project:** ReplayDB: Temporal Database Debugging and Time-Travel Replay System  
**Student:** Harkirat Singh

This entry records one report-production issue and one verification concern encountered during the project.

## Bug 1: The report draft included template-only content and layout defects

**Problem encountered.** The supplied report template showed a submission checklist and bracketed placeholders. The draft also had title-page fields and page/figure placement that needed correction for the project report.

**Cause.** The template is an editable course scaffold, so its drafting guidance and placeholder content remained in the document during the first report build.

**Resolution.** Project metadata was filled in, template-only checklist and placeholder content was removed, the required report class was included in Overleaf, and page layout, figure placement, and header spacing were adjusted.

**Result.** The report build contains the project content and required diagrams without the visible drafting checklist or unfilled title fields.

## Bug 2: Changes to replay and branch logic risked regressions

**Problem encountered.** Updates to shared state and branch behavior could change replay results or API responses without an obvious visual failure.

**Cause.** Reconstruction depends on correct event ordering, record filtering, and transaction exclusion. An error in any of those can produce plausible but incorrect state.

**Resolution.** Unit and integration coverage was used for reconstruction, difference calculation, branch behavior, and API routes. Manual API checks and browser-based end-to-end review used the Tx 402 incident scenario.

**Result.** The recorded test run passed 31/31 tests. Manual review covered transaction grouping, historical replay, counterfactual recovery, responsive navigation, and resetting the demonstration baseline.
