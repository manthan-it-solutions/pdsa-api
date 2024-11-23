const express = require('express');
require('dotenv').config();
const cors = require('cors');
const routes = require('./routes/authRoutes');
const adminroutes = require('./routes/adminRoutes');
const userroutes = require('./routes/userRoutes');
const errorMiddleware = require('./middlewere/errorMiddleware');
const fileUpload = require('express-fileupload');
const geoip = require('geoip-lite');
const getCurrentDateTime  =require('./utilities/DateTimefunction')
const {executeQuery} = require('./dbconfig/dbConfig')
const axios =require('axios')
const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for localhost:3000
app.use(cors({
    origin: 'http://localhost:3000',  // Allow requests only from localhost:3000
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Enable cookies if needed
}));

// Handle preflight (OPTIONS) requests
app.options('*', cors());

// Middleware to parse JSON data
app.use(express.json());

// Middleware to parse URL-encoded data (form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/static/uploads', express.static('uploads'));

// Middleware for file uploads
app.use(fileUpload());

// Define routes
app.use('/auth', routes);
app.use('/admin', adminroutes);
app.use('/user', userroutes);



// Endpoint for logging 404 errors and redirecting based on valid URLs
app.post('/api/log-404', async (req, res) => {
    try {
      // Log the incoming request data for debugging
      console.log('Request body:', req.body);
  
      const { date, time } = getCurrentDateTime();
  
      // Get the client IP address from headers or fallback to remoteAddress
      let clientIp = req.body.clientIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      console.log('Raw Client IP Address:', clientIp);
  
      // Check if the IP is IPv4-mapped IPv6 and extract IPv4
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
      }
  
      // Get latitude/longitude based on IP using geoip-lite
      let geo = geoip.lookup(clientIp);
      console.log('Geo:', geo);
  
      // If geo lookup fails, use an external API (ip-api)
      if (!geo || !geo.ll) {
        console.log('Geoip-lite failed, using external API...');
        try {
          const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
          const data = response.data;
  
          if (data.status === 'success') {
            geo = { ll: [data.lat, data.lon] };
          } else {
            console.log('External API failed to provide geolocation.');
            geo = { ll: ['Unknown', 'Unknown'] };
          }
        } catch (error) {
          console.error('Error fetching geo-location from external API:', error);
          geo = { ll: ['Unknown', 'Unknown'] };
        }
      }
  
      // Extract latitude and longitude
      const latitude = geo.ll[0];
      const longitude = geo.ll[1];
      console.log(`Geo location: Latitude: ${latitude}, Longitude: ${longitude}`);
  
      // Extract URL and unique ID from the incoming request
      const urlClient = req.body.path; // Ensure you're using 'path' from the body
      console.log('URL from client:', urlClient);
  
      const id = urlClient.split("/")[2]; // Assuming the unique ID is in the URL structure
      console.log('ID:', id);
      const uniqueId = id;
  
    //   // SQL query to fetch original URL and increment visit count
    //   const qrySelect = `
    //     SELECT org_url, visit_count 
    //     FROM link_details 
    //     WHERE unique_id = ? 
    //       AND validity_date >= ? 
    //       AND status = '1'
    //   `;
      const qryUpdateVisitCount = `
        UPDATE link_details 
        SET visit_count = visit_count + 1 
        WHERE unique_id = ?
      `;
      const insertData = `
        INSERT INTO ip_address_client (unique_id, url_input, ip_client, latitude, longitude, click_date,click_time) 
        VALUES (?, ?, ?, ?, ?, ?,?)
      `;
  
    //   // Query database to check for a valid URL
    //   const result = await executeQuery(qrySelect, [uniqueId, date]);
  
      if (true) {
        // const orgUrl = result[0].org_url;
  
        // Increment the visit count
        await executeQuery(qryUpdateVisitCount, [uniqueId]);
  
        // Log the client visit in the database
        await executeQuery(insertData, [uniqueId, urlClient, clientIp, latitude, longitude, date,time]);
  
        // Redirect to the original URL
        // res.redirect(orgUrl);
        res.status(200).send({message:'inserted successfullly '})
      } else {
        // Respond with 404 if no matching record is found
        res.status(404).send({ 
          message: '404 Not Found',
          clientIp,
          urlClient,
          latitude,
          longitude,
          uniqueId
        });
      }
    } catch (error) {
      console.error('Error in logging 404:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

// Error handling middleware
app.use(errorMiddleware);

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
