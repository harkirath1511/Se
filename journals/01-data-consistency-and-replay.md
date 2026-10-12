# Journal 1 — Data Consistency and Replay

**Course:** UCS503 — Software Engineering  
**Project:** ReplayDB: Temporal Database Debugging and Time-Travel Replay System  
**Student:** Harkirat Singh

This entry records two issues in the demonstration data flow and counterfactual replay.

## Bug 1: Pages showed inconsistent demonstration data

**Problem encountered.** After a demo incident was created, Studio, Transactions, Branches, and Ledger did not always show the same event data. An event visible on one page could be missing or stale on another.

**Cause.** Page-level flows were creating or holding demo data independently. The pages therefore did not share one source of truth for the demonstration timeline.

**Resolution.** A shared in-memory store was introduced for demonstration mode. Event, transaction, replay, branch, and reset operations use that common store.

**Result.** Injecting Tx 402 updates the related forensic, replay, branch, and ledger views consistently. Reset restores the documented demonstration baseline.

## Bug 2: Branch comparison did not make the incident's effect clear

**Problem encountered.** Excluding a transaction produced an alternative branch, but later events could obscure the direct effect of the excluded transaction when the comparison was evaluated at the latest timestamp.

**Cause.** The comparison point was not tied clearly to the incident. Without a defined evaluation time, the user could not distinguish the incident's direct effect from later changes.

**Resolution.** Branch comparison uses the incident moment as its default evaluation point. The page shows actual and counterfactual record states side by side and identifies fields that differ.

**Result.** In the guided Tx 402 scenario, excluding the incident makes the account's recovered state visible without applying a rollback to the real database.
