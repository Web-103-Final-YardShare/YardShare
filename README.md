# YardShare — Local Yard Sale Marketplace

CodePath WEB103 Final Project

Designed and developed by: Ivie Imhonde, Dhruv Sharma

🔗 Link to deployed app: (add when deployed)

## About

### Description and Purpose

YardShare is a neighborhood-first marketplace that makes hosting, finding, and coordinating yard sale items simple and social. Sellers can create listings with photos, pickup details, and maps; buyers can search and filter local listings, message sellers, and save favorites. The app's purpose is to help neighbors declutter, discover bargains, and support reuse in a safe, local environment.

### Inspiration

We were inspired by community yard sales, local buy/sell groups, and the sustainability benefits of reusing items instead of buying new. YardShare aims to make it easy for people to list items quickly, reach local buyers, and coordinate pickups.

## Tech Stack

Design: Figma
Frontend: React (Create React App or Vite), Tailwind CSS or plain CSS, React Router

Backend: Node.js + Express, Render for listings and users

Optional: Cloud storage for photos (e.g., Cloudinary or AWS S3), Map API (Mapbox or Google Maps) for location display

## Features

### User Authentication

Create an account and sign in using email/password. Registered users can create, edit, and remove listings and message other users.

### Create / Edit / Delete Listings

Sellers can create listings with title, description, price (optional), multiple photos, category, and pickup details (address or general location). They can edit or remove listings at any time.

### Search & Filter Listings

Search by keyword and filter by category, price range, and distance from the user's location to quickly find relevant items.

### Map View & Location Pins

A map view displays nearby listings with pins and basic info; clicking a pin reveals the listing details and directions.

### In-app Messaging

Buyers can message sellers through a simple in-app messaging feature to ask questions and coordinate pickup times.

### Favorites / Saved Listings

Users can bookmark listings to a Favorites list for later review.

### Photo Uploads

Listings support multiple photos so buyers can see item condition and details.

### Scheduling / Pickup Notes (Custom)

Allow sellers to add available pickup windows and notes (e.g., curbside pickup, porch pickup), helping buyers coordinate easily.

### Neighborhood Feed & Events (Custom)

A chronological feed highlights new listings, upcoming neighborhood sale events, or group announcements to encourage local participation.

When features are implemented, add GIFs demonstrating each feature in this section.

## Installation Instructions

1) Clone the repo
2) Install dependencies for frontend and backend (e.g., `npm install` in each folder)
3) Add environment variables for DB and storage (if used)
4) Run the backend server (e.g., `npm start` or `node server.js`) and the frontend (`npm start` in the client folder)

Add more specific setup steps here once the project structure (monorepo vs separate folders) is finalized.
