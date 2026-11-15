# Procedure Completion Alert & Scenario Refresh Race Condition Across Multiple Tabs / Sessions

---

## 1. Problem Statement

### 1.1 Overview
When a user runs a Supply Chain Procedure (such as `CreateScenarioPopup` to create a child scenario) in **Planning Space** (`plan-sop-planning-mfe`), the UI displays two toast notifications (`SnackbarAlert`):
1. **Running Alert (Info):** `"${procedureName} procedure is running."`
2. **Completion Alert (Success / Error):** `"${procedureName} procedure completed successfully."` (or error message), which also triggers `refreshCallBack` (`doRefresh`) to reload scenarios and view data.

When **two browser tabs** (for example, after performing a **Drill Through**, which opens the target view in a second browser tab while keeping the source view open in the first tab) or **two browser sessions** are open with the **same user logged in on the same process**, the **completion alert ("success") and UI scenario refresh intermittently appear in only ONE tab/browser** and never appear in the other.

### 1.2 Observed Symptoms
1. **Missing Success Toast in the Active Tab:**
   - The `"CreateScenarioPopup procedure is running."` toast always appears in the tab that triggered the procedure.
   - However, the `"CreateScenarioPopup procedure completed successfully."` toast fails to appear in the active tab within 60 seconds, even though the scenario was created on the backend.
2. **Scenario Not Accessible / Not Refreshed in the Other Browser or Tab:**
   - Because the `refreshCallBack` (`doRefresh`) is tied to receiving the `SUCCESS` notification in `startPollingForNotifications`, any tab/browser that misses the unread notification does not automatically refresh its scenario list or dashboard context.
3. **Intermittent E2E Test Failure:**
   - In `playwright-e2e/tests/PlanningSpace/DrillThroughBatch/Test_005_CreateMultipleChildScenariosAfterDrillThrough.spec.ts` (`Test Case 2: Create Default Child Scenario in Target View`), `scenarioPage.verifyAlertMsg('running', 30000)` passes (`true`), `scenarioPage.verifyAlertMsg('success', 60000)` times out (`false`), and `expect(runningValidation && successValidation).toBe(true)` fails at line 87.

---

## 2. Root Cause Analysis

### 2.1 How Procedure Notifications Are Polled (`plan-sop-planning-mfe`)
In `C:\Backend\plan-sop-planning-mfe\src\hooks\useUtil.tsx` (`startPollingForNotifications`, lines 262–338), every mounted Planning Space page (`PageWrapper.tsx` line 122 and `SideNavWithRightPanel.tsx` line 1581) starts a 5-second `setInterval` that polls `POST /lui/notification/v1/searchNotifications`:

```ts
// src/hooks/useUtil.tsx (lines 268–334)
const api = `${config.notifications}/searchNotifications`;
const newIntervalId = setInterval(() => {
  if (currentContext?.entityType) {
    url
      .post(api, {
        referenceType: SOURCE_TYPE[currentContext.entityType],
        referenceIds: [currentContext.entityId], // e.g. ["PSAutomation"]
        offset: 0,
        limit: 1,
        types: ['Procedure']
      })
      .then((res: any) => {
        // If notification is not read already show it to the user
        const notificationData: any = res?.data?.data && res.data.data[0];
        if (notificationData !== undefined && notificationData?.userReadFlag !== true) {
          const data = notificationData?.extFields ? JSON.parse(notificationData.extFields) : {};
          const procedureName = data?.displayName || '';
          let title;
          if (notificationData.severity === ToasterType.SUCCESS) {
            title = setText('procedure.success', { procedureName });
            dispatch(
              showSnackbarAlert(true, title, ALERT_TYPES.SUCCESS, {
                data,
                refreshCallBack,
                autoHideDuration: null,
                autoCloseAlert: true,
                autoCloseAlertDuration: PROCEDURE_AUTO_CLOSE_ALERT_DURATION,
                refreshCall: false
              })
            );
          }
          // ...
          const apiUrl = `${config.notifications}/notifications/${notificationData?.id}`;

          // Mark the notification as read
          url.post(apiUrl, {
            userReadFlag: true,
            action: 'READ'
          });
        }
      });
  }
}, 5000);
```

