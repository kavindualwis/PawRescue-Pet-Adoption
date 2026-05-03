# PawRescue Pet Management System - Backend Setup Guide

## Files Created

### Models

- `backend/models/Pet.js` - Pet schema with fields: name, type, breed, age, gender, description, status, location, images, createdBy
- `backend/models/PetCategory.js` - Category schema for pet types (Dog, Cat, Bird, etc.)

### Controllers

- `backend/controllers/petController.js` - CRUD operations for pets
- `backend/controllers/categoryController.js` - Category management (view & initialize)

### Routes

- `backend/routes/pets.js` - Pet endpoints with image upload support
- `backend/routes/categories.js` - Category endpoints

### Utilities

- `backend/utils/imageUpload.js` - Image upload & base64 conversion middleware

### Documentation

- `backend/API_DOCUMENTATION.md` - Complete API endpoint documentation

## Features Implemented

✅ **Pet CRUD Operations**

- Create pet (any authenticated user)
- Read all pets (with filters: status, type, location)
- Read single pet
- Update pet (by creator or admin)
- Delete pet (by creator or admin)

✅ **Pet Categories**

- Pre-defined categories: Dog, Cat, Bird, Rabbit, Hamster, Guinea Pig, Horse, Fish, Reptile, Other
- Users select from existing categories (no user-created categories)
- Initialize endpoint to set up default categories

✅ **Image Support**

- Upload up to 5 images per pet
- Supports JPEG, JPG, PNG, GIF
- Max 5MB per image
- Automatic base64 encoding for storage

✅ **User Authentication**

- JWT-based auth on protected routes
- Users can only edit/delete their own pets
- Admin override available

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
# (Multer was already added to package.json)
```

### 2. Start Server

```bash
npm run dev  # Uses nodemon
# Server runs on http://localhost:3001
```

### 3. Initialize Categories (First Time)

```bash
curl -X POST http://localhost:3001/api/categories/initialize
```

### 4. Get Categories

```bash
curl http://localhost:3001/api/categories
```

Response shows category IDs needed for creating pets.

### 5. Create a Pet Example

```bash
curl -X POST http://localhost:3001/api/pets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Buddy",
    "type": "CATEGORY_ID_HERE",
    "breed": "Golden Retriever",
    "age": 3,
    "gender": "Male",
    "description": "Friendly and energetic",
    "location": "Colombo"
  }'
```

## API Endpoints Summary

| Method | Endpoint                   | Auth | Purpose                              |
| ------ | -------------------------- | ---- | ------------------------------------ |
| POST   | /api/categories/initialize | No   | Set up default categories (run once) |
| GET    | /api/categories            | No   | List all categories                  |
| POST   | /api/pets                  | Yes  | Create new pet                       |
| GET    | /api/pets                  | No   | Get all pets (filterable)            |
| GET    | /api/pets/:id              | No   | Get single pet details               |
| GET    | /api/pets/user/:userId     | No   | Get user's pets                      |
| PUT    | /api/pets/:id              | Yes  | Update pet (creator only)            |
| DELETE | /api/pets/:id              | Yes  | Delete pet (creator only)            |

## Image Upload

### Option 1: Multipart Form Data

```javascript
const formData = new FormData();
formData.append("name", "Buddy");
formData.append("type", "categoryId");
formData.append("breed", "Labrador");
formData.append("age", 2);
formData.append("gender", "Male");
formData.append("location", "Colombo");
formData.append("images", fileInput.files[0]);
formData.append("images", fileInput.files[1]); // Multiple files

fetch("http://localhost:3001/api/pets", {
  method: "POST",
  headers: { Authorization: "Bearer token" },
  body: formData,
});
```

### Option 2: Base64 String

```javascript
fetch("http://localhost:3001/api/pets", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer token",
  },
  body: JSON.stringify({
    name: "Buddy",
    type: "categoryId",
    breed: "Golden Retriever",
    age: 3,
    gender: "Male",
    location: "Colombo",
    images: ["data:image/jpeg;base64,..."],
  }),
});
```

## Database Schema

### Pet Collection

```javascript
{
  _id: ObjectId,
  name: String,
  type: ObjectId (reference to PetCategory),
  breed: String,
  age: Number,
  gender: Enum [Male, Female, Unknown],
  description: String,
  status: Enum [available, adopted, rescue-needed],
  location: String,
  images: [String], // Base64 encoded images
  createdBy: ObjectId (reference to User),
  createdAt: Date,
  updatedAt: Date
}
```

### PetCategory Collection

```javascript
{
  _id: ObjectId,
  name: String (unique),
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Integration Tips

When you add the "Post Pet" button on the Explore page:

1. Fetch categories: `GET /api/categories`
2. Show form with category dropdown populated from fetch
3. Allow file upload for images (up to 5)
4. On submit, use multipart form data OR base64 encoding
5. Include JWT token in Authorization header
6. Display success/error message to user

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

Common errors:

- 400: Missing required fields or invalid data
- 401: No/invalid authentication token
- 403: Not authorized to perform action (editing someone else's pet)
- 404: Pet or category not found
- 500: Server error

---

For detailed endpoint documentation, see `API_DOCUMENTATION.md`
