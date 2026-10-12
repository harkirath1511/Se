# Journal 2 — Interface and Navigation

**Course:** UCS503 — Software Engineering  
**Project:** ReplayDB: Temporal Database Debugging and Time-Travel Replay System  
**Student:** Harkirat Singh

This entry records two usability issues found while reviewing the investigation workflow.

## Bug 1: The investigation workflow was difficult to understand

**Problem encountered.** A first-time user could see the separate product pages but could not easily tell where an investigation should begin or what each page contributed.

**Cause.** The interface exposed features such as ledger search, replay, transaction grouping, and branches without connecting them into a clear investigation sequence.

**Resolution.** The workflow was organized into three steps: identify an incident, inspect its transaction impact, then replay and compare the affected record. Page labels and explanatory copy were revised, along with error and retry states.

**Result.** The pages communicate distinct roles: Studio for replay, Transactions for impact, Branches for alternative timelines, Ledger for event history, and Tables for the monitored change-capture scope.

## Bug 2: Mobile navigation did not expose every product page clearly

**Problem encountered.** At narrow viewport widths, the desktop navigation did not provide a clear route to all product pages.

**Cause.** The navigation was designed for desktop width and did not adapt to a small-screen interaction pattern.

**Resolution.** Responsive mobile navigation was added and reviewed across the product routes.

**Result.** The core investigation workflow remains reachable on both desktop and mobile layouts.
