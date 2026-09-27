# StudioPilot — Mobile App

Complete mobile port of the StudioPilot web app, built with **Expo / React Native**.
Talks to the **same live backend** as the web app: `https://studiopilote.fr/api/v1`.
No fake data anywhere — every screen consumes the real API.

## Screens / feature parity with the web app

| Domain | Web | Mobile |
|---|---|---|
| Auth (JWT access + refresh) | ✅ | ✅ login / register, token rotation |
| Organizations (list, create, members, roles) | ✅ | ✅ |
| Workspaces (create, **rename, delete**) | ✅ | ✅ |
| Projects (create, settings, **inline rename, delete**) | ✅ | ✅ |
| Project views | Kanban, Backlog/Sprints, List, Calendar, Workflow, Stats, Discussion | ✅ same 7 views |
| Kanban drag & drop | mouse DnD | ✅ long-press → drag across columns + "···" move menu |
| Quick task create in a column | ✅ (column "+") | ✅ status pre-selected |
| Task detail (subtasks, comments, attachments, activity, favorite, archive) | ✅ | ✅ bottom sheet |
| List view (search, priority filter, archived + **restore**) | ✅ | ✅ |
| Channels chat (Socket.IO realtime) | ✅ | ✅ |
| Notifications (socket + badge) | ✅ | ✅ |
| Command-bar global search | ✅ | ✅ |
| Profile settings, theme (dark/light), i18n fr/en | ✅ | ✅ |
| Web Navbar "Nouvelle Tâche" | ✅ | ✅ floating "+ Tâche" FAB |

Design tokens are the web's: `#E8531A` orange, `#1A8C8C` teal, `#2C3147`
charcoal, Inter + Sora fonts, same radius/shadow scale, same logos.

## Run

```bash
npm install
npx expo start          # then press "a" (Android emulator) or scan QR with Expo Go
```

The app calls the **real API at `https://studiopilote.fr`** — log in with your
usual account.

### Changing the API base URL

Set `EXPO_PUBLIC_API_BASE_URL` before starting, e.g.:

```bash
EXPO_PUBLIC_API_BASE_URL=https://staging.example.com npx expo start
```

## Browser testing & CORS (`npm run proxy`)

Native apps (Expo Go / emulators) call the API directly and everything works.
**Browsers**, however, enforce CORS: if the API doesn't whitelist your dev
origin (localhost, LAN IP, preview domain), requests fail with
"Erreur de connexion" (a `Network Error` — see the `[api]` logs in the console).

Run the included local CORS proxy and start the web build through it:

```bash
# terminal 1 — proxy on :8081, forwards everything to studiopilote.fr
npm run proxy

# terminal 2 — web build that talks to the API through the proxy
npm run web:proxy
```

Use your **LAN IP** instead of `localhost` if you open the web build from
another device (e.g. `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.14:8081`).

## Structure

```
App.tsx               entry — fonts, phone-frame wrapper for desktop web
src/
  screens/            one folder per feature (auth, home, orgs, workspaces,
                      projects, project/ + views/, tasks, channels,
                      notifications, search, profile)
  components/         UI kit (Sheet, Button, Input, TaskCard, Icon, toast…)
  services/           api.ts (axios + Bearer + 401→refresh), notificationStore
  context/            AuthContext, PermissionsContext
  state/              AppStateContext (org/workspace/project selection machine)
  shell/              AppShell, AppHeader, AppDrawer
  hooks/              useSocket
  i18n/               fr.json / en.json
  theme/              tokens.ts (BRAND colors, RADIUS, FONT, PHONE_FRAME_W)
scripts/              proxy.js (CORS proxy), gen-icons.js
```

## Notes

- Desktop web preview renders inside a 430 px centered phone frame
  (`PHONE_FRAME_W` in `src/theme/tokens.ts`); on real devices the app is
  full-screen.
- The web app source (`../src`) was used as the functional reference; the
  mobile `api.ts` exposes the same endpoints and payload shapes.
