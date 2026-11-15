# Duplicate Node Schedule Cycles: Root Cause Analysis, Workarounds, Database Cleanup, Implementation Fixes, and Playwright API Test Coverage

---

## 1. Problem Statement

### 1.1 Overview
During configuration export and import operations in the Process Orchestration service (affecting processes such as `IOMcCain`, `DeploymentRun2`, and `DeploymentRun3`), the JSON payload contains duplicate cycle definitions within the `nodeSchedule` array.

For example, in the exported process definition for `IOMcCain`:
- **Total entries in `nodeSchedule`:** 106
- **Unique cycles:** 85
- **Duplicate cycles:** 21 cycles exist twice (totaling 42 entries) with exact duplicate date intervals.

### 1.2 Symptom: Casing Mismatch Dual Entries
Every duplicated cycle appears once in **Title Case** and once in **ALL CAPS** with identical start, end, and planned start timestamps:

| Cycle Month | Title Case Entry | ALL CAPS Entry | Date Range |
| :--- | :--- | :--- | :--- |
| **Dec 2023** | `"2023 December"` | `"2023 DECEMBER"` | `2023-12-01T00:00:00` to `2023-12-31T23:59:59` |
| **Jan 2024 – Dec 2024** (12 months) | `"2024 January"` … `"2024 December"` | `"2024 JANUARY"` … `"2024 DECEMBER"` | Full monthly durations |
| **Jan 2025 – Aug 2025** (8 months) | `"2025 January"` … `"2025 August"` | `"2025 JANUARY"` … `"2025 AUGUST"` | Full monthly durations |

### 1.3 Technical Failure Modes & System Impact
1. **SQL Server `MERGE` Failure:**
   During import, the stored procedure `import_node_schedule` performs a `MERGE` on the `node_schedule` table joining against `calendar_cycles`. On SQL Server instances with case-insensitive collation, both `"2024 January"` and `"2024 JANUARY"` match the same target row `(node_id, cycle_id)`, causing the database operation to fail with:
   > *"The MERGE statement attempted to UPDATE or DELETE the same row more than once. This happens when a target row matches more than one source row."*
2. **Orphaned Schedule Records:**
   The ALL CAPS cycles do not belong to the process's assigned calendar (`S&OP Monthly Calendar`), leading to phantom schedules and database bloat.
3. **Export Contamination:**
   Subsequent realm exports propagate the duplicate entries to other realms, causing cascading migration failures.

---


### 1.4 Subprocess Node Level Failure: 
ode_schedule_unique Constraint
In hierarchical processes with child steps (e.g. DeploymentRun2 and DeploymentRun3 containing InitiativesAndAssumptionsReview, DemandReview, SupplyReview, IntegratedReconcillation, ExecutiveBusinessReview), the 
odeSchedule array is present on **every child subprocess node** as well.

If duplicate cycles exist within child nodes, import_node_schedule attempts to insert the same (tenant_id, node_id, cycle_id) tuple multiple times during MERGE, violating the table constraint:
`
Violation of UNIQUE KEY constraint 'node_schedule_unique'. Cannot insert duplicate key in object 'dbo.node_schedule'. The duplicate key value is (tenant_id, node_id, cycle_id).
`
**Resolution:** Any deduplication or validation logic must recursively traverse the full process tree (subprocesses at all depths) to deduplicate 
odeSchedule on all child nodes, not just the root process.

## 2. Root Cause Analysis

### 2.1 Coexistence of Multiple Calendars with Differing Naming Standards
The system defines two monthly calendars with conflicting casing standards:
- **`S&OP Monthly Calendar`:** Defines 102 cycles in **Title Case** (`"2023 December"`, `"2024 January"`, etc.).
- **`Monthly Calendar`:** Defines 132 cycles in **ALL CAPS** (`"2023 DECEMBER"`, `"2024 JANUARY"`, etc.).

