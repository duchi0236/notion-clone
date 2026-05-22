# ClawNote Mobile

Expo mobile app for ClawNote.

## Setup

Copy the environment file:

```bash
cp .env.example .env
```

Change only this value when deploying to production:

```bash
EXPO_PUBLIC_API_URL=https://your-domain.com
```

Then install and run:

```bash
npm install
npm run start
```

## Runtime connection

The app reads API URL from `EXPO_PUBLIC_API_URL` and stores the access token in Expo SecureStore.

Open the `Me` tab and paste your ClawNote access token.

## Implemented mobile features

- Document list
- Document search
- Pull to refresh
- Document detail
- Basic mobile document editing
- Create document
- Database list
- AI knowledge search
- Inbox capture
- Token settings

## Next production checks

- Set `EXPO_PUBLIC_API_URL` to your deployed web domain
- Use a real HTTPS domain
- Generate and paste an access token
- Run on iOS and Android devices
- Configure EAS build when ready for app store distribution
