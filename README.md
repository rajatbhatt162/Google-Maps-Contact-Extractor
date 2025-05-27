# Google Maps Business Contact Finder

A simple web application that lets you search for businesses and retrieve their contact information using the Google Maps Places API.

## Features

- Search for businesses by type and location
- View business contact details including phone numbers
- Access business websites and Google Maps links
- Category-based extraction of multiple businesses
- Export business data to CSV or JSON
- User-friendly interface

## Prerequisites

- Node.js (v12 or higher)
- Google Maps API key (already configured)

## Installation

1. Clone this repository
2. Navigate to the project directory:
   ```
   cd google-maps-business-finder
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage

1. Start the application:
   ```
   node src/index.js
   ```
   Or use npm script:
   ```
   npm start
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Individual Business Search
1. Enter the type of business and location in the search form
2. Click on a business from the results to view its contact information

### Category-Based Extraction
1. Navigate to the "Category-Based Extraction" page at:
   ```
   http://localhost:3000/categories
   ```
2. Enter "Dehradun" (or any other location) in the location field
3. Enter multiple categories (like restaurant, hotel, travel agency) in the categories field
4. Click "Extract Businesses" to get businesses for each category
5. Export the results to CSV or JSON using the export buttons

## Notes

- This application uses the Google Places API to search for businesses and retrieve their contact information
- The API key is already configured in the application
- The application limits results to 5 businesses per search to avoid excessive API usage
- You can extract multiple categories at once with the category-based extraction feature

## API Endpoints

- `GET /api/search?query={business_type}&location={location}` - Search for businesses
- `GET /api/details/:placeId` - Get detailed information for a specific business
- `GET /api/extract-categories?location={location}&categories={categories}` - Extract businesses by multiple categories

## Security Notes

In a production environment, it's recommended to:
- Secure the API key with environment variables
- Implement rate limiting
- Add proper error handling and logging 