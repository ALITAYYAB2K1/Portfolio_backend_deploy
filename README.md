# Backend Documentation

This document provides a comprehensive overview of the backend structure, modules, and functionality.

## Folder Structure

```
backend/
├── config/                 # Configuration files
│   ├── db.js               # Database configuration
│   └── config.js           # General app configuration
├── controllers/            # Request handlers
│   └── [resource]Controller.js
├── models/                 # Data models/schemas
│   └── [resource]Model.js
├── routes/                 # API route definitions
│   └── [resource]Routes.js
├── middleware/             # Custom middleware functions
│   ├── auth.js             # Authentication middleware
│   └── errorHandler.js     # Error handling middleware
├── utils/                  # Utility/helper functions
│   └── helpers.js
├── public/                 # Static files (if any)
├── node_modules/           # Installed packages
├── app.js                  # Express app setup
├── index.js                # Server entry point
├── package.json            # Project dependencies
└── README.md               # Project documentation
```

## Key Files

### app.js

The `app.js` file is responsible for setting up the Express application. It:

- Creates an Express application instance
- Sets up middleware (body-parser, cors, etc.)
- Connects to databases
- Configures environment variables
- Defines API routes
- Sets up error handling
- Exports the configured app for use in index.js

```javascript
// Example app.js structure
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const routes = require("./routes");

const app = express();

// Middleware setup
app.use(express.json());
app.use(cors());

// Routes setup
app.use("/api", routes);

// Error handling
app.use((err, req, res, next) => {
  // Error handling logic
});

module.exports = app;
```

### index.js

The `index.js` file is the entry point for the application. It:

- Imports the configured Express app
- Sets the port for the server
- Starts the server and listens for connections
- Handles server startup errors

```javascript
// Example index.js structure
const app = require("./app");
const config = require("./config/config");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Modules/Packages

| Package           | Purpose                                                             |
| ----------------- | ------------------------------------------------------------------- |
| express           | Web framework for creating API endpoints and handling HTTP requests |
| mongoose          | ODM library for MongoDB interaction                                 |
| cors              | Enables Cross-Origin Resource Sharing                               |
| dotenv            | Loads environment variables from .env file                          |
| bcrypt            | Password hashing utility                                            |
| jsonwebtoken      | JWT implementation for authentication                               |
| express-validator | Input validation middleware                                         |
| helmet            | Secures Express apps by setting various HTTP headers                |
| morgan            | HTTP request logger middleware                                      |
| nodemon           | Development utility for auto-restarting server                      |

## Folder Explanations

### config/

Contains configuration files for the application:

- Database connections
- Environment variables
- Authentication settings
- Other app-specific configurations

### controllers/

Houses the application's business logic. Controllers:

- Receive requests from routes
- Interact with models to fetch/manipulate data
- Format and send responses
- Handle request-specific errors

### models/

Defines data schemas and models:

- Database schema definitions
- Data validation rules
- Model methods and statics
- Relationships between different data entities

### routes/

Contains API route definitions:

- Endpoint definitions (GET, POST, PUT, DELETE, etc.)
- Route-specific middleware
- Groups related endpoints
- Routes requests to appropriate controllers

### middleware/

Custom middleware functions:

- Authentication and authorization
- Input validation
- Error handling
- Request logging
- Custom response formatting

### utils/

Helper functions and utilities:

- Data formatting
- Common calculations
- Reusable functions
- Third-party service integrations

## Setup and Usage

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Start the server:
   - Development: `npm run dev`
   - Production: `npm start`
