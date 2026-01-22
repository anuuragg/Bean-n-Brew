# Bean-n-Brew ☕

A modern coffee e-commerce API built with Node.js, Express, and MongoDB.

## Overview

Bean-n-Brew is a RESTful API for a coffee e-commerce platform. This practice project provides backend services for managing coffee products with detailed specifications including bean types, roast levels, pricing, and inventory management.


## API Documentation

### Base URL
```
/api/v1
```

### Endpoints

#### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/product` | Retrieve all products |
| GET | `/api/v1/product/:id` | Retrieve single product by ID |
| GET | `/api/v1/product?price[gte]=500&sort=-price&page=1&limit=10` | Retrieve products with filtering, sorting, and pagination |
| POST | `/api/v1/product` | Create a new product |
| PATCH | `/api/v1/product/:id` | Update product data |
| DELETE | `/api/v1/product/:id` | Delete a product |

## Data Model

### Product Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | String | Yes | 10-40 characters, alphabetic only (spaces allowed) |
| `brand` | String | Yes | - |
| `description` | String | Yes | - |
| `beanType` | String | No | - |
| `price` | Number | Yes | - |
| `priceDiscount` | Number | No | Must be less than price |
| `weight` | Number | Yes | Product weight in grams |
| `inventory.stockQuantity` | Number | Yes | Available stock count |
| `inventory.isAvailabe` | Boolean | Yes | Product availability status |
| `media.images` | Array[String] | Yes | Array of image URLs |
| `media.thumbnail` | String | Yes | Thumbnail image URL |
| `ratings.avgRating` | Number | No | 1.0-5.0, default: 4.5 |
| `ratings.reviewCount` | Number | No | Default: 0 |
| `tags` | Array[String] | No | Product tags |

### Example Product

```json
{
    "name": "Vienna Roast",
    "brand": "Blue Tokai",
    "description": "Dark roasted coffee blend with rich chocolate notes and smoky undertones perfect for espresso",
    "beanType": "Arabica Blend",
    "price": 475,
    "weight": 250,
    "inventory": {
        "stockQuantity": 150,
        "isAvailabe": true
    },
    "media": {
        "images": [
            "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500",
            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500"
    },
    "ratings": {
        "avgRating": 4.6,
        "reviewCount": 234
    },
    "tags": ["dark-roast", "espresso", "chocolate-notes", "premium"]
}
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd bean-n-brew

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with your MongoDB connection string

# Start the server
npm start
```

## Contributing

This is a personal practice project. Feel free to fork and experiment!

---

**Note**: This is a learning project and is under active development. Features and API endpoints are subject to change.