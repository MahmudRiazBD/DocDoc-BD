# **App Name**: ডকডক বিডি (DocDoc BD)

## Core Features:

- Initial Setup: Initial Super Admin Setup: Upon first launch, allow a single user to sign up and automatically assign the 'সুপার অ্যাডমিন' role. Disable sign-ups thereafter.
- Role Management: User Role Management: Enable সুপার অ্যাডমিন and অ্যাডমিন roles to create and manage user accounts (অ্যাডমিন, স্টাফ).
- Secure Dashboard: Dashboard: Provide a secure dashboard accessible only after authentication, displaying reports and quick actions: 'ফাইল এড', 'প্রত্যয়ন ক্রিয়েট', 'বিদ্যুৎ বিল ক্রিয়েট' (stubbed).
- File Addition: ফাইল এড (File Add): A form to input আবেদনকারীর নাম (applicant name), জন্ম সাল (year of birth), and ক্লায়েন্টের নাম (client name), storing the data in Firestore, displayed in a timestamped list with edit/view options.
- Certificate Creation: প্রত্যয়ন ক্রিয়েট (Certificate Creation): A form to input নাম, পিতা, মাতা, জন্ম তারিখ. Save to Firestore, navigate to প্রত্যয়ন লিস্ট, show success message and 'প্রিন্ট করুন' button.
- Certificate AI: Certificate Data Tool: Auto-generate certificate data: ক্লাস (based on age, with randomized choices), রোল (random 11–99), প্রত্যয়নের তারিখ (15 days before input), and সেশন সাল (derived based on class & date). The LLM acts as a tool in creating this content.
- Certificate List: প্রত্যয়ন লিস্ট (Certificate List): Show all generated certificates with статусы 'প্রিন্ট হয়েছে' and 'প্রিন্ট হয়নি', allow bulk select and PDF generation, status override, and editing any entry.

## Style Guidelines:

- Primary color: A muted sky blue (#87CEEB) to evoke trust and serenity, important for official documents.
- Background color: Very light gray (#F0F0F0), providing a clean, unobtrusive backdrop.
- Accent color: Soft green (#90EE90) for buttons and success messages, symbolizing growth and accomplishment.
- Font: 'Hind Siliguri' (sans-serif) for all UI elements to ensure readability in Bengali, with fallback fonts 'Tiro Bangla' and system default Bengali fonts. Note: currently only Google Fonts are supported.
- Use simple, professional icons for navigation and actions, prioritizing clarity. The iconography is adapted for the bengali-speaking user.
- Maintain a clean, organized layout, with clear information hierarchy to improve usability. Consistent spacing and alignment for comfortable reading in Bengali.
- Subtle animations on form submission and data updates to provide user feedback.