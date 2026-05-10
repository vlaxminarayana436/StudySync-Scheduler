# StudySync – AI-Ready Group Study Scheduler

A modern, responsive web application for coordinating student study groups. Built with **React 18**, **TypeScript**, and **Firebase**.

## Features
- **Serverless Backend:** Utilizes Firebase Functions for backend logic.
- **Type Safety:** Fully written in TypeScript for robust, error-free development.
- **Dynamic Scheduling:** Dashboard with Calendar views (`CalendarPage.tsx`, `CalendarView.tsx`).
- **Real-time Auth:** Secure login and registration via Firebase Auth.

## Project Structure
- `/src/components`: UI components including `AuthForm`, `Dashboard`, and `SessionList`.
- `/functions`: Serverless backend code for handling data processing.
- `/src/utils`: Utility functions for availability matching logic.