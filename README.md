# FortiExam

FortiExam is a zero-trust, offline-capable secure examination system that uses forward-evolving key cryptography to guarantee time-bounded access to exam content. Exam packages are encrypted at the authority, delivered as self-contained HTML files, and can only be decrypted within a cryptographically-enforced time window — after which the key is mathematically destroyed through an entropy collapse.

## Cryptographic Architecture

| Primitive | Role |
|-----------|------|
| **AES-256-GCM** | Content encryption with per-chunk authenticated encryption |
| **AES-KW** | Session key wrapping with the initial evolution key |
| **SHA-256 Evolution** | Forward-evolving key chain — each step irreversibly advances the key |
| **Ed25519** | Package signing by the authority to prevent tampering |

## Quick Start

```bash
npm install
npm run demo
# Open dist/exam.html in Chrome/Firefox/Edge
```

## Phase 1 Features

- ✅ Authority CLI generates encrypted exam packages
- ✅ AES-256-GCM content encryption with random session key
- ✅ AES-KW session key wrapping with evolution key (kEvo0)
- ✅ Ed25519 package signing and verification
- ✅ Client-side forward-evolving key (SHA-256, configurable step rate)
- ✅ Entropy collapse post-exam (configurable collapse iterations)
- ✅ Zero-trust offline exam runtime (single self-contained exam.html)
- ✅ Locked → Unlocking → Active → Expired phase state machine
- ✅ Countdown timer during locked phase
- ✅ Professional dark-theme exam UI with question navigation

## Phase 2 Roadmap

- [ ] Student identity binding (device fingerprint + signature)
- [ ] Multi-chunk streaming decryption for large exams
- [ ] Anti-screenshot / screen-capture detection
- [ ] Authority key management (HSM integration)
- [ ] Exam result encryption and submission
- [ ] Proctoring integration hooks

## Patent Preview

FortiExam implements a novel *forward-evolving cryptographic key protocol* wherein an exam session key is wrapped with an ephemeral evolution key that is continuously advanced through a one-way hash chain, making the session key irrecoverable after the evolution counter exceeds a predetermined threshold — providing mathematically-guaranteed temporal access control without server connectivity.
