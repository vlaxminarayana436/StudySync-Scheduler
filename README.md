# StudySync – Online Group Study Scheduler

StudySync is a full-stack web application designed to eliminate the friction of organizing group study sessions. By automating the process of matching availability among students, it ensures productive collaboration without the back-and-forth of manual scheduling.

## 🚀 Key Features
* **Automated Availability Matching**: Intelligently identifies common free time slots among group members.
* **Real-time Collaboration**: Powered by Firebase Firestore for instant updates.
* **Integrated Video Conferencing**: Launch virtual study rooms via Jitsi Meet API.
* **Calendar Visualization**: Centralized view of upcoming meetings using interactive libraries.

## 🛠 Tech Stack
* **Frontend**: React.js, TypeScript, Tailwind CSS
* **Backend**: Firebase (Firestore, Auth, Hosting)
* **State Management**: React Context API
* **Tools**: Vite, React Router, FullCalendar

## 🏗 Directory Structure
```text
src/
├── components/    # UI like AuthForm, Dashboard, SessionList
├── context/       # State management for auth and groups
├── utils/         # Availability matching logic
└── types.tsx      # TypeScript interfaces
