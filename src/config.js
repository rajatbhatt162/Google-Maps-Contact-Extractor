// Configuration for Google Maps API
module.exports = {
  // Use environment variable if available, otherwise use the hardcoded key
  apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDfY-5yJAj6ee-s_ExRCCvS0wWA6G61hKs',
  
  // Application settings
  maxResultsPerCategory: 20,
  
  // Rate limiting to avoid hitting API limits
  apiDelayMs: 200
}; 