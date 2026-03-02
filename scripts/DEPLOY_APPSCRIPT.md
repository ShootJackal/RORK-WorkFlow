# TaskFlow Apps Script – Deploy & API Reference

## Full redeploy (replace existing script)

1. Open your **Google Sheet** (the one connected to TaskFlow).
2. **Extensions → Apps Script** (opens the script editor).
3. In the editor, **select all** (Cmd+A / Ctrl+A) and **delete**.
4. Open **`appscript.gs`** in this repo, select all, copy.
5. Paste into the Apps Script editor and **Save** (Ctrl+S / Cmd+S).
6. **Deploy → Manage deployments** → click the **pencil (Edit)** on the existing deployment.
7. Under **Version**, choose **New version** (optional: add description e.g. "v4.1 weekly leaderboard + active rigs").
8. Click **Deploy**. Do **not** change the Web app URL.
9. Copy the **Web app URL** only if you created a new deployment; otherwise the existing URL (in `EXPO_PUBLIC_GOOGLE_SCRIPT_URL`) stays the same.

---

## Read actions (GET)

| Action | Parameter(s) | Returns | Source sheet(s) |
|--------|--------------|--------|------------------|
| `getCollectors` | — | `{ name, rigs, email, weeklyCap, active, hoursUploaded, rating }[]` | Collectors |
| `getTasks` | — | `{ name }[]` | TASK_LIST |
| `getLeaderboard` | `period` (optional: `thisWeek`, `lastWeek`) | `{ rank, collectorName, hoursLogged, tasksCompleted, tasksAssigned, completionRate, region }[]` | Assignments (+ CA_TAGGED for region), filtered by week when period set |
| `getCollectorStats` | `collector` | Collector stats + weekly hours, top tasks | Assignments, CA_TAGGED, Collectors |
| `getTodayLog` | `collector` | Today’s assignments + active | Assignments |
| `getRecollections` | — | Task names needing recollection | Task Actuals |
| `getFullLog` | `collector` (optional) | All assignments (optionally filtered) | Assignments |
| `getTaskActualsSheet` | — | Task actuals rows (collected/good/remaining hrs, status) | Task Actuals \| Redashpull |
| `getAdminDashboardData` | — | Tasks/recollect counts, collector summary, `activeRigsToday` | Task Actuals, Collectors, RS_Task_Req, CA_TAGGED |
| `getActiveRigsCount` | — | `{ activeRigsToday: number }` | CA_TAGGED (unique rigs with upload date = today) |
| `getAppCache` | — | Cached key/value (e.g. leaderboard fallback) | _AppCache |
| `refreshCache` | — | Warms cache; returns `{ leaderboardCount, cached }` | — |

---

## Write action (POST)

**Endpoint:** same Web app URL, method **POST**, body **JSON**.

| Payload | Description |
|--------|-------------|
| `submitAction(body)` | `body`: `{ collector, task, hours, actionType, notes }`. `actionType`: `ASSIGN` \| `COMPLETE` \| `CANCEL` \| `NOTE_ONLY`. Writes to **Collector Task Assignments Log** (append or update row). |

---

## Sheet names (must match exactly)

- **Collectors**
- **TASK_LIST**
- **CA_TAGGED**
- **CA_INDEX**
- **Task Actuals \| Redashpull**
- **Collector Task Assignments Log**
- **RS_Task_Req**
- **_AppCache**

---

## Behavior summary

- **Leaderboard “This Week” / “Last Week”**: Uses **Assignments** with `AssignedDate` in that Mon–Sun window; no fallback to Collectors hours for weekly.
- **Active rigs (Live tab)**: Unique rigs in **CA_TAGGED** with **Date = today** (script timezone); resets at midnight until next upload.
- **Collector stats**: Weekly hours from **Assignments** (week start = Monday); total can be topped up from **CA_TAGGED** and **Collectors** for all-time only.
- **Submit (ASSIGN/COMPLETE/CANCEL/NOTE_ONLY)**: Finds matching open assignment by collector + task and updates **Collector Task Assignments Log** (Status, LoggedHrs, RemainingHrs, CompletedDate, Notes) or appends new row for ASSIGN/COMPLETE.
