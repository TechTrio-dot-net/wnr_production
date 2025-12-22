flowchart TD
  A[User enters phone on Next.js] --> B[reCAPTCHA verification]
  B --> C[Firebase send OTP (signInWithPhoneNumber)]
  C --> D[User enters OTP]
  D --> E[Firebase confirm(code) -> UserCredential]
  E --> F[Get ID Token (getIdToken)]
  F --> G[Client calls /auth/bootstrap with Bearer ID_TOKEN]
  G --> H[Express: verifyIdToken via Firebase Admin]
  H --> I{Mongo users doc exists for uid?}
  I -- No --> J[Create users doc\n{uid, phone, role:'user', createdAt}]
  I -- Yes --> K[Update users doc\n{lastLoginAt, phone (if missing)}]
  J --> L[Optional: set custom claims\n(e.g., role) via Admin SDK]
  K --> L
  L --> M[Return app profile\n(users + defaults)]
  M --> N{Guest cart present?}
  N -- Yes --> O[Merge guest cart -> user cart\nDelete guest cart]
  N -- No --> P[Done: user session ready]
  O --> P
