# PawPass

A polished, mobile-first pet care dashboard that keeps everyday care, health records, appointments, and an emergency lost-pet profile in one place.

## MVP features

- Friendly public landing page with sign-up and login flows
- Full multi-pet profile creation with required-field validation, photo uploads, species, breed, birthday or age, sex, weight, microchip, allergy, medication, veterinarian, and medical details
- Instant pet switching across the dashboard, Pets page, and emergency profile
- Pet profile editing and confirmation-protected deletion
- Unified dashboard for upcoming feeding, medication, vaccination, vet, and grooming tasks
- Medical records and vaccination history
- Medication, appointment, grooming, and feeding schedule management
- Shareable-style lost-pet emergency card
- Responsive desktop sidebar and mobile bottom navigation
- Browser persistence with `localStorage` (no account or server required for this MVP)
- Persistent local login sessions, including the current page and selected pet

## Run locally

PawPass is dependency-free. Start any static web server from the project directory:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

You can also open `index.html` directly, though a local server is recommended.

## Demo account

Choose **Explore the demo** on the welcome page. The seeded dashboard is immediately available and all changes are saved in your browser. Open **Pets** and choose **+ Add a pet** to create a profile; required fields are marked with an asterisk. New pets appear immediately on the Pets page and dashboard, and can be selected from pet cards or the desktop sidebar. Use each pet card’s **Edit** and **Delete** controls to maintain profiles (deletion asks for confirmation). Photo uploads are stored in the same browser data, with a 2 MB per-photo limit. Use **Reset demo data** under Settings to restore the original sample content.

## Session behavior

Signing up, logging in, or choosing **Explore the demo** starts a local browser session. PawPass restores that session after a refresh or after the page is reopened, returning you to the current section (Dashboard, Pets, Health, Schedule, Emergency, or Settings). The current pet and all pet data are stored separately from the login session and are restored as well.

Choose **Log out** in Settings to intentionally end the session and return to the public landing page. Logging out removes only the local login session; it does not delete pet profiles, health records, schedules, or other saved data. Because this MVP uses browser storage, sessions and data are local to the browser and device where they were created.

## Project structure

```text
.
├── index.html   # Application shell, landing page, dialogs, and view templates
├── styles.css   # Responsive design system and component styles
├── app.js       # State, routing, persistence, and interactions
└── README.md
```

## Technical notes

This first version deliberately uses semantic HTML, modern CSS, and vanilla JavaScript to stay fast and easy to run. Data is stored per browser in `localStorage`; authentication is a local prototype flow and must be replaced by a secure backend before production use.