### 2.2 Commented-Out Cleanup in Stored Procedure `create_node_schedule`
In `src/main/resources/db/changelog/procedures/create/create-node-schedule.xml` (lines 77–81), the cleanup statement designed to remove obsolete schedule entries when a process switches cycles or calendars is commented out:
```sql
/*DELETE FROM node_schedule
WHERE tenant_id = @tenant_id
AND node_id = @node_id
AND start_date >= @current_cycle_start_date
AND id NOT IN (SELECT id FROM #temp);*/
```

### 2.3 Non-Pruning `MERGE` in `import_node_schedule`
In `src/main/resources/db/changelog/procedures/create/import_node_schedule.xml`:
- The import logic only updates matched records and inserts new ones:
  ```sql
  MERGE node_schedule dst
  USING src ON dst.node_id = src.node_id AND dst.cycle_id = src.cycle_id ...
  WHEN MATCHED THEN UPDATE ...
  WHEN NOT MATCHED BY TARGET THEN INSERT ...
  ```
- It lacks a `WHEN NOT MATCHED BY SOURCE THEN DELETE` clause.
- **Result:** If a process previously had ALL CAPS cycles (due to an earlier calendar association, a template assignment, or an uncleaned import), those rows persist permanently in the database table `node_schedule` even if subsequent import files omit them.

---

## 3. Workaround Details

Before importing the configuration package into a target realm, sanitize the JSON payload by removing the 21 ALL CAPS entries from `nodeSchedule` of `IOMcCain`.

### Why Keep Title Case and Remove ALL CAPS:
1. `IOMcCain` has `"calendarName": "S&OP Monthly Calendar"`.
2. `"S&OP Monthly Calendar"` defines all its cycles in **Title Case**; it contains **zero** ALL CAPS cycles.
3. All other 85 valid cycles in `IOMcCain.nodeSchedule` are in Title Case.
4. The 21 ALL CAPS cycles originated from `"Monthly Calendar"`, an unrelated calendar.

### Automated Python Workaround Script:
```python
import json

po_path = "po.json"

with open(po_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for process in data.get("processes", []):
    if process.get("name") == "IOMcCain":
        orig_schedules = process.get("nodeSchedule", [])
        # Retain only the valid Title Case cycles
        clean_schedules = [
            item for item in orig_schedules 
            if not item.get("cycleName", "").isupper()
        ]
        process["nodeSchedule"] = clean_schedules
        print(f"IOMcCain nodeSchedule sanitized: {len(orig_schedules)} -> {len(clean_schedules)}")

with open(po_path, "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"))
```

---

## 4. How to Delete Existing Contaminated Entries from a Realm

If the target realm has already been imported and contains the duplicate ALL CAPS entries, use one of the following methods:

### Method A: Direct SQL (Recommended if Database Access is Available)

Execute the following script on the target realm's SQL database:

```sql
-- Step 1: Preview the 21 duplicate ALL CAPS records
SELECT 
    ns.id, 
    n.name AS process_name, 
    cc.name AS cycle_name, 
    c.name AS calendar_name
FROM node_schedule ns
INNER JOIN node n 
    ON ns.node_id = n.id AND ns.tenant_id = n.tenant_id
INNER JOIN calendar_cycles cc 
    ON ns.cycle_id = cc.id AND ns.tenant_id = cc.tenant_id
INNER JOIN calendar c 
    ON cc.calendar_id = c.id AND cc.tenant_id = c.tenant_id
WHERE n.name = 'IOMcCain'
  AND c.name = 'Monthly Calendar';

-- Step 2: Delete the duplicate ALL CAPS records
DELETE ns
FROM node_schedule ns
INNER JOIN node n 
    ON ns.node_id = n.id AND ns.tenant_id = n.tenant_id
INNER JOIN calendar_cycles cc 
    ON ns.cycle_id = cc.id AND ns.tenant_id = cc.tenant_id
INNER JOIN calendar c 
    ON cc.calendar_id = c.id AND cc.tenant_id = c.tenant_id
WHERE n.name = 'IOMcCain'
  AND c.name = 'Monthly Calendar';
```

*(Note: To clean `DeploymentRun2` and `DeploymentRun3` as well, replace `n.name = 'IOMcCain'` with `n.name IN ('IOMcCain', 'DeploymentRun2', 'DeploymentRun3')`).*