### 2.2 Why "Running" Always Works, But "Success" Gets Stolen
1. **"Running" toast is local to the initiating tab:**
   In `executeTheSelectedProducure` (`src/hooks/useUtil.tsx`, lines 815–825), as soon as `POST /procedureExecutions` returns `result.executionId`, the initiating tab **immediately** dispatches `showSnackbarAlert(true, "${procedureName} procedure is running.", ALERT_TYPES.INFO)` and stores `executionId` via `dispatch(setIsProcedureExecutedWithExecutionId(result?.executionId))`. It does **not** depend on `/searchNotifications`.
2. **"Success" toast depends entirely on polling `/searchNotifications` with `userReadFlag !== true`:**
   - Both Tab 0 (or Browser 1) and Tab 1 (or Browser 2) poll `POST /lui/notification/v1/searchNotifications` every 5 seconds for the same user and `referenceIds: ["PSAutomation"]`.
   - When the procedure finishes on the backend, a new notification record is created with `userReadFlag: false`.
   - **Whichever tab or browser hits `/searchNotifications` first** sees `userReadFlag: false`, displays the success alert in *that* tab/browser, and immediately sends:
     ```http
     POST /lui/notification/v1/notifications/<id>
     { "userReadFlag": true, "action": "READ" }
     ```
   - **When the second tab/browser polls a few hundred milliseconds later**, `/searchNotifications` returns the same notification with `"userReadFlag": true`.
   - Because of the check `if (notificationData !== undefined && notificationData?.userReadFlag !== true)`, the second tab/browser **completely ignores the notification** — it neither shows the success toast nor runs `refreshCallBack`.
3. **Additional `limit: 1` Bottleneck in Parallel Runs:**
   - Because the request payload specifies `limit: 1`, if two procedures complete within the same 5-second window on the same process, `res.data.data[0]` only returns the newer notification, masking the older unread notification at index `1`.

---

## 3. How to Reproduce

### 3.1 Scenario A: Single Browser via Drill Through (Multi-Tab)
1. Log into Planning Space as `FUNCTIONAL_TEST_USERNAME2` and open process `PSAutomation`.
2. Open source view `Drill Through` (`Tab 0`). Notice in DevTools Network tab that `Tab 0` polls `POST /lui/notification/v1/searchNotifications` every 5 seconds.
3. Perform a **Drill Through** on `BDE Card` so that target view `BDE` opens in a new browser tab (`Tab 1`), leaving `Tab 0` open in the background.
4. In `Tab 1`, click **Procedures -> CreateScenarioPopup**, fill in the child scenario details, and click **Create**.
5. Observe the Network tab in both `Tab 0` and `Tab 1`:
   - Whenever `Tab 0`'s 5-second interval fires after procedure completion but *before* `Tab 1`'s interval, `Tab 0` receives `userReadFlag: false`, shows the success toast in the background tab (`Tab 0`), and posts `{"userReadFlag": true, "action": "READ"}`.
   - `Tab 1` polls `< 1s` later, receives `userReadFlag: true`, and **never shows the success toast**.

### 3.2 Scenario B: Two Separate Browser Sessions (Same User & Process)
1. Open **Browser 1** and **Browser 2**, and log into both with the **same user** (`FUNCTIONAL_TEST_USERNAME2`) on the **same process** (`PSAutomation`).
2. In **Browser 1**, run `CreateScenarioPopup` (or run `Test_005_CreateMultipleChildScenariosAfterDrillThrough.spec.ts` while another browser is open on `PSAutomation`).
3. If **Browser 2** polls `/searchNotifications` first after the procedure completes, **Browser 2** consumes the unread notification and marks it `READ`, causing **Browser 1** to miss both the success toast and the automatic scenario refresh.

---

## 4. How to Fix

