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
https://github.com/user-attachments/assets/6160babc-cf2f-4735-9965-2d6379638a99

### Create / Edit / Delete Listings

Sellers can create listings with title, description, price (optional), multiple photos, category, and pickup details (address or general location). They can edit or remove listings at any time.

https://github.com/user-attachments/assets/e8fa69e4-c4af-4673-9ee4-c170cc023ad9

### Search & Filter Listings

Search by keyword and filter by category, price range, and distance from the user's location to quickly find relevant items.

https://github.com/user-attachments/assets/4e0e14d3-6fda-425d-aff4-6389ee1f481c

### Map View & Location Pins

A map view displays nearby listings with pins and basic info; clicking a pin reveals the listing details and directions.
https://github.com/user-attachments/assets/cf188809-0f35-48b5-a485-20ac4e9f8695

### In-app Messaging

Buyers can message sellers through a simple in-app messaging feature to ask questions and coordinate pickup times.
![messagingdemo1](https://github.com/user-attachments/assets/9e8135f2-d52e-4ab8-ad02-80c71f6b6088)


### Favorites / Saved Listings

Users can bookmark listings to a Favorites list for later review.
https://github.com/user-attachments/assets/0c733007-7731-4f10-a3c0-84cde1b19bba
### Photo Uploads

Listings support multiple photos so buyers can see item condition and details.

https://github.com/user-attachments/assets/e8fa69e4-c4af-4673-9ee4-c170cc023ad9

### Scheduling / Pickup Notes (Custom)

Allow sellers to add available pickup windows and notes (e.g., curbside pickup, porch pickup), helping buyers coordinate easily.

https://github.com/user-attachments/assets/95340015-83d5-473a-9e59-8a3eceef626e


### Neighborhood Feed & Events (Custom)

A chronological feed highlights new listings, upcoming neighborhood sale events, or group announcements to encourage local participation.

https://github.com/user-attachments/assets/85139201-c49b-4200-901a-efdcbd87e1e1

## Installation Instructions

1) Clone the repo
2) Install dependencies for frontend and backend (e.g., `npm install` in each folder)
3) Add environment variables for DB and storage (if used)
4) Run the backend server (e.g., `npm start` or `node server.js`) and the frontend (`npm start` in the client folder)

Add more specific setup steps here once the project structure (monorepo vs separate folders) is finalized.
