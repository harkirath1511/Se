# ReplayDB Project Journal

**Course:** UCS503 — Software Engineering  
**Project:** ReplayDB: Temporal Database Debugging and Time-Travel Replay System  
**Student:** Harkirat Singh

This journal records significant implementation and usability issues found during the project, the diagnosis performed, and the final resolution. It is intended to accompany the project report and demonstrate the engineering work carried out beyond the final feature list.

## 1. Independent page state caused inconsistent demo results

**Problem encountered.** The Studio, Transactions, Branches, and Ledger pages initially did not always show the same event data after a demo incident was created. A transaction visible on one page could be absent or stale on another page.

**Cause.** Demo data was being created or held independently in different page-level flows. In a multi-page investigation tool, this breaks the user's mental model: every page must describe the same timeline.

**Resolution.** A shared in-memory data store was introduced for the controlled demonstration mode. All event, transaction, replay, branch, and reset operations now use the same store.

**Result.** Injecting Tx 402 updates the forensic, replay, branch, and ledger views consistently. Resetting the demonstration restores the documented baseline of seven events across four monitored tables.

## 2. Counterfactual comparison was difficult to interpret

**Problem encountered.** A branch could exclude a transaction, but the meaning of the comparison was unclear when later events depended on the excluded transaction. Comparing at the latest timestamp could hide the direct consequence of the incident.

**Cause.** A counterfactual timeline needs a clearly defined evaluation point. Without one, users cannot tell whether a difference is the direct impact of the suspected transaction or an effect of later changes.

**Resolution.** Branch comparison was evaluated at the incident moment by default. The UI presents actual and counterfactual record states side-by-side and identifies fields recovered when the selected transaction is omitted.

**Result.** In the guided scenario, omitting Tx 402 clearly changes Alice's account from `FRAUD/-5000` back to `ACTIVE/950.01` without performing a database rollback.

## 3. The initial interface did not explain the investigation workflow

**Problem encountered.** The first visual review showed that a new user could see separate pages but could not easily understand which page to open first or what each page contributed to an investigation.

**Cause.** The interface exposed powerful features—ledger search, replay, transaction grouping, and branches—without a guided causal path between them.

**Resolution.** The application was revised around a three-step incident workflow: inject or identify the incident, inspect its transaction blast radius, then replay and compare the affected record. Page labels, explanatory copy, error/retry states, and mobile navigation were also improved.

**Result.** Each product page has an explicit purpose:

- **Studio:** replay a selected record through time and inspect field-level changes.
- **Transactions:** identify all rows and tables affected by a transaction.
- **Branches:** compare the actual timeline with a read-only alternative.
- **Ledger:** search the immutable event history.
- **Tables:** manage the monitored change-capture scope.

## 4. Mobile navigation hid parts of the product workflow

**Problem encountered.** At narrow viewport widths, desktop navigation did not provide a clear route to every product page.

**Cause.** The original navigation was designed around the available desktop width rather than a responsive interaction pattern.

**Resolution.** A responsive mobile navigation menu was added and verified across product routes.

**Result.** All pages remain reachable at mobile widths, with the same core investigation workflow available on desktop and mobile.

## 5. Regression risk in replay and API behaviour

**Problem encountered.** Changes to shared state and branch logic could accidentally change replay results or API responses.

**Cause.** Temporal reconstruction is stateful: an incorrect event order, record filter, or excluded transaction can produce plausible but wrong data.

**Resolution.** Unit and integration tests were used for reconstruction, difference calculation, branch behaviour, and API routes. Manual API checks and browser-based end-to-end testing were also performed using the Tx 402 incident scenario.

**Result.** The final suite passed **31/31 tests**. The end-to-end scenario confirmed transaction grouping, historical replay, counterfactual recovery, responsive navigation, and baseline reset.

## 6. Report template contained non-submission content and layout defects

**Problem encountered.** The supplied report template included a visible “Submission Checklist”, bracketed placeholders, title-page fields not relevant to the project, blank chapter-side spacing, and a missing custom class file on the new Overleaf project.

**Cause.** The template was designed as an editable course scaffold. Its instructions and auxiliary files are useful during drafting but should not appear in the submitted PDF.

**Resolution.** The required report class was added to the Overleaf project, title metadata was completed, template-only checklist content and placeholders were removed, page layout was configured for a one-sided report, and figure placement/header spacing were corrected.

**Result.** The final Overleaf build produces a clean 13-page report with a completed title page, table of contents, required diagrams, no compilation errors, and no compiler warnings.

## Final verification summary

| Verification activity | Evidence / outcome |
| --- | --- |
| Unit and integration tests | 31/31 passed |
| API and interaction checks | Tx 402 incident, replay, transaction grouping, and branch comparison verified |
| Responsive visual review | Navigation and key workflows reachable at desktop and mobile widths |
| Report build | 13-page PDF; 0 errors and 0 warnings in Overleaf |

