# Deployment Guide for Business Finder Application

This document provides instructions for deploying the Google Maps Business Finder application to various hosting platforms.

## Prerequisites

- Node.js v14 or higher
- npm or yarn
- A Google Maps API key (already configured in the application)

## Local Deployment

1. Clone the repository:
   ```
   git clone <repository-url>
   cd google-maps-business-finder
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application:
   ```
   npm start
   ```

4. Access the application at `http://localhost:3000`

## Cloud Deployment Options

### Heroku Deployment

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI
3. Login to Heroku:
   ```
   heroku login
   ```
4. Create a new Heroku app:
   ```
   heroku create google-maps-business-finder
   ```
5. Deploy the application:
   ```
   git push heroku main
   ```
6. Open the deployed application:
   ```
   heroku open
   ```

### Render Deployment

1. Create a Render account
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the deployment:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variable: `PORT=10000` (or any port Render provides)
5. Click "Create Web Service"

### Digital Ocean App Platform

1. Create a Digital Ocean account
2. Navigate to the App Platform
3. Create a new app and select your GitHub repository
4. Configure the deployment:
   - Type: Web Service
   - Environment: Node.js
   - Build Command: `npm install`
   - Run Command: `npm start`
5. Review and deploy

## Production Configuration

The application is already configured to:
- Use environment variables for port configuration
- Apply security headers
- Handle error logging

## Securing Your API Key

For production deployments, it's recommended to secure your Google Maps API key:
1. Use environment variables instead of hardcoded keys
2. Set up API key restrictions in the Google Cloud Console:
   - HTTP referrer restrictions
   - IP address restrictions
   - Usage quotas

## Scaling Considerations

- The application uses a basic Express server which can handle moderate traffic
- For high-traffic scenarios, consider:
  - Implementing caching for API responses
  - Adding rate limiting
  - Using a load balancer with multiple instances

## Troubleshooting

If you encounter issues during deployment:
1. Check the application logs
2. Verify your API key is working and has the necessary permissions
3. Ensure your hosting provider supports all the required features 