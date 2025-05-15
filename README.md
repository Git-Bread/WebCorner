# WebCorner

WebCorner is a modern web application built with Nuxt 3, Firebase, and Tailwind CSS, providing a feature-rich platform with user authentication, profiles, and dashboard functionality.

## Features

- **User Authentication**: Secure login, registration, and password recovery
- **User Profiles**: Customizable user profiles with settings management
- **Dashboard**: Interactive dashboard interface
- **Theme Support**: Light/dark mode and accessibility features
- **Firebase Integration**: Authentication, Firestore database, Storage, and Functions

## Tech Stack

- **Frontend Framework**: [Nuxt 3](https://nuxt.com/)
- **UI Framework**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [FontAwesome](https://fontawesome.com/) via [@vesp/nuxt-fontawesome](https://github.com/vesparny/nuxt-fontawesome)
- **Backend Services**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage, Functions)
- **Form Validation**: [Zod](https://github.com/colinhacks/zod)
- **TypeScript**: Type-safe JavaScript

## Setup

### Prerequisites

- Node.js (v16 or newer recommended)
- npm or another package manager (pnpm, yarn, bun)
- [Firebase CLI](https://firebase.google.com/docs/cli) (for local emulation and deployment)

### Environment Variables

Create a `.env` file in the root directory with the following Firebase configuration:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Installation

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development

### Local Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

### Firebase Emulators

Run Firebase emulators for local development:

```bash
# npm
npm run emulate

# pnpm
pnpm emulate

# yarn
yarn emulate

# bun
bun run emulate
```

This will start the following emulators:
- Auth: http://localhost:9099
- Firestore: http://localhost:8080
- Functions: http://localhost:5001
- Storage: http://localhost:9199
- Hosting: http://localhost:5000
- Firebase UI: http://localhost:4000

## Production

### Build for Production

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

### Preview Production Build

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

### Deployment

Deploy to Firebase Hosting:

```bash
firebase deploy
```

To deploy specific services only:

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Project Structure

- `/pages` - Nuxt pages (follow Vue Router convention)
- `/components` - Reusable Vue components
- `/composables` - Shared composition functions (auth, profile, settings, etc.)
- `/layouts` - Application layouts
- `/middleware` - Nuxt middleware
- `/plugins` - Vue/Nuxt plugins
- `/public` - Static assets that should be served as-is
- `/assets` - Assets that will be processed by the build tool
- `/server` - Server-side logic
- `/functions` - Firebase Cloud Functions
- `/utils` - Utility functions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
