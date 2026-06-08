# Plant Watering Sprinkler Business E-Commerce Website
### Independent Study (IS) Project

An end-to-end E-Commerce Information System and Management Platform developed for a specialized sprinkler equipment installation and sales business. This project serves as a comprehensive solution covering customer-facing retail, direct customer-to-admin support, and back-office administrative operations.

---

## 📑 Project Overview

This system addresses business challenges in the irrigation and landscaping sector by digitizing inventory management, streamlining the purchasing funnel, and provisioning instant real-time communications between clients and support staff. 

The architecture is divided into two primary experiences:
1. **Client E-Commerce Portal**: Features product catalog browsing, detailed item specifications, shopping cart management, seamless checkout, and integrated localized order tracking.
2. **Admin Dashboard Control Panel**: Provides comprehensive back-office controls for tracking metrics, managing live orders, manipulating product inventory, and hosting centralized real-time support communications.

---

## 🚀 Key Features

### 🛒 Client-Facing Experience
* **Dynamic Product Catalog**: Filterable storefront segmented by essential irrigation categories (e.g., Sprinklers, Solenoid Valves, Controllers, Water Pumps, and Fittings).
* **Shopping Cart & Context Management**: Powered by a unified React Context framework providing fluid add, edit, and removal sequences with accurate pricing aggregation.
* **Streamlined Checkout**: Integrated Thai address auto-fill capabilities coupled with secure localized payment validation prompts (including QR Code upload handling).
* **Order Tracking & History**: Allows users to check fulfillment status, query distinct order codes, and inspect past invoice breakdowns.
* **Live Chat Widget**: An omnipresent communication widget connecting customers directly to the corporate support desk.

### 💼 Back-Office Admin Panel
* **Business Analytics Dashboard**: Centralized view for monitoring gross revenue metrics, tracking total product volumes, active order metrics, and pending client requests.
* **Order Processing System**: Granular controls to move incoming customer requests across lifecycle steps (e.g., Pending, Processing, Shipped, Completed).
* **Inventory Control Manager**: Interface to dynamically create, update, or remove product stock listings, update price parameters, and upload fresh graphics assets.
* **Centralized Support Hub**: A dedicated multi-chat management suite enabling admins to switch cleanly between active customer threads to answer technical irrigation queries.

---

## 🛠️ Tech Stack & Architecture

### Frontend
* **Core Framework**: React.js (Vite configuration for optimized module bundling).
* **Styling & Layout**: Tailwind CSS (fully responsive, mobile-first design system with modern components).
* **Routing**: React Router DOM (structured layout pathways partitioning guest routes from administrative zones via Protected Route rules).

### Backend & Infrastructure
* **Database & Authentication**: Firebase Service Suite.
  * **Firebase Authentication**: Handles secure administrator registration and customer account workflows.
  * **Firestore / Realtime Database**: Synchronizes real-time messaging pipelines and processes simultaneous e-commerce transactional updates safely.

---

## 📦 Project Setup & Installation

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm** or **yarn**

### Step-by-Step Installation

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/Teeratch01/plant-watering-sprinkler-business-website.git](https://github.com/Teeratch01/plant-watering-sprinkler-business-website.git)
   cd plant-watering-sprinkler-business-website