### 4.1 Frontend Fix in `plan-sop-planning-mfe` (Recommended Permanent Fix)
Update `startPollingForNotifications` in `C:\Backend\plan-sop-planning-mfe\src\hooks\useUtil.tsx` (lines 262–338) so that:
1. **Hidden background tabs do not steal notifications:** If `document.visibilityState === 'hidden'` and the tab is not actively waiting for its own `isProcedureExecutedWithExecutionIdRef.current`, skip polling on that tick.
2. **Increase `limit: 1` to `limit: 10`:** Prevents concurrent procedures on the same process from hiding each other's completion notifications.
3. **Correlate by `executionId` for the initiating tab:** Since `executeTheSelectedProducure` already stores the triggered procedure's `executionId` in `isProcedureExecutedWithExecutionIdRef.current`, match that `executionId` in `res.data.data` and display the `SUCCESS` / `ERROR` toast in the initiating tab **even if another browser/tab already set `userReadFlag: true`**.
4. **Track handled notification IDs per tab (`Set<string>`):** Prevents a tab from displaying the same notification twice.

```ts
// File: C:\Backend\plan-sop-planning-mfe\src\hooks\useUtil.tsx
const startPollingForNotifications = (refreshCallBack?: any) => {
  const currentPollingId = notificationDetails.pollingId;
  const currentContext = getCurrentContext(selections);
  if (currentPollingId) {
    clearInterval(currentPollingId);
  }
  const api = `${config.notifications}/searchNotifications`;
  const handledNotificationIds = new Set<string>();

  const newIntervalId = setInterval(() => {
    // 1. Do not let hidden background tabs steal notifications unless waiting for a procedure started in that tab
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden' &&
      !isProcedureExecutedWithExecutionIdRef.current
    ) {
      return;
    }

    if (currentContext?.entityType) {
      url
        .post(api, {
          referenceType: SOURCE_TYPE[currentContext.entityType],
          referenceIds: [currentContext.entityId],
          offset: 0,
          limit: 10, // 2. Fetch recent notifications so concurrent runs don't overwrite index 0
          types: ['Procedure']
        })
        .then((res: any) => {
          const notifications: any[] = res?.data?.data || [];
          const activeExecutionId = isProcedureExecutedWithExecutionIdRef.current;

          // 3. Prefer matching the executionId started by this specific tab (works even if userReadFlag is already true)
          let notificationData = activeExecutionId
            ? notifications.find(item => {
                const ext = item?.extFields ? JSON.parse(item.extFields) : {};
                return ext?.executionId === activeExecutionId && item?.severity !== ToasterType.INFO;
              })
            : undefined;

          // 4. Fallback to newest unread notification only when this tab is not waiting on a specific executionId
          if (!notificationData && !activeExecutionId) {
            notificationData = notifications[0]?.userReadFlag !== true ? notifications[0] : undefined;
          }

          if (notificationData !== undefined && !handledNotificationIds.has(notificationData.id)) {
            handledNotificationIds.add(notificationData.id);
            const data = notificationData?.extFields ? JSON.parse(notificationData.extFields) : {};
            const procedureName = data?.displayName || '';
            let title;

            if (notificationData.severity === ToasterType.SUCCESS) {
              title = setText('procedure.success', { procedureName });
              dispatch(
                showSnackbarAlert(true, title, ALERT_TYPES.SUCCESS, {
                  data,
                  refreshCallBack,
                  autoHideDuration: null,
                  autoCloseAlert: true,
                  autoCloseAlertDuration: PROCEDURE_AUTO_CLOSE_ALERT_DURATION,
                  refreshCall: false
                })
              );
              if (activeExecutionId && data?.executionId === activeExecutionId) {
                dispatch(setIsProcedureExecutedWithExecutionId(''));
              }
            } else if (notificationData.severity === ToasterType.ERROR) {
              title = setText('procedure.error', { procedureName });
              dispatch(
                showSnackbarAlert(true, title, ALERT_TYPES.ERROR, {
                  autoHideDuration: null,
                  autoCloseAlert: true,
                  autoCloseAlertDuration: PROCEDURE_AUTO_CLOSE_ALERT_DURATION
                })
              );
              if (activeExecutionId && data?.executionId === activeExecutionId) {
                dispatch(setIsProcedureExecutedWithExecutionId(''));
              }
            } else {
              if (activeExecutionId !== data?.executionId) {
                dispatch(setIsProcedureExecutedWithExecutionId(''));
                title = setText('procedure.info', { procedureName });
                dispatch(
                  showSnackbarAlert(true, title, ALERT_TYPES.INFO, {
                    autoHideDuration: null,
                    autoCloseAlert: true,
                    autoCloseAlertDuration: PROCEDURE_AUTO_CLOSE_ALERT_DURATION
                  })
                );
              }
            }

            if (notificationData?.userReadFlag !== true) {
              const apiUrl = `${config.notifications}/notifications/${notificationData?.id}`;
              url.post(apiUrl, {
                userReadFlag: true,
                action: 'READ'
              });
            }
          }
        });
    }
  }, 5000);
  dispatch(setPollingId(newIntervalId));
};
```

