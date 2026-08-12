# PawPass

A polished, mobile-first pet care dashboard that keeps everyday care, health records, appointments, and an emergency lost-pet profile in one place.

## MVP features

- Friendly public landing page with sign-up and login flows
- Multi-pet profiles with name, photo, breed, birthday, weight, and microchip details
- Unified dashboard for upcoming feeding, medication, vaccination, vet, and grooming tasks
- Medical records and vaccination history
- Medication, appointment, grooming, and feeding schedule management
- Shareable-style lost-pet emergency card
- Responsive desktop sidebar and mobile bottom navigation
- Browser persistence with `localStorage` (no account or server required for this MVP)

## Run locally

PawPass is dependency-free. Start any static web server from the project directory:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

You can also open `index.html` directly, though a local server is recommended.

## Demo account

Choose **Explore the demo** on the welcome page. The seeded dashboard is immediately available and all changes are saved in your browser. Use **Reset demo data** under Settings to restore the original sample content.

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
