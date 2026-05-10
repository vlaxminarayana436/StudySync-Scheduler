StudySync – Online Group Study Scheduler
StudySync is a full-stack web application designed to eliminate the friction of organizing group study sessions. By automating the process of matching availability among students, it ensures productive collaboration without the back-and-forth of manual scheduling.

🚀 Key Features
Automated Availability Matching: Intelligently identifies common free time slots among group members to find the optimal study time.

Real-time Collaboration: Powered by Firebase Firestore for instant updates to sessions and group data.

Integrated Video Conferencing: Launch virtual study rooms directly within the platform via the Jitsi Meet API.

Calendar Visualization: Provides a centralized view of upcoming meetings using interactive calendar libraries.

Secure Authentication: Role-based access (Host/Member) managed through Firebase Authentication.

🛠 Tech Stack
Frontend: React.js, TypeScript, Tailwind CSS.

Backend as a Service: Firebase (Firestore, Auth, Hosting).

State Management: React Context API.

Tools: Vite, React Router, FullCalendar.

🏗 Directory Structure
Plaintext
study-scheduler-ui-starter/
├── src/
│   ├── components/    # Reusable UI like AuthForm, Dashboard, SessionList
│   ├── context/       # State management for authentication and groups
│   ├── utils/         # Helper functions for availability matching logic
│   ├── types.tsx      # TypeScript interfaces for data safety
│   └── App.tsx        # Main application routing and logic
├── functions/         # Firebase Cloud Functions for backend processing
├── public/            # Static assets and icons
└── firebase.json      # Firebase configuration for hosting and rules
⚙️ Installation & Setup
Clone the repository:

Bash
git clone https://github.com/vlaxminarayana436/StudySync-Scheduler.git
Install dependencies:

Bash
npm install
Configure Firebase:
Create a .env file in the root directory and add your Firebase credentials:

Plaintext
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
Run the development server:

Bash
npm run dev
🧠 Why This Project?
Finding a common study time among multiple students is a classic coordination problem. StudySync solves this by shifting from "manual polling" to "automated matching," making collaboration faster and more organized. This project demonstrates my ability to build user-centric applications using a modern, scalable cloud-native architecture.

🧪 Challenges Overcome
Handling Real-time Sync: Managed race conditions in availability data using Firestore listeners.

Type Safety: Leveraged TypeScript to ensure robust data flow between the frontend and Firebase.

UI/UX Design: Built a responsive, intuitive dashboard using Tailwind CSS.
