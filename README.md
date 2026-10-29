# StudySync Scheduler

**Make time for better study.** StudySync Scheduler helps study groups turn shared availability into a bookable session, with a scheduling flow designed to keep attendance high and reduce repeat exclusions.

## Overview

StudySync is a responsive web application for organizing collaborative study sessions. Students create or join a group, share availability, review ranked meeting suggestions, and—if they are the host—schedule a session and launch a Jitsi Meet room.

The matcher prioritizes attendance first. When multiple windows fit the same number of people, StudySync uses recent match history as a fairness tie-breaker, then considers how many alternatives attendees have.

## Product highlights

- **Study groups and invite codes** — create a group for a course, exam-preparation team, or project and invite members with a code.
- **Shared availability** — select local study windows for the next seven days. Firestore stores exact UTC timestamps so members in different time zones compare the same real-world times.
- **Ranked time suggestions** — search in 30-minute increments for 60-, 90-, or 120-minute sessions. Suggestions require a strict majority and are ranked by attendance, fairness memory, availability scarcity, and then earliest start.
- **Fairness memory** — for the last eight scheduled matches, a member who shared availability but was not accommodated gains miss debt; including them in a later match reduces it. Attendance remains the primary goal, and fairness only breaks attendance ties.
- **Host scheduling** — convert a suggestion into a calendar session. The matched start and end are locked so the saved fairness record reflects the chosen match. The session and its history are written together in Firestore.
- **Jitsi Meet rooms** — launch a dedicated video room from a scheduled session.
- **Role-based experience** — hosts can schedule and manage their sessions; members can review the schedule and ask a host to book a match.
- **Demo mode** — explore the workflow with sample teammates without signing in. Demo groups, availability, sessions, and fairness history stay in the current browser.
- **Responsive workspace** — access overview, calendar, sessions, and time matching on desktop or mobile.

## Technology

- React 18, TypeScript, and Vite
- Firebase Authentication and Cloud Firestore
- Jitsi Meet for study rooms
- date-fns, React Icons, and React Hot Toast
- Custom responsive CSS with Tailwind CSS utilities

## Run locally

### Requirements

- Node.js 22.12 or later (or Node.js 20.19 or later)
- npm

### Install and start

```bash
npm ci
npm run dev
```

Vite prints the local development URL when the server is ready.

### Quality checks

```bash
npm run typecheck
npm run build
npm audit --audit-level=low
```

To serve the production build locally:

```bash
npm run preview
```

## Firebase configuration

The Firebase web-app configuration is defined in `src/utils/firebase.ts`; the Firestore instance is exported from `src/utils/firestore.ts`. For a deployment under your own Firebase project:

1. Create a Firebase project and register a web app.
2. Enable **Google** in Firebase Authentication and enable Cloud Firestore.
3. Add your development and production hostnames to Firebase Authentication's authorized domains.
4. Replace the web-app values in `src/utils/firebase.ts` and update `.firebaserc` to select your project.
5. Review the rules in `firestore.rules` and deploy them before using group features:

   ```bash
   firebase deploy --only firestore:rules
   ```

Firebase Hosting is configured to serve `dist/`. Build and deploy with the Firebase CLI:

```bash
npm run build
firebase deploy --only hosting
```

For Hosting and rules together:

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

The Firestore rules restrict group lists, availability, and match history to group members; allow each member to edit only their own availability; and limit session changes to the session creator. Match-history records are immutable and must be created together with a new group-linked session. The host/member distinction in the client is a product role, not a trusted security boundary; a production service that requires server-enforced host privileges should add trusted role management, such as Firebase custom claims.

## Project structure

```text
src/
  components/       Authentication, dashboard, calendar, sessions, and time matching UI
  utils/demo.ts     Browser-only demo data and storage helpers
  utils/firebase.ts Firebase app and Authentication setup
  utils/firestore.ts Firestore instance
  utils/timeMatching.ts Availability windows, match ranking, and fairness debt
  types.tsx         Shared application and match-history types
firestore.rules     Firestore access rules
firebase.json       Hosting and rules configuration
```

## Resume-ready summary

> Built a responsive study-group scheduling application with React and TypeScript. Implemented shared availability matching, attendance-first recommendations with persistent fairness memory, Firebase Authentication and real-time Firestore persistence, host scheduling, and Jitsi Meet room launch.

StudySync focuses on the end-to-end study-group workflow; this README does not make claims of market exclusivity for availability matching or fairness ranking.