---

### Method B: Via Process Orchestration REST API / UI (No DB Access)

When direct database access is unavailable, delete the process and re-import the sanitized configuration:

1. **Delete the contaminated process:**
   - In Process Orchestration UI: Find `IOMcCain` and select **Delete**.
   - *Or via REST API:*
     ```http
     DELETE /process/IOMcCain
     Host: <service-url>
     Authorization: Bearer <token>
     ```
   *Rationale:* Stored procedure `delete_node` explicitly executes:
   ```sql
   DELETE FROM node_schedule WHERE tenant_id = @tenant_id AND node_id IN (SELECT id FROM #tempNodes);
   ```
   This deletes the process node, hierarchy, transitions, and all associated `node_schedule` rows.

2. **Re-import the sanitized file:**
   - Import the sanitized `po.json` (or zip archive) containing only the 85 Title Case cycles.
   - The process is recreated cleanly with zero duplicates.

---

## 5. Implementation Fix Details (Backend Service)

To permanently resolve this issue in `plan-sop-process-orchestration-service`, implement the following changes:

### 5.1 Java Validation Layer (`ProcessService.java` / `NodeScheduleService.java`)
Before forwarding `nodeScheduleNodes` to `importNodeSchedule`, validate and deduplicate:
1. **Case-Insensitive Deduplication:**
   ```java
   Map<String, Map<String, Object>> uniqueCycleMap = new LinkedHashMap<>();
   for (Map<String, Object> schedule : nodeScheduleNodes) {
       String cycleName = (String) schedule.get("cycleName");
       if (cycleName != null) {
           String normalizedKey = cycleName.trim().toLowerCase();
           uniqueCycleMap.putIfAbsent(normalizedKey, schedule);
       }
   }
   List<Map<String, Object>> deduplicatedSchedules = new ArrayList<>(uniqueCycleMap.values());
   ```
2. **Calendar Boundary Validation:**
   Reject or discard any schedule item whose `cycleName` does not belong to the process's assigned `calendarName`.

### 5.2 Stored Procedure Update (`import_node_schedule.xml`)
In `import_node_schedule`:
1. **Deduplicate Staging CTE by Cycle ID:**
   In CTE `src`, add `ROW_NUMBER() OVER (PARTITION BY n.id, cc.id ORDER BY ...)` so that even if duplicate cycle names are passed in the JSON payload, only 1 unique row per `(node_id, cycle_id)` is fed to `MERGE`:
   ```sql
   ;WITH deduplicated_src AS (
       SELECT node_id, tenant_id, cycle_id, start_date, end_date, plan_start_date,
              ROW_NUMBER() OVER(PARTITION BY node_id, cycle_id ORDER BY start_date) as rn
       FROM src
   )
   MERGE node_schedule dst
   USING (SELECT * FROM deduplicated_src WHERE rn = 1) src
   ON dst.node_id = src.node_id 
      AND dst.cycle_id = src.cycle_id 
      AND dst.tenant_id = @tenant_id
   WHEN MATCHED THEN ...
   WHEN NOT MATCHED BY TARGET THEN ...
   ```
2. **Pruning Obsolete Schedules:**
   Add logic to delete `node_schedule` records for the process if their associated `cycle_id` belongs to a calendar other than the process's current calendar.

---

## 6. Playwright API Automation Test Coverage (`plan-sop-ui-automation`)

### 6.1 Test File Placement
Place the new automated spec in:
`playwright-e2e/tests/ProcessOrchestrationBackend/Migration/Test_010_DuplicateNodeScheduleCyclesValidation.spec.ts`

### 6.2 Key Test Scenarios to Cover

#### Scenario 1: Case-Insensitive Duplicate Import Validation
- **Goal:** Verify that importing a process containing duplicate cycles with casing differences does not throw SQL Server 500 error (`MERGE statement attempted to UPDATE or DELETE the same row more than once`).
- **Assertion:** Import succeeds (200 OK); exported process returns exactly 1 entry per month.