### 4.2 Test-Side Handling / Workarounds (`playwright-e2e`)
Until the frontend fix is deployed to the target environment:
1. **Stop or Close the Parent Tab After Drill Through:**
   In drill-through specs where subsequent steps stay on the child tab (window `1`), either close window `0` after switching to window `1` or abort `/searchNotifications` in window `0` so the background tab cannot mark notifications as `READ`:
   ```ts
   const pages = testUtil.page.context().pages();
   if (pages.length > 1) {
     await pages[0].route('**/searchNotifications', route => route.abort());
   }
   ```
2. **Parallel Test Isolation for Default Scenario State:**
   When running specs in parallel (`--workers > 1`), tests that mutate the **Default Scenario** (`setBaseAsDefaultScenario()` or `isDefault = true`) on the same `(User, Process)` pair should either run serially in the same batch or use distinct users/processes so one worker does not change the default scenario while another worker is asserting it.

---

## 5. What to Test After the Fix

### 5.1 Unit Tests (`plan-sop-planning-mfe`)
Run the existing and updated hook unit tests in `src/hooks/useUtil.test.tsx`:
1. **Unread Notification Handling:** Verify `startPollingForNotifications` dispatches `showSnackbarAlert` with `ALERT_TYPES.SUCCESS` and marks the notification `READ` when `userReadFlag: false`.
2. **Initiating Tab Resilience (`userReadFlag: true`):** Verify that when `isProcedureExecutedWithExecutionId` is set to `"exec-123"`, `startPollingForNotifications` **still** displays the `SUCCESS` / `ERROR` snackbar and invokes `refreshCallBack` even if the returned notification has `userReadFlag: true` (already read by another browser session), and only fires once per notification ID.
3. **Background Tab Suppression:** Verify that when `document.visibilityState === 'hidden'` and `isProcedureExecutedWithExecutionId` is empty, the interval does not poll `/searchNotifications` or consume unread notifications.
4. **Concurrent Notifications (`limit: 10`):** Verify that if the matching `executionId` is at `res.data.data[1]` (because another procedure completed at `data[0]`), the tab still finds and processes `data[1]`.

### 5.2 E2E & Manual Verification (`playwright-e2e`)
1. **Drill-Through Multi-Tab Scenario Creation:**
   Run `Test_005_CreateMultipleChildScenariosAfterDrillThrough.spec.ts` repeatedly (e.g., 3–5 consecutive runs):
   ```bash
   npx cross-env ENVIRONMENT=INTEROP npx playwright test tests/PlanningSpace/DrillThroughBatch/Test_005_CreateMultipleChildScenariosAfterDrillThrough.spec.ts --workers=1 --repeat-each=3
   ```
   Confirm that **Test Case 2**, **Test Case 5**, and **Test Case 6** consistently receive both the `"running"` and `"success"` alerts in the target drill-through tab while the parent tab remains open.
2. **Two Concurrent Browser Sessions (Same User & Process):**
   - Open two separate browser windows logged into `PSAutomation` as the same user.
   - Trigger `CreateScenarioPopup` in Browser 1 while Browser 2 stays open on a Planning Space view.
   - Verify Browser 1 **always** displays `"CreateScenarioPopup procedure completed successfully."` and refreshes the scenario drawer/selector with the new scenario.
3. **Full DrillThroughBatch Regression:**
   Run the full `DrillThroughBatch` suite to ensure no regressions across all drill-through flows:
   ```bash
   npx cross-env ENVIRONMENT=INTEROP npx playwright test tests/PlanningSpace/DrillThroughBatch --workers=1
   ```
