# DocDoc BD - Project Documentation

## Table of Contents

1.  [Introduction](#introduction)
2.  [Tech Stack](#tech-stack)
3.  [Project Structure](#project-structure)
4.  [Core Features](#core-features)
    -   [Performance & Caching Strategy](#performance--caching-strategy)
    -   [Interactive Dashboard](#interactive-dashboard)
    -   [User Authentication](#user-authentication)
    -   [File Management System](#file-management-system)
    -   [Client Management](#client-management)
    -   [Institution Management](#institution-management)
    -   [Electricity Bill Management](#electricity-bill-management)
    -   [Dynamic Printing](#dynamic-printing)
    -   [AI Integration (Genkit)](#ai-integration-genkit)
5.  [Development Guide](#development-guide)

---

## Introduction

**DocDoc BD** is a digital document management application engineered for speed and efficiency. Its primary purpose is to simplify and automate the process of creating, managing, and printing various types of documents, such as certificates and electricity bills. The application is designed to be initiated by a super-admin and can subsequently manage information for multiple users and clients, with a strong focus on a seamless and fast user experience.

---

## Tech Stack

This project is built with a modern and robust technology stack:

-   **Frontend:** [Next.js](https://nextjs.org/) (with App Router) & [React](https://react.dev/)
-   **UI Library:** [ShadCN UI](https://ui.shadcn.com/) & [Tailwind CSS](https://tailwindcss.com/)
-   **Backend & Database:** [Supabase](https://supabase.io/) (PostgreSQL, Authentication, Storage)
-   **AI Integration:** [Genkit (Firebase GenAI)](https://firebase.google.com/docs/genkit)
-   **Form Management:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) (Validation)
-   **TypeScript:** The entire project is built with type-safe code.
-   **File Storage:** [Cloudflare R2](https://www.cloudflare.com/products/r2/) for image uploads.

---

## Project Structure

The project's folder structure follows the conventions of the Next.js App Router:

-   `src/app/(authenticated)`: Protected routes for logged-in users (e.g., Dashboard, Files, Clients).
-   `src/app/(unauthenticated)`: Routes for users who are not logged in (Login, Sign-up, Forgot Password).
-   `src/app/(print)`: Routes with special layouts for print previews.
-   `src/app/api`: Server-side API routes (e.g., authentication callbacks).
-   `src/components/ui`: UI components generated from ShadCN UI.
-   `src/lib/supabase`: Supabase admin and client SDK configurations.
-   `src/lib/supabase/database.ts`: All CRUD (Create, Read, Update, Delete) functions for interacting with the Supabase database, including cache revalidation logic.
-   `src/lib/r2.ts`: Functions for uploading files to Cloudflare R2.
-   `src/ai/flows`: AI flows created using Genkit.

---

## Core Features

### Performance & Caching Strategy

The application employs a sophisticated, multi-layered caching strategy to ensure maximum performance and a fluid user experience.

-   **Aggressive Caching (Dashboard):** The main dashboard stats are heavily cached to load almost instantly. This cache is only invalidated manually via a "Purge Cache" button, ensuring the fastest possible access to overview data.
-   **Smart Revalidation (Data Tables):** Pages like Files and Clients use a balanced approach. They load quickly from cache, but any data mutation (add, edit, delete) automatically triggers a cache revalidation (`revalidatePath`), ensuring the user always sees the most up-to-date information without a manual refresh.
-   **Smart Prefetching (File List & Print Views):** To make navigation and printing feel instantaneous, the application uses smart prefetching. When a user navigates to the Files page, the data for the *next* page is pre-fetched in the background. Similarly, when a user hovers over a file in the list, the data for its print view is pre-fetched.

### Interactive Dashboard

The dashboard serves as a central hub for "Quick Actions," designed for maximum efficiency.

-   **Instant Dialogs:** Instead of navigating to new pages, clicking on action cards like "Add New File" or "Add New Client" immediately triggers a dialog (modal) with the required form. This is achieved by converting the dashboard to a client component that manages state locally.
-   **Lazy Loading Data:** Data required for the dialog forms (e.g., client lists) is loaded lazily *only when* the user clicks to open a dialog, ensuring the dashboard itself loads as quickly as possible.
-   **Statistical Reports:** The dashboard features comprehensive reports with an advanced filtering system (daily, weekly, monthly, custom ranges) to visualize data trends.

### User Authentication

-   **Super-Admin Signup:** When the application is launched for the first time with no users, a sign-up page is displayed. The first user is automatically registered as a **super-admin**.
-   **User Creation:** The super-admin or an admin can create new users (`admin` or `staff`).
-   **Role-Based Access Control (RBAC):**
    -   **Super-Admin:** Has all permissions, including the ability to reset the application.
    -   **Admin:** Can create and manage users.
    -   **Staff:** Can only perform data entry and management tasks.
-   **Login & Session Management:** Login with email and password. User session state is managed using Supabase Auth and cookies.
-   **Password Reset:** Users can reset their password via email.

### File Management System

The "File" is the central concept of this application. Each file represents an applicant and can have various documents (certificates, electricity bills) associated with it.

-   **File Creation:**
    -   A new file is created with the applicant's name, date of birth/year, and client information.
    -   Optional checkboxes allow for the simultaneous creation of a **Certificate** or **Electricity Bill**.
    -   If these options are checked, the system automatically generates the necessary data (e.g., class/roll determined by AI, electricity bill history) and creates the corresponding documents.
-   **Optimized File List:**
    -   The file list page defaults to a "Daily" filter to show the most relevant files first.
    -   Badges indicate which documents are associated with each file (certificate/bill) and their print status.
    -   **Bulk Actions:** Users can select multiple files at once to print, delete, or change their status.
-   **File Editing & Deletion:** Each file and its associated documents can be edited or deleted. Deleting a file also deletes all related documents.

### Client Management

-   Manages a list of clients under whom files are created.
-   Full CRUD (Create, Read, Update, Delete) functionality is available.
-   Before deleting a client, the system checks if any files exist under that client and prevents deletion if they do.

### Institution Management

-   Manages the institutions (schools/colleges) used for issuing certificates.
-   **CRUD Functionality:** Add new institutions, update information, and delete them.
-   **Dynamic Certificate Text:** The main text of the certificate can be customized for each institution using variables like `{{name}}` and `{{class}}` to generate dynamic content.
-   **Image Upload:** The institution's logo and signature/seal can be uploaded as images, which are then used during printing.

### Electricity Bill Management

-   **Bill Templates:** The system includes two built-in templates (DESCO & DPDC). Users can change their logos and activate/deactivate them.
-   **Bill Addresses:** Separate addresses can be set for each template. For example, DESCO uses Dag No/Area, while DPDC uses a full address.
-   **Automated Bill Creation:** When creating a new file, if the "Create Electricity Bill" option is selected, the system automatically generates a bill using an active address and template. The bill history is generated using the `faker.js` library.

### Dynamic Printing

-   One of the most powerful features of the application is its printing system.
-   **Single & Bulk Print:** Users can print a single document or multiple documents at once.
-   **Custom Print Layouts:** Each document has a print-friendly layout (A4 size) created under the `/app/(print)` route. CSS `@media print` is used to hide unnecessary UI elements (like buttons) during printing.
-   **Print Status:** When a document is printed, its status is automatically updated to "Printed".

### AI Integration (Genkit)

-   **Certificate Data Generation:** Some data required for creating a certificate, such as the student's class, roll number, and session year, is generated automatically using AI.
    -   A Genkit flow is defined in `src/ai/flows/certificate-data-tool.ts`.
    -   This flow takes the student's age and the current date as input and provides an output based on a set of rules, making the application smarter and more automated.

---

## Development Guide

If a developer wishes to build a similar application, the following steps can be followed:

1.  **Project Setup:** Use `create-next-app` to create a new Next.js project and configure ShadCN UI and Tailwind CSS.
2.  **Supabase Setup:** Create a new project in Supabase. Enable Authentication and Storage. Add the required API keys and service account credentials to the `.env` file.
3.  **Authentication Flow:**
    -   Create a `/signup` page that only works for the first user.
    -   Create `/login` and `/forgot-password` pages.
    -   Use Supabase Authentication (Client SDK) to create sign-up and login functions.
    -   Use Next.js Middleware (`src/middleware.ts`) to manage protected and public routes.
4.  **Data Modeling:** Define all data structures (e.g., `AppFile`, `Client`, `Certificate`) in `src/lib/types.ts`.
5.  **Supabase Functions:** Create CRUD functions for each data model as `async` functions in `src/lib/supabase/database.ts`. Use `revalidatePath` to automatically refresh pages after data changes, implementing a smart caching strategy.
6.  **UI Pages:**
    -   Create pages for each core feature (`/files`, `/clients`, etc.).
    -   **Optimization:** Convert each page into an `async` server component that loads data on the server. Separate interactive parts (like tables, forms) into client components (`'use client'`) and pass the server-loaded data as `props`.
7.  **AI Flow (Genkit):**
    -   Set up Genkit.
    -   Create the required AI logic (e.g., certificate data generation) as a flow in the `src/ai/flows` folder. Define input and output schemas using `zod`.
8.  **Printing:**
    -   Create separate pages for printing under the `/app/(print)` layout.
    -   Use CSS `@media print` to create print-friendly styles.
    -   Use the `window.print()` function to trigger the print dialog.
9.  **Performance Tuning:**
    -   Implement a multi-layered caching strategy as described above.
    -   Use lazy loading for non-critical data on pages like the Dashboard.
    -   Use `router.prefetch()` or similar techniques on user interaction events like `onMouseEnter` or when a component becomes visible to preload data for subsequent navigation.
