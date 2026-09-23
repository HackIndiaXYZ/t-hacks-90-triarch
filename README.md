# Verifi

**Your Identity. Your Credentials. Your Control.**

Verifi is a privacy-preserving digital identity and verifiable credential platform that lets users control and securely share their verified identity information using self-sovereign identity principles, verifiable credentials, and cryptographic proofs.

> **Important Project Rule**: Verifi strictly uses **real data and real working integrations**. It does not use mock data, fake users, simulated blockchain transactions, or placeholder verification results. When an integration is not yet connected, the architecture outlines the real connection requirements rather than simulating responses.

---

## 1. What Verifi Is

Verifi is a decentralized, privacy-focused identity platform designed to empower individuals with full sovereignty over their identity data. Users can hold cryptographically verifiable credentials (VCs), selectively disclose attributes, and verify claims on-chain and off-chain without exposing sensitive underlying data.

---

## 2. Current Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **Backend Database**: Convex
- **Linting & Formatting**: ESLint (`eslint-config-next`)
- **Package Manager**: npm

---

## 3. Current Project Architecture

The codebase separates frontend application concerns from backend services, database handlers, and protocol specifications:

- **Frontend (`/app`, `/components`)**: Responsive Next.js App Router user interface with reusable UI components and Light/Dark mode support.
- **Shared Utilities & Configuration (`/lib`, `/types`)**: Centralized type safety, safe environment variable access, and domain constants.
- **Backend Services (`/backend`)**: Dedicated area for identity issuance logic, signature verification, and API services.
- **Convex Database (`/convex`)**: Dedicated area for Convex reactive database schemas and server functions.
- **Documentation (`/docs`)**: Technical specifications and protocol documentation.

---

## 4. Folder Structure

```
verifi/
│
├── app/
│   ├── layout.tsx         # Root layout with fonts, navigation, and metadata
│   ├── page.tsx           # Verifi landing page
│   ├── dashboard/         # Authenticated User Dashboard
│   └── globals.css        # Global CSS and Tailwind styling
│
├── components/
│   ├── ui/                # Reusable UI components (button, theme toggle, etc.)
│   ├── layout/            # Layout components (navbar, footer)
│   └── dashboard/         # Dashboard panels and metrics
│
├── lib/
│   ├── config.ts          # Centralized configuration with runtime safety
│   ├── constants.ts       # Global brand and metadata constants
│   └── utils.ts           # Shared helper functions
│
├── types/
│   └── index.ts           # Core TypeScript types and interfaces
│
├── convex/                # Convex schemas and backend functions
├── backend/               # Backend protocol services
├── docs/                  # Technical docs & specifications
│
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore rules (protects local credentials)
├── README.md              # Project documentation
├── package.json           # Package configuration & scripts
├── tsconfig.json          # TypeScript compiler configuration
└── next.config.ts         # Next.js configuration
```

---

## 5. How to Install Dependencies

Run the following command in the project root:

```bash
npm install
```

---

## 6. How to Run Locally

Start the local development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 7. Environment Variable Setup

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Configure Clerk and Convex credentials in `.env.local`.
