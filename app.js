const express = require('express');
require('dotenv').config();
const cors = require('cors');
const routes = require('./routes/authRoutes');
const adminroutes = require('./routes/adminRoutes');
const userroutes = require('./routes/userRoutes');
const errorMiddleware = require('./middlewere/errorMiddleware');
const fileUpload = require('express-fileupload');
const geoip = require('geoip-lite');
const {getCurrentDateTime } =require('./utilities/DateTimefunction')
const {executeQuery} = require('./dbconfig/dbConfig')
require('./utilities/cron/Cron_insertCSV')

const axios =require('axios')
const app = express();
const PORT = process.env.PORT || 8080;


app.use(cors())
// Handle preflight (OPTIONS) requests
// app.options('*', cors());

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


app.use(async (req, res, next) => {
  try {
    // Get the client IP address
    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('Raw Client IP Address: ', clientIp);

    // Check if the IP is IPv4-mapped IPv6 and extract IPv4
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    // Get latitude/longitude based on IP using geoip-lite
    let geo = geoip.lookup(clientIp);
    console.log('geo: ', geo);

    if (!geo || !geo.ll) {
      console.log('IP not found in geoip-lite, using external API...');

      // Fallback to an external API if geoip-lite fails
      try {
        const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
        const data = response.data;

        if (data.status === 'success') {
          geo = {
            ll: [data.lat, data.lon],
            city: data.city,
            state: data.regionName,
            country: data.country,
          };
        } else {
          console.log('External API failed to provide geolocation.');
          geo = { ll: ['Unknown', 'Unknown'], city: 'Unknown', state: 'Unknown', country: 'Unknown' };
        }
      } catch (error) {
        console.error('Error fetching geolocation from external API:', error);
        geo = { ll: ['Unknown', 'Unknown'], city: 'Unknown', state: 'Unknown', country: 'Unknown' };
      }
    }

    const { ll: [latitude, longitude], city, state, country } = geo;
    console.log(`Geo location: Latitude: ${latitude}, Longitude: ${longitude}`);


  

    const id = req.originalUrl
    
      const unique_id  = `http://192.168.0.119:8080${id}`

    // Prepare SELECT query to fetch original URL
    const qrySelect = `
      SELECT 
        CASE 
          WHEN feedback_short_url = ? THEN feedback_url
          ELSE vedio_url
        END AS org_url,
        CASE 
          WHEN feedback_short_url = ? THEN 'feedback'
          ELSE 'vedio'
        END AS url_type
      FROM 
        honda_url_data
      WHERE 
        feedback_short_url = ? OR vedio_short_url = ?;
    `;

    // Execute SELECT query
    const selectResult = await executeQuery(qrySelect, [unique_id, unique_id, unique_id, unique_id]);
    

    if (selectResult.length > 0) {
      const { org_url, url_type } = selectResult[0];
      const currentDateTime = new Date();
      const date = currentDateTime.toISOString().split('T')[0]; // yyyy-mm-dd
      const time = currentDateTime.toTimeString().split(' ')[0]; // hh:mm:ss

      // Construct the UPDATE query dynamically based on `url_type`
      const qryUpdateVisitCount = `
        UPDATE honda_url_data 
        SET 
          ${
            url_type === 'feedback'
              ? 'feedback_count = feedback_count + 1, feedback_click_city = ?, click_state = ?, click_country = ?, f_click_date = ?, f_click_time = ?'
              : 'visit_count_vedio = visit_count_vedio + 1, vedio_click_city = ?, vedio_click_state = ?, vedio_click_country = ?, v_click_date = ?, v_click_time = ?'
          } 
        WHERE ${url_type === 'feedback' ? 'feedback_short_url' : 'vedio_short_url'} = ?
      `;

    

      // Increment visit count and update metadata
      let result =  await executeQuery(qryUpdateVisitCount, [
       
        city || 'Unknown',
        state || 'Unknown',
        country || 'Unknown',
        date,
        time,
        unique_id,
      ]);

    console.log(result,'resultresult');

      // Redirect the client to the original URL
      res.redirect(org_url);
    } else {
      // URL not found
      res.status(404).json({ message: 'URL not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});






  







app.use(errorMiddleware);

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
