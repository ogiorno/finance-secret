# Local Finance Dashboard

A local-first personal finance app: one person views and records their own money in a SQLite file, either alone in the browser or through a server on their own computer.

## Language

### Money

**Account**:
A place where the user holds or owes money: bank account, wallet, cash, credit card or loan. Its balance may be negative.
_Avoid_: Wallet, bank

**Transaction**:
A single dated movement of money on one Account. Either an income, an expense or one leg of a Transfer.
_Avoid_: Entry, movement, payment

**Transfer**:
Money moved between two of the user's own Accounts, made of exactly two Legs that cancel out. Never counts as income or expense.
_Avoid_: Internal payment

**Leg**:
One of the two Transactions that make up a Transfer: the outflow from one Account and the inflow to the other.
_Avoid_: Side, half

**Posted**:
A Transaction that has actually happened. Only Posted Transactions count towards balances and totals.
_Avoid_: Confirmed, cleared

**Pending**:
A Transaction that is scheduled or unconfirmed. Shown in lists, never counted in balances or totals.
_Avoid_: Scheduled, draft

**Category**:
A label for classifying income or expense Transactions, with at most one level of sub-category. A Transaction's type must match its Category's type; Transfers have none.
_Avoid_: Tag, group

**Archived**:
An Account or Category that has history but is hidden from new entries. Only unused ones can be deleted; used ones are Archived instead.
_Avoid_: Inactive, deleted, closed

**Net worth**:
The sum of all Account balances (credit cards and loans included, as negatives) plus the current value of all Assets.
_Avoid_: Equity, patrimony

### Modes

**Offline mode**:
Using the app from the public static site with a SQLite file the user loads; everything runs in the browser and changes live in memory until exported.
_Avoid_: Local mode, standalone

**Connected mode**:
Using the app served by the user's own local server, which owns one persistent SQLite file shared by all of the user's devices.
_Avoid_: Online mode, server mode, sync

**Export**:
Saving the in-memory database from Offline mode back to a `.db` file. The only way Offline mode changes persist.
_Avoid_: Save, sync
