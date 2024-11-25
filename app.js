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







  app.post ('/api/log-404', async (req, res, next) => {
    console.log(req.body,'sudjvuyjvuj');
    // Get the client IP address
    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
   
  
    // Check if the IP is IPv4-mapped IPv6 and extract IPv4
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }
  
    // Get latitude/longitude based on IP (using geoip-lite)
    let geo = geoip.lookup(clientIp);
 
  
    if (!geo || !geo.ll) {
      console.log('IP not found in geoip-lite, using external API...');
  
      // Fallback to an external API if geoip-lite fails
      try {
        const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
        const data = response.data;
  
        if (data.status === 'success') {
          geo = {
            ll: [data.lat, data.lon]
          };
        } else {
          console.log('External API failed to provide geolocation.');
          geo = { ll: ['Unknown', 'Unknown'] };
        }
      } catch (error) {
        console.error('Error fetching geolocation from external API:', error);
        geo = { ll: ['Unknown', 'Unknown'] };
      }
    }
  

 
  
    // The rest of your code remains unchanged
    const url_client = req.body.url;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const city = req.body.city;
    const state = req.body.state;
    const country = req.body.country;
    
    const id = url_client
    console.log('id: ', id);
    const unique_id = id;
    console.log('unique_id: ', unique_id);
  
    const {date , time} = getCurrentDateTime();
   
   
  
    // Query to fetch original URL and increment visit count
    const qrySelect = `
     SELECT org_url, visit_count 
FROM link_details 
WHERE short_url = ? 
  AND validity_date >= ? 
  AND status = ?

    `;
  
    const qryUpdateVisitCount = `
      UPDATE link_details 
      SET visit_count = visit_count + 1 
      WHERE short_url = ?
    `;
  
  
    const insert_data=`INSERT INTO ip_address_client ( unique_id,url_input, ip_client,latitude,longitude,click_date,click_time,city,state,country) VALUES (?,?, ?,?,?,?,?,?,?,?)`
  
    try {
      const result = await executeQuery(qrySelect, [unique_id, date,"1"]);
      console.log('result: ', result);
  
      if (result.length > 0) {
        const orgUrl = result[0].org_url;
  
        // Increment the visit count
        await executeQuery(qryUpdateVisitCount, [unique_id]);

        
        await executeQuery(insert_data, [unique_id,url_client,clientIp,latitude,longitude,date,time,city,state,country]);
  console.log(orgUrl,'orgUrlorgUrl');
        // Redirect to the URL with the unique_id appended as a query parameter
        res.status(200).send({success:'200' ,orgUrl});
      } else {
        // Respond with 404 and pass the client IP address, URL, and latitude, along with the unique ID to the view
        res.status(404).json({ 
          clientIp, 
          url_client, 
          latitude, 
          longitude,
          unique_id 
        });
      }
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

// Error handling middleware
app.use(errorMiddleware);

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
