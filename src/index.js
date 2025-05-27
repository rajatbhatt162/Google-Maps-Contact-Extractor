const express = require('express');
const { Client } = require('@googlemaps/google-maps-services-js');
const config = require('./config');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
// Use environment port if available (for cloud deployment) or default to 3000
const port = process.env.PORT || 3000;

// Create a Google Maps client
const googleMapsClient = new Client({});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set production headers for security
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the category extraction page
app.get('/categories', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'categories.html'));
});

// API endpoint to search for businesses
app.get('/api/search', async (req, res) => {
  const { query, location } = req.query;
  
  if (!query || !location) {
    return res.status(400).json({ error: 'Query and location are required' });
  }

  try {
    // Search for places (businesses) using Places API Text Search
    const searchResponse = await googleMapsClient.textSearch({
      params: {
        query: `${query} ${location}`,
        key: config.apiKey
      }
    });

    // Get the top results
    const results = searchResponse.data.results.slice(0, 5);
    
    return res.json({ results });
  } catch (error) {
    console.error('Error searching for businesses:', error);
    return res.status(500).json({ error: 'Failed to search for businesses' });
  }
});

// API endpoint to get business details with contact information
app.get('/api/details/:placeId', async (req, res) => {
  const { placeId } = req.params;
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }

  try {
    // Get detailed information for a specific place including phone number
    const detailsResponse = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'url', 'international_phone_number'],
        key: config.apiKey
      }
    });

    const placeDetails = detailsResponse.data.result;
    
    return res.json({ details: placeDetails });
  } catch (error) {
    console.error('Error fetching business details:', error);
    return res.status(500).json({ error: 'Failed to fetch business details' });
  }
});

// API endpoint to extract businesses by categories in a specific location
app.get('/api/extract-categories', async (req, res) => {
  const { location, categories } = req.query;
  
  if (!location || !categories) {
    return res.status(400).json({ error: 'Location and categories are required' });
  }

  try {
    const categoryList = categories.split(',').map(cat => cat.trim());
    const results = {};

    // Define expanded search terms for specific industries to get more comprehensive results
    const industryExpansions = {
      'travel': ['travel agency', 'tour operator', 'tourism office', 'vacation planner', 
                'travel consultant', 'travel bureau', 'trip planner', 'travel service',
                'holiday planner', 'tour guide', 'travel company', 'tourist information'],
      'restaurant': ['restaurant', 'dining', 'eatery', 'cafe', 'diner', 'bistro', 
                    'food service', 'eating place', 'cafeteria', 'food joint'],
      'hotel': ['hotel', 'motel', 'inn', 'resort', 'lodging', 'accommodation', 
               'guest house', 'hostel', 'bed and breakfast', 'homestay'],
      'cafe': ['cafe', 'coffee shop', 'tea house', 'bakery', 'coffee house', 'espresso bar',
              'tea room', 'patisserie', 'coffee lounge', 'cafe bar'],
      'grocery': ['grocery store', 'supermarket', 'food market', 'convenience store', 
                 'mini mart', 'general store', 'food shop'],
      'real estate': ['real estate agency', 'property dealer', 'real estate broker', 'property management',
                     'real estate consultant', 'housing agency', 'property consultant', 'realty service',
                     'real estate office', 'property agent', 'land broker', 'housing consultant'],
      'clothing': ['clothing store', 'fashion store', 'apparel shop', 'garment shop', 'boutique',
                  'fashion boutique', 'clothes shop', 'designer wear', 'readymade garments',
                  'fashion outlet', 'textile shop', 'garment retailer'],
      'ecommerce': ['ecommerce service', 'online marketplace', 'e-commerce company', 
                   'digital marketplace', 'online retailer', 'e-business', 'internet retailer',
                   'online shopping service', 'e-tailer', 'web store service', 'electronic commerce']
    };

    // Process each category in series to avoid API rate limits
    for (const category of categoryList) {
      try {
        // Get expanded search terms for this category if available
        const searchTerms = industryExpansions[category.toLowerCase()] || [category];
        const businessesInCategory = [];
        
        // Search using each expanded term
        for (const searchTerm of searchTerms) {
          try {
            console.log(`Searching for "${searchTerm}" in ${location}...`);
            
            const searchResponse = await googleMapsClient.textSearch({
              params: {
                query: `${searchTerm} in ${location}`,
                key: config.apiKey
              }
            });
            
            // Process each result and get detailed information
            for (const business of searchResponse.data.results) {
              // Skip if we already have this business in our results (avoid duplicates)
              if (businessesInCategory.some(b => b.place_id === business.place_id)) {
                continue;
              }
              
              try {
                // Get detailed information for each place including phone number
                const detailsResponse = await googleMapsClient.placeDetails({
                  params: {
                    place_id: business.place_id,
                    fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 
                            'international_phone_number', 'rating', 'user_ratings_total', 
                            'types', 'business_status', 'opening_hours', 'address_components'],
                    key: config.apiKey
                  }
                });
                
                const details = detailsResponse.data.result;
                
                // Extract more detailed contact info when available
                const phoneNumber = details.formatted_phone_number || details.international_phone_number || 'N/A';
                
                // Extract city and state information when available
                let city = '', state = '';
                if (details.address_components) {
                  for (const component of details.address_components) {
                    if (component.types.includes('locality')) {
                      city = component.long_name;
                    }
                    if (component.types.includes('administrative_area_level_1')) {
                      state = component.long_name;
                    }
                  }
                }
                
                businessesInCategory.push({
                  name: business.name,
                  address: business.formatted_address,
                  place_id: business.place_id,
                  phone: phoneNumber,
                  website: details.website || 'N/A',
                  rating: business.rating || 'N/A',
                  user_ratings_total: business.user_ratings_total || 0,
                  business_status: details.business_status || 'N/A',
                  types: details.types || [],
                  city: city || 'N/A',
                  state: state || 'N/A',
                  category: category,
                  search_term: searchTerm
                });
                
                // Small delay to avoid hitting API rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch (detailsErr) {
                console.error(`Error fetching details for ${business.name}:`, detailsErr);
                
                // Still add the business, but without the detailed information
                businessesInCategory.push({
                  name: business.name,
                  address: business.formatted_address,
                  place_id: business.place_id,
                  phone: 'N/A',
                  website: 'N/A',
                  rating: business.rating || 'N/A',
                  user_ratings_total: business.user_ratings_total || 0,
                  category: category,
                  search_term: searchTerm
                });
              }
            }
          } catch (searchErr) {
            console.error(`Error searching for "${searchTerm}":`, searchErr);
          }
        }
        
        // Store the results with details for this category
        results[category] = businessesInCategory;
        
      } catch (err) {
        console.error(`Error fetching ${category} businesses:`, err);
        results[category] = { error: `Failed to fetch ${category} businesses` };
      }
    }
    
    return res.json({ location, categories: results });
  } catch (error) {
    console.error('Error extracting businesses by categories:', error);
    return res.status(500).json({ error: 'Failed to extract businesses by categories' });
  }
});