#### Scenario 2: Cross-Calendar Schedule Prevention
- **Goal:** Verify that cycles belonging to Calendar B cannot be inserted into a process configured with Calendar A.
- **Assertion:** The exported process contains only cycles belonging to its configured calendar.

#### Scenario 3: Process Calendar Switch Cleanup
- **Goal:** Verify that switching a process from Calendar A to Calendar B purges the schedule records of Calendar A.
- **Assertion:** After the calendar update, zero records from Calendar A remain in `nodeSchedule`.

#### Scenario 4: Export-Import-Export Idempotency Check
- **Goal:** Verify that exported payloads have zero duplicate cycles across all processes in the realm.
- **Assertion:**
  ```typescript
  for (const proc of exportedProcesses) {
    const cycles = proc.nodeSchedule.map((ns: any) => ns.cycleName.toLowerCase());
    const uniqueCycles = new Set(cycles);
    expect(cycles.length).toBe(uniqueCycles.size);
  }
  ```

---

### 6.3 Sample Playwright API Test Implementation

```typescript
import { test, expect } from '../../../configs/api-fixtures';
import { ApiUtil } from '../../../util/api.util';

test.describe('Process Migration & Node Schedule Deduplication API Tests', () => {
  const targetBaseUrl = process.env.API_BASE_URL_TARGET as string;
  let apiUtil: ApiUtil;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    apiUtil = new ApiUtil();
    authToken = await apiUtil.getAuthToken(request);
  });

  test('TC01 - Verify process import handles duplicate cycles gracefully without MERGE errors', async ({ request }) => {
    const processName = `Test_Dedup_${Date.now()}`;
    const payload = {
      processes: [
        {
          name: processName,
          displayName: processName,
          calendarName: "S&OP Monthly Calendar",
          cycleName: "2024 January",
          startTransitionType: "MANUAL",
          endTransitionType: "MANUAL",
          isActive: true,
          nodeSchedule: [
            {
              cycleName: "2024 January",
              startDate: "2024-01-01T00:00:00",
              endDate: "2024-01-31T23:59:59",
              planStartDate: "2024-01-01T00:00:00"
            },
            {
              cycleName: "2024 JANUARY", // Duplicate uppercase cycle
              startDate: "2024-01-01T00:00:00",
              endDate: "2024-01-31T23:59:59",
              planStartDate: "2024-01-01T00:00:00"
            }
          ]
        }
      ]
    };

    // Step 1: Import process with duplicate cycles
    const importResponse = await request.post(`${targetBaseUrl}/process/import`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: payload
    });

    expect(importResponse.status(), 'Import should succeed and not throw 500 SQL MERGE error').toBe(200);

    // Step 2: Export process and assert deduplication
    const exportResponse = await request.get(`${targetBaseUrl}/process/${processName}/export`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    expect(exportResponse.ok()).toBeTruthy();

    const exportedData = await exportResponse.json();
    const exportedSchedules = exportedData.nodeSchedule || [];

    // Assert that the duplicate was resolved
    const cycleNames = exportedSchedules.map((s: any) => s.cycleName.toLowerCase());
    const uniqueCycleNames = new Set(cycleNames);
    expect(cycleNames.length).toBe(uniqueCycleNames.size);
    expect(uniqueCycleNames.has('2024 january')).toBeTruthy();

    // Cleanup
    await request.delete(`${targetBaseUrl}/process/${processName}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  });

  test('TC02 - Verify exported processes in realm have 0 duplicate nodeSchedule cycles', async ({ request }) => {
    const exportAllResponse = await request.get(`${targetBaseUrl}/process/export`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    expect(exportAllResponse.ok()).toBeTruthy();

    const allData = await exportAllResponse.json();
    const processes = allData.processes || [];

    for (const proc of processes) {
      const schedules = proc.nodeSchedule || [];
      const cycleList = schedules.map((s: any) => (s.cycleName || '').trim().toLowerCase());
      const uniqueCycles = new Set(cycleList);

      expect(
        cycleList.length,
        `Process '${proc.name}' should not contain duplicate cycles in nodeSchedule`
      ).toBe(uniqueCycles.size);
    }
  });
});
```
