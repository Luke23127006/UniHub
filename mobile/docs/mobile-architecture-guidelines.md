# UniHub Mobile Architecture Guidelines

## 1. Architectural Overview

UniHub Mobile adopts a **Feature-Based Architecture** combined with **Expo Router** (File-based routing). This approach ensures clear separation of concerns, avoids spaghetti code, and makes the codebase scalable and maintainable.

- **app/**: Handles only routing and navigation (Expo Router).
- **src/**: Contains all business logic, UI, and shared resources.

---

## 2. Standard Directory Structure

```
mobile/
  unihub-mobile/
    app/                # Routing only (Expo Router)
      (tabs)/           # Tab navigation (routes)
      ...
    src/                # All app logic and UI
      features/         # Feature modules (e.g., checkin, profile)
        checkin/
          components/   # UI components for checkin
          api.ts        # API calls for checkin
          hooks.ts      # Custom hooks for checkin logic
          types.ts      # TypeScript types/interfaces
          ...
      core/             # Core services (auth, api clients, config)
      shared/           # Shared code (reusable components, utils)
        components/     # UI components used across features
        utils/          # Utility functions
      ...
    assets/             # Images, fonts, etc.
    ...
```

### Directory Roles

- **app/**: Only for routing and navigation. **No business logic or UI here.**
- **src/features/**: Each feature is a self-contained module (UI, logic, API, types).
- **src/core/**: App-wide services (e.g., authentication, API clients, theme config).
- **src/shared/**: Reusable components and utilities shared across features.

---

## 3. Feature Module Rules

Each feature (e.g., `checkin`) must follow this structure:

```
src/features/checkin/
  components/     # UI components (CheckinButton.tsx, CheckinModal.tsx)
  api.ts          # All API calls (fetchCheckinHistory, postCheckin)
  hooks.ts        # Custom hooks (useCheckin, useCheckinHistory)
  types.ts        # TypeScript types/interfaces (Checkin, CheckinHistory)
  index.ts        # Entry point (exports public API of the feature)
```

- **UI**: Only presentational logic in `components/`.
- **API**: All network calls in `api.ts`.
- **Logic**: Business logic and state management in `hooks.ts` (use custom hooks).
- **Types**: All interfaces and types in `types.ts`.
- **No cross-feature imports**: If something is shared, move it to `shared/`.

---

## 4. Adding a New Feature: Step-by-Step Workflow

**Example: Add Check-in History Screen**

1. **Create Feature Folder**
   - `src/features/checkinHistory/`

2. **Define Types**
   - Create `types.ts` for all interfaces (e.g., `CheckinHistoryItem`).

3. **API Layer**
   - Implement all network calls in `api.ts` (e.g., `fetchCheckinHistory`).

4. **Custom Hooks**
   - Write business logic and state management in `hooks.ts` (e.g., `useCheckinHistory`).
   - **Never put logic directly in UI components.**

5. **UI Components**
   - Build presentational components in `components/` (e.g., `CheckinHistoryList.tsx`).
   - Components should only receive data/handlers via props.

6. **Export Public API**
   - Use `index.ts` to export hooks, components, and types.

7. **Integrate with Routing**
   - In `app/`, add a new route/screen that imports from `src/features/checkinHistory`.
   - **Do not put business logic in app/ files.**

8. **If you need to share code**
   - Move reusable code to `src/shared/`.

---

## 5. Anti-patterns to Avoid

- **Never put API/network logic in `app/` files.**
- **Never import directly between features.**
  - If you need to share, move to `shared/`.
- **No God Components/Classes:**
  - Split large components into smaller, focused ones.
- **No business logic in UI components:**
  - Use custom hooks for all logic/state.
- **No spaghetti imports:**
  - Keep imports clean and only from allowed layers.

---

## 6. Summary Checklist

- [ ] Feature modules are self-contained.
- [ ] All logic is in hooks, not UI.
- [ ] No cross-feature imports.
- [ ] Only routing in `app/`.
- [ ] Shared code in `shared/`.

---

**Follow these guidelines to keep UniHub Mobile clean, maintainable, and scalable!**