// API endpoint to generate a PDF report of businesses by category
app.get('/api/generate-report', async (req, res) => {
  const { location, categories } = req.query;
  
  if (!location || !categories) {
    return res.status(400).json({ error: 'Location and categories are required' });
  }

  try {
    // Get the data first (reusing the extract-categories functionality)
    const categoryList = categories.split(',').map(cat => cat.trim());
    const results = {};

    // Define expanded search terms for specific industries (same as in extract-categories)
    const industryExpansions = {
      'travel': ['travel agency', 'tour operator', 'tourism office', 'vacation planner', 
                'travel consultant', 'travel bureau', 'trip planner', 'travel service',
                'holiday planner', 'tour guide', 'travel company', 'tourist information'],
      'restaurant': ['restaurant', 'dining', 'eatery', 'cafe', 'diner', 'bistro', 
                    'food service', 'eating place', 'cafeteria', 'food joint'],
      'hotel': ['hotel', 'motel', 'inn', 'resort', 'lodging', 'accommodation', 
               'guest house', 'hostel', 'bed and breakfast', 'homestay'],
      'cafe': ['cafe', 'coffee shop', 'tea house', 'bakery', 'coffee house', 'espresso bar',
              'tea room', 'patisserie', 'coffee lounge', 'cafe bar'],
      'grocery': ['grocery store', 'supermarket', 'food market', 'convenience store', 
                 'mini mart', 'general store', 'food shop'],
      'real estate': ['real estate agency', 'property dealer', 'real estate broker', 'property management',
                     'real estate consultant', 'housing agency', 'property consultant', 'realty service',
                     'real estate office', 'property agent', 'land broker', 'housing consultant'],
      'clothing': ['clothing store', 'fashion store', 'apparel shop', 'garment shop', 'boutique',
                  'fashion boutique', 'clothes shop', 'designer wear', 'readymade garments',
                  'fashion outlet', 'textile shop', 'garment retailer'],
      'ecommerce': ['ecommerce service', 'online marketplace', 'e-commerce company', 
                   'digital marketplace', 'online retailer', 'e-business', 'internet retailer',
                   'online shopping service', 'e-tailer', 'web store service', 'electronic commerce']
    };

    // Process each category in series to avoid API rate limits (simplified for report generation)
    for (const category of categoryList) {
      try {
        // Get expanded search terms for this category if available
        const searchTerms = industryExpansions[category.toLowerCase()] || [category];
        const businessesInCategory = [];
        
        // Search using just the first expanded term to keep report generation faster
        const searchTerm = searchTerms[0];
        try {
          console.log(`Searching for "${searchTerm}" in ${location} for report...`);
          
          const searchResponse = await googleMapsClient.textSearch({
            params: {
              query: `${searchTerm} in ${location}`,
              key: config.apiKey
            }
          });
          
          // Process each result
          for (const business of searchResponse.data.results.slice(0, 10)) {
            // Skip if we already have this business in our results (avoid duplicates)
            if (businessesInCategory.some(b => b.place_id === business.place_id)) {
              continue;
            }
            
            try {
              // Get detailed information
              const detailsResponse = await googleMapsClient.placeDetails({
                params: {
                  place_id: business.place_id,
                  fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 
                          'international_phone_number', 'rating', 'user_ratings_total'],
                  key: config.apiKey
                }
              });
              
              const details = detailsResponse.data.result;
              
              businessesInCategory.push({
                name: business.name,
                address: business.formatted_address,
                phone: details.formatted_phone_number || details.international_phone_number || 'N/A',
                website: details.website || 'N/A',
                rating: business.rating || 'N/A',
                reviews: business.user_ratings_total || 0
              });
              
              // Small delay to avoid hitting API rate limits
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (detailsErr) {
              console.error(`Error fetching details for ${business.name}:`, detailsErr);
              
              // Still add the business, but without the detailed information
              businessesInCategory.push({
                name: business.name,
                address: business.formatted_address,
                phone: 'N/A',
                website: 'N/A',
                rating: 'N/A',
                reviews: 0
              });
            }
          }
        } catch (searchErr) {
          console.error(`Error searching for "${searchTerm}":`, searchErr);
        }
        
        // Store the results with details for this category
        results[category] = businessesInCategory;
        
      } catch (err) {
        console.error(`Error fetching ${category} businesses:`, err);
        results[category] = [];
      }
    }

    // Create a PDF document
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `business-report-${location}-${timestamp}.pdf`;
    const reportPath = path.join(reportsDir, reportFileName);
    
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(reportPath);
    
    doc.pipe(stream);
    
    // Add report title
    doc.fontSize(24).text(`Business Directory: ${location}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Loop through each category and add its businesses to the PDF
    let totalBusinessCount = 0;
    
    for (const [category, businesses] of Object.entries(results)) {
      if (!Array.isArray(businesses) || businesses.length === 0) {
        continue;
      }
      
      totalBusinessCount += businesses.length;
      
      // Add category heading
      doc.fontSize(18).fillColor('#4285F4').text(`${category.toUpperCase()} (${businesses.length} businesses)`, { underline: true });
      doc.moveDown(0.5);
      doc.fillColor('black');
      
      // Add businesses in this category
      businesses.forEach((business, index) => {
        doc.fontSize(14).text(business.name);
        doc.fontSize(10).text(`Address: ${business.address}`);
        
        if (business.phone && business.phone !== 'N/A') {
          doc.text(`Phone: ${business.phone}`);
        }
        
        if (business.website && business.website !== 'N/A') {
          doc.text(`Website: ${business.website}`, {
            link: business.website,
            underline: true,
            color: 'blue'
          });
        }
        
        if (business.rating && business.rating !== 'N/A') {
          doc.text(`Rating: ${business.rating} ★ (${business.reviews} reviews)`);
        }
        
        // Add separator between businesses
        if (index < businesses.length - 1) {
          doc.moveDown(0.5);
          doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
          doc.moveDown(0.5);
        } else {
          doc.moveDown(1);
        }
      });
      
      // Add a page break after each category except the last one
      if (Object.keys(results).indexOf(category) < Object.keys(results).length - 1) {
        doc.addPage();
      }
    }
    
    // Add summary at the end
    doc.addPage();
    doc.fontSize(20).text('Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total businesses found: ${totalBusinessCount}`, { align: 'center' });
    doc.moveDown();
    doc.text(`Categories searched: ${Object.keys(results).join(', ')}`, { align: 'center' });
    doc.moveDown(2);
    doc.text('Report generated using Google Maps Places API', { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
    // Wait for the PDF to be fully written
    stream.on('finish', () => {
      // Send the file
      res.download(reportPath, reportFileName, (err) => {
        if (err) {
          console.error('Error sending PDF report:', err);
          res.status(500).json({ error: 'Error generating PDF report' });
        }
      });
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: 'Failed to generate business report' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`API Key: ${config.apiKey.substring(0, 10)}...`);
}); 