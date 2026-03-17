# KnockBet — Real-Time Auction Platform

A full-stack real-time auction platform with live bidding, chat, credit management, and an immersive dark space UI.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

### Bidder
- **Live Bidding** — Place bids in real-time with instant updates via WebSockets
- **Live Chat** — Chat with other bidders during auctions with emoji reactions
- **Auction Heat System** — Visual heat meter (calm / warm / hot) based on bidding activity
- **Bid Battle Alerts** — Notifications when back-and-forth bidding wars occur
- **Smart Bid Assistant** — AI-suggested bid amounts based on competition level
- **Auto Timer Extension** — Auction timer extends when last-second bids are placed
- **Credit Wallet** — Virtual credit system with transaction history
- **Notifications** — Real-time alerts for outbids, wins, losses, and more
- **Bid History** — Track all your past bids with win/loss status

### Admin
- **Dashboard** — Overview stats for auctions, users, bids, and revenue
- **Create & Manage Auctions** — Full CRUD for auctions with categories and images
- **User Management** — View all registered users and their credit balances
- **Credit Management** — Assign, deduct, or reset user credits
- **Auction Monitor** — Live admin view of any auction (bids, chat, activity feed)
- **Reports & Analytics** — Top bidders, most active auctions, platform stats

### UI/UX
- **Dark Space Theme** — Deep purple/cyan glassmorphism design
- **Animated Space Background** — Twinkling stars, nebula clouds, floating 3D diamonds
- **Glass Cards** — Frosted glass panels with blur and glow effects
- **Smooth Animations** — Staggered fade-ups, gradient shimmers, hover effects

---

## Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS 3.4                |
| Backend    | Node.js, Express 4                               |
| Database   | MongoDB (Mongoose ODM), MongoDB Memory Server    |
| Real-time  | Socket.IO (bidding, chat, activity, notifications)|
| Auth       | JWT (JSON Web Tokens), bcryptjs                  |
| Security   | express-rate-limit, CORS, helmet-style headers   |

---

## Project Structure

```
codebitz/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Navbar, AuctionCard, SpaceBG, Icons
│   │   ├── context/         # AuthContext (JWT auth state)
│   │   ├── pages/
│   │   │   ├── admin/       # AdminDashboard, CreateAuction, ManageAuctions,
│   │   │   │                # ManageUsers, Credits, Reports, AdminAuctionMonitor
│   │   │   ├── bidder/      # Dashboard, Wallet, BidHistory, Profile, Notifications
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Marketplace.jsx
│   │   │   └── AuctionDetail.jsx
│   │   ├── utils/           # API client, socket client, helpers
│   │   ├── App.jsx
│   │   └── index.css        # Animations, glass utilities, dark theme
│   └── package.json
│
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── models/          # User, Auction, Bid, Message, Notification, CreditTransaction
│   │   ├── routes/          # auth, auctions, bids, wallet, admin
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── socket.js        # Socket.IO event handlers
│   │   ├── seed.js          # Database seeder
│   │   └── index.js         # Express + Socket.IO server entry
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local instance or MongoDB Atlas — or use the built-in MongoDB Memory Server)

### 1. Clone the repository
```bash
git clone <repo-url>
cd codebitz
```

### 2. Install dependencies
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Configure environment
Create a `.env` file in `server/`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/knockbetDB
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```
The backend already loads these values with `require('dotenv').config()` and reads `process.env.MONGO_URI`.

### 4. Seed the database (optional)
```bash
cd server
npm run seed
```
This creates demo admin/bidder accounts and sample auctions.

### 5. Run the application
```bash
# Terminal 1 — Start the server
cd server
npm run dev

# Terminal 2 — Start the client
cd client
npm run dev
```

The client runs on **http://localhost:5173** and the server on **http://localhost:5000**.

---

## Demo Accounts

| Role   | Email              | Password  |
|--------|--------------------|-----------|
| Admin  | admin@knockbet.com | admin123  |
| Bidder | darshan@knockbet.com | darshan123 |
| Bidder | abinaya@knockbet.com | abinaya123 |
| Bidder | judge@knockbet.com   | judge123   |

---

## API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/auth/register`              | Register a new user      |
| POST   | `/api/auth/login`                 | Login and get JWT token  |
| GET    | `/api/auctions`                   | List auctions (filterable)|
| GET    | `/api/auctions/:id`               | Get auction details + bids|
| GET    | `/api/bids/history`               | User's bid history       |
| GET    | `/api/wallet`                     | User's wallet + transactions|
| GET    | `/api/wallet/notifications`       | User's notifications     |
| POST   | `/api/admin/auctions`             | Create auction (admin)   |
| DELETE | `/api/admin/auctions/:id`         | Delete auction (admin)   |
| POST   | `/api/admin/auctions/:id/close`   | Close auction (admin)    |
| GET    | `/api/admin/users`                | List all users (admin)   |
| POST   | `/api/admin/users/:id/credits`    | Manage user credits (admin)|
| GET    | `/api/admin/reports`              | Analytics & reports (admin)|

## Socket Events

| Event           | Direction      | Description                        |
|-----------------|----------------|------------------------------------|
| `joinAuction`   | Client → Server| Join an auction room               |
| `leaveAuction`  | Client → Server| Leave an auction room              |
| `placeBid`      | Client → Server| Place a bid                        |
| `sendMessage`   | Client → Server| Send a chat message                |
| `sendReaction`  | Client → Server| Send an emoji reaction             |
| `bidUpdated`    | Server → Client| New bid placed (broadcast)         |
| `chatMessage`   | Server → Client| New chat message (broadcast)       |
| `activityEvent` | Server → Client| Activity feed update               |
| `bidBattle`     | Server → Client| Bid war detected                   |
| `auctionEnded`  | Server → Client| Auction has ended                  |
| `notification`  | Server → Client| Personal notification to user      |

---

## License

MIT
