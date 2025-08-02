# MizuGuna Frontend

This is the frontend application for the MizuGuna IoT Fish Farming project. It provides a modern, responsive web interface for users to visualize sensor data, access resources, learn about fish farming, and interact with the system.

## Features

- **Dashboard:** Real-time and historical visualization of water quality sensor data (temperature, pH, TDS, ORP).
- **Authentication:** User login and registration with protected dashboard access.
- **Gallery:** Image carousels showcasing field work and laboratory devices.
- **Info:** Educational content on fish types, farming methods, water parameters, and common diseases.
- **Training:** Step-by-step guides and visuals for device usage and best practices.
- **Resources:** Visual and textual documentation of device hardware and system components.
- **Contact:** Contact form and IIT Hyderabad location map.
- **Responsive Design:** Fully responsive UI using Tailwind CSS.

## Tech Stack

- **React** (with functional components and hooks)
- **Vite** (for fast development and build)
- **Tailwind CSS** (utility-first styling)
- **Recharts** (for data visualization)
- **React Router** (for client-side routing)
- **JS-Cookie** (for authentication state)
- **Other:** Lucide-react icons, custom assets

## Project Structure

```
src/
  App.jsx                # Main app component with routing
  main.jsx               # Entry point
  index.css              # Global styles (includes Tailwind)
  assests/               # Images and static assets
    FieldWork/
    FishImages/
    TrainingPage/
  components/            # All React components
    Header.jsx           # Top navigation bar
    Home.jsx             # Landing page
    DashboardTable.jsx   # Sensor data dashboard
    Graph.jsx            # Data visualization charts
    UserLogin.jsx        # Login form
    SignUpp.jsx          # Signup form
    Gallery.jsx          # Image gallery
    Info.jsx             # Fish farming info tabs
    TrainingPage.jsx     # Training and usage guides
    Contact.jsx          # Contact form and map
    About.jsx            # About page
    Resources.jsx        # Device/system documentation
    Features.jsx         # Project features section
    RuralDev.jsx         # Rural development info
    ...                  # Other UI components
  data/                  # (Optional) Static data files
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd <project-root>
   ```

2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```sh
   npm run dev
   # or
   yarn dev
   ```

4. **Open in browser:**
   Visit [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal).

### Build for Production

```sh
npm run build
# or
yarn build
```

The output will be in the `dist/` directory.

## Environment Variables

- You can use a `.env` file at the project root to configure environment variables (e.g., API endpoints).
- Example:
  ```
  VITE_API_BASE_URL=https://api.mizuguna.in
  ```

## Routing Overview

- `/` - Home
- `/userlogin` - Login
- `/signupp` - Signup
- `/dashboard` - Protected dashboard (requires login)
- `/gallery` - Gallery
- `/info` - Fish farming info
- `/training` - Training guides
- `/contact` - Contact page
- `/about` - About page
- `/resources` - Device/system documentation

## Customization

- **Assets:** Place images in `src/assests/` and reference them in components.
- **Styling:** Tailwind CSS is used throughout. You can customize via `tailwind.config.js` and `index.css`.
- **API Integration:** Update API endpoints in components (e.g., `UserLogin.jsx`, `DashboardTable.jsx`) or use environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a Pull Request

## License

This project is for academic and research purposes at IIT Hyderabad.

---

For backend details, see the backend directory and its README.