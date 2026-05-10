# StudySync – Online Group Study Scheduler

StudySync is a full-stack web application designed to eliminate the friction of organizing group study sessions. By automating the process of matching availability among students, it ensures productive collaboration without the back-and-forth of manual scheduling.

## 🏗️ Architecture & Directory Structure
The project follows a modular React architecture with a decoupled Firebase backend for real-time data persistence.

* **src/components/**: Reusable UI components including AuthForms, Dashboard, and SessionList.
* **src/context/**: Global state management for authentication and group data using React Context API.
* **src/utils/**: Core algorithmic logic for multi-user availability matching.
* **src/types.tsx**: TypeScript interfaces ensuring robust data safety across the application.

## 🚀 Key Features
* **Automated Availability Matching**: Intelligently identifies common free time slots among group members to find the optimal study time.
* **Real-time Collaboration**: Powered by **Firebase Firestore** for instant updates to sessions and group metadata.
* **Integrated Video Conferencing**: Seamlessly launch virtual study rooms via the **Jitsi Meet API** directly within the dashboard.
* **Secure Authentication**: Role-based access control (Host/Member) managed through **Firebase Authentication**.

## 📊 Technical Specifications
| Attribute | Implementation |
| :--- | :--- |
| **Frontend Framework** | React.js (v18+) with TypeScript |
| **Styling** | Tailwind CSS for responsive UI/UX |
| **Backend as a Service** | Firebase (Firestore, Auth, Hosting) |
| **Build Tool** | Vite for optimized development and bundling |

## ⚙️ Installation & Testing
```bash
# 1. Clone the repository
git clone [https://github.com/vlaxminarayana436/StudySync-Scheduler.git](https://github.com/vlaxminarayana436/StudySync-Scheduler.git)

# 2. Install dependencies
npm install

# 3. Configure environment
# Create a .env file with your VITE_FIREBASE_API_KEY and AUTH_DOMAIN

# 4. Start development server
npm run dev
