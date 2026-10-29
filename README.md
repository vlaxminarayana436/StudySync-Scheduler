# StudySync Scheduler

**Live application:** [study-scheduler-3c270.web.app](https://study-scheduler-3c270.web.app/)

StudySync Scheduler is a web application for coordinating study sessions. Users can create or join a study group, share availability, review suggested meeting times, and schedule sessions. Hosts can launch a Jitsi Meet room from a scheduled session. A browser-only demo is also available.

## Features

- Google sign-in through Firebase Authentication.
- Study groups with invite codes and member-specific availability.
- Availability matching in 30-minute increments for 60-, 90-, or 120-minute sessions.
- Up to three suggestions on separate local calendar dates; a suggestion must fit a strict majority of group members.
- Attendance-first ranking, followed by recent fairness history, availability scarcity, and earliest start time.
- Fairness memory based on the eight most recent scheduled matches. A member with shared availability who is not accommodated accrues one miss point; including that member in a later match reduces the score by one, to a minimum of zero.
- Host scheduling, calendar management, and Jitsi Meet room launch.
- Demo groups, sessions, availability, and fairness history stored in the current browser.

## Matching behavior

Group members select study windows for the next seven days. The application converts these windows to UTC ISO timestamps so that members in different time zones can compare the same real-world times. Match candidates are checked in 30-minute increments against the selected session duration.

Candidates are ranked in this order:

1. Number of members who can attend.
2. Accumulated fairness miss points among those attendees.
3. Availability scarcity among those attendees.
4. Earlier start time.

Fairness history is written only after a matched session is successfully created. Firestore stores the session and its history record in the same batch. In demo mode, the corresponding data is stored in browser local storage.

## Technology

- React 18 and TypeScript
- Vite
- Firebase Authentication and Cloud Firestore
- Jitsi Meet
- date-fns, React Icons, and React Hot Toast
- Custom CSS and Tailwind CSS utilities

## Requirements

- Node.js 22.12 or later, or Node.js 20.19 or later
- npm

## Local development

```bash
npm ci
npm run dev
```

Vite prints the local development URL when the server starts.

## Validation

```bash
npm run typecheck
npm run build
npm audit --audit-level=low
```

To serve the production build locally:

```bash
npm run preview
```

## Firebase setup

The Firebase web-app configuration is in `src/utils/firebase.ts`; the Firestore instance is initialized in `src/utils/firestore.ts`. For a separate Firebase project:

1. Create a Firebase project and register a web app.
2. Enable Google as an Authentication provider and create a Cloud Firestore database.
3. Add the development and production hostnames to Firebase Authentication's authorized domains.
4. Replace the web-app configuration in `src/utils/firebase.ts` and update `.firebaserc` to use the intended project.
5. Review and deploy `firestore.rules`:

   ```bash
   firebase deploy --only firestore:rules
   ```

Firebase Hosting serves the `dist/` directory. Build before deploying:

```bash
npm run build
firebase deploy --only hosting
```

To deploy Hosting and Firestore rules together:

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

## Firestore and authorization notes

The rules restrict group lists, availability, and match history to group members. Members can update only their own availability. Match-history records are immutable and can be created only alongside a new group-linked session. Session updates and deletions are limited to the session creator.

The host/member distinction controls the client interface; it is not a trusted server-side authorization boundary. The rules do not independently enforce host-only session creation. A deployment that requires that restriction should add a trusted role mechanism, such as Firebase custom claims, and enforce it in the rules.

## Project structure

```text
src/
  components/         Authentication, dashboard, calendar, sessions, and time matching
  utils/demo.ts       Demo data and browser-storage helpers
  utils/firebase.ts   Firebase app and Authentication setup
  utils/firestore.ts  Firestore initialization
  utils/timeMatching.ts Availability windows, candidate generation, and ranking
  types.tsx           Shared application types
firestore.rules       Firestore access rules
firebase.json         Firebase Hosting and rules configuration
```
