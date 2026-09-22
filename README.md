# TrustID

**Your Identity. Your Credentials. Your Control.**

TrustID is a privacy-preserving digital identity and verifiable credential platform that lets users control and securely share their verified identity information using self-sovereign identity principles, verifiable credentials, and cryptographic proofs.

> **Important Project Rule**: TrustID strictly uses **real data and real working integrations**. It does not use mock data, fake users, simulated blockchain transactions, or placeholder verification results. When an integration is not yet connected, the architecture outlines the real connection requirements rather than simulating responses.

---

## 1. What TrustID Is

TrustID is a decentralized, privacy-focused identity platform designed to empower individuals with full sovereignty over their identity data. Users can hold cryptographically verifiable credentials (VCs), selectively disclose attributes, and verify claims on-chain and off-chain without exposing sensitive underlying data.

---

## 2. Current Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Linting & Formatting**: ESLint (`eslint-config-next`)
- **Package Manager**: npm

---

## 3. Current Project Architecture

The codebase separates frontend application concerns from backend services, database handlers, and protocol specifications:

- **Frontend (`/app`, `/components`)**: Responsive Next.js App Router user interface with reusable UI components and a dark cybersecurity/Web3 aesthetic.
- **Shared Utilities & Configuration (`/lib`, `/types`)**: Centralized type safety, safe environment variable access, and domain constants.
- **Backend Architecture Placeholder (`/backend`)**: Dedicated area for identity issuance logic, signature verification, and API services.
- **Convex Architecture Placeholder (`/convex`)**: Dedicated area for Convex reactive database schemas and server functions.
- **Documentation (`/docs`)**: Technical specifications and protocol documentation.

---

## 4. Folder Structure

```
trustid/
│
├── app/
│   ├── layout.tsx         # Root layout with fonts, navigation, and metadata
│   ├── page.tsx           # TrustID landing page
│   └── globals.css        # Global CSS and Tailwind styling
│
├── components/
│   ├── ui/
│   │   └── button.tsx     # Reusable UI button component
│   ├── layout/
│   │   ├── navbar.tsx     # Application navigation header
│   │   └── footer.tsx     # Application footer
│   └── shared/
│       └── card.tsx       # Reusable card container component
│
├── lib/
│   ├── config.ts          # Centralized configuration with runtime safety
│   ├── constants.ts       # Global brand and metadata constants
│   └── utils.ts           # Shared helper functions
│
├── types/
│   └── index.ts           # Core TypeScript types and interfaces
│
├── backend/
│   └── README.md          # Architectural placeholder for backend services
│
├── convex/
│   └── README.md          # Architectural placeholder for Convex schemas
│
├── docs/
│   └── README.md          # Architectural placeholder for technical docs
│
├── public/                # Static assets
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

2. Environment variables available for future integrations:

| Variable | Description | Runtime Exposure |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public base URL of the application | Public / Browser |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Authentication publishable key | Public / Browser |
| `CLERK_SECRET_KEY` | Clerk Authentication secret key | Server Only (Private) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Public / Browser |
| `NEXT_PUBLIC_BLOCKCHAIN_NETWORK` | Blockchain network name / Chain ID | Public / Browser |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed identity smart contract address | Public / Browser |
| `BLOCKCHAIN_RPC_URL` | JSON-RPC provider endpoint | Server Only (Private) |
| `BLOCKCHAIN_PRIVATE_KEY` | Deployer / relayer private key | Server Only (Private) |
| `TRUSTID_API_URL` | External TrustID verification service URL | Server Only (Private) |
| `TRUSTID_API_KEY` | External TrustID API authorization key | Server Only (Private) |

> **Note**: For Step 1, no real environment variable values are required to run the development server or build the application.

---

## 8. What is Implemented in Step 1

- Next.js project foundation with TypeScript, App Router, and Tailwind CSS.
- Production-ready folder structure separating frontend, UI components, utilities, and backend placeholders.
- Strict TypeScript configurations with zero type errors.
- Clean responsive landing page with TrustID branding, tagline, description, and "Get Started" action button.
- Reusable UI component system (`Button`, `Navbar`, `Footer`, `Card`).
- Centralized configuration with runtime safety rules prohibiting browser exposure of private keys or secrets.
- Environment variable specifications in `.env.example` and gitignore rules for `.env.local`.

---

## 9. What is Intentionally NOT Implemented Yet

The following systems are intentionally omitted from Step 1 and will be introduced in their respective subsequent steps using **real integrations**:

- Clerk user authentication & session management.
- Convex database schemas and server functions.
- W3C Decentralized Identifiers (DID) resolution.
- Verifiable Credential issuance & cryptographic verification.
- Solidity smart contracts, Hardhat, ethers.js, and blockchain transactions.
- Zero-Knowledge Proof (ZKP) generation and verification circuits.
- WebAuthn / Passkeys authentication.
- QR code generation and mobile credential wallet scanning.
- External TrustID verification API connectivity.
