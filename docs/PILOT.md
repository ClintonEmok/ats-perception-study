# Pilot — ATS Perception Study (v4.0)

This pilot verifies the deployed study with 2-3 participants before opening recruitment.

## Goals

- Confirm `/experiment` runs end-to-end on the production deployment.
- Confirm the Convex writes are arriving.
- Confirm the SVG stimulus renders identically across Chrome and Safari on the participants' machines.
- Surface any timing, navigation, or browser-quirk issues that only show up with a real human.
- Estimate average completion time for the 26 trials.

## Participants

- 2-3 colleagues who were not involved in the design of the study.
- A mix of macOS and Windows.
- All should use a desktop browser (Chrome or Safari). Mobile is out of scope for this milestone.

## Procedure

1. **Open the deployed URL** on the production deployment.
2. **Read the consent screen** and click "I consent and want to start".
3. **Complete the instructions** and click "Begin practice".
4. **Run both practice trials** (with feedback). Verify the feedback message matches the participant's expectation.
5. **Run block A and block B** (24 trials total). No feedback is shown. The participant should be able to use the keyboard or mouse to answer.
6. **Answer the questionnaire** (preference + free-text) and submit.
7. **Click "Finish and lock responses"** on the debrief screen.
8. **Report** the following back to the researcher:
   - Total elapsed time
   - Whether anything felt broken, slow, confusing, or off-screen
   - Whether the tab-switch / refresh guard actually triggered when they tried it
   - Whether the SVG stimulus looked crisp on their monitor
   - Whether the 500ms fixation cross felt too long / too short

## Acceptance criteria

The pilot passes if:

- All 26 trials + questionnaire + debrief complete on the first try.
- Convex receives `studySessions`, `studyTrials`, and `studyQuestionnaires` rows for the participant.
- The CSV + JSON export from `src/lib/ats-study/export.ts` round-trips back to a readable file.
- No `console.error` appears in the browser dev tools.
- The bundle size remains below ~500 KB gzipped (`pnpm build` output prints this).

## Researcher runbook

After the pilot, run:

```bash
pnpm exec convex run study:listSessions --prod | tee /tmp/pilot-sessions.json
# Use exportSessionData() to format the response into CSV + JSON for the pilot write-up.
```

If the pilot surfaces a defect, file an issue referencing the participant number, the trial index, the condition (`uniform` or `ats`), the task type, and the exact wording of the bug. Fixes land in subsequent Phase 90 minor versions on the same branch.

## Out of scope for the pilot

- Statistical analysis of accuracy / RT / confidence.
- Participant recruitment messaging.
- Compensation logistics.
