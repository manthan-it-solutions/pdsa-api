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







app.post('/api/log-404', async (req, res) => {
  
  try {
    const { url: url_client, latitude, longitude, city, state, country } = req.body;

    // Get client IP address
    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    // Get geolocation based on IP using geoip-lite or fallback to external API
    let geo = geoip.lookup(clientIp);
    if (!geo || !geo.ll) {
      try {
        const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
        const data = response.data;

        geo = data.status === 'success' ? { ll: [data.lat, data.lon] } : { ll: ['Unknown', 'Unknown'] };
      } catch (error) {
        console.error('Error fetching geolocation from external API:', error);
        geo = { ll: ['Unknown', 'Unknown'] };
      }
    }

    const unique_id = url_client; // Assuming URL is the unique identifier
    const { date, time } = getCurrentDateTime();
    const url_type = url_client.split('/')[2]; // Determine URL type
    console.log('url_type: ', url_type);

    // Prepare queries
    const qrySelect = `
      SELECT 
        ${url_type === 'feedback' ? 'feedback_url' : 'vedio_url'} 
      AS org_url 
      FROM honda_url_data 
      WHERE ${url_type === 'feedback' ? 'feedback_short_url' : 'vedio_short_url'} = ? 
    `;

    const qryUpdateVisitCount = `
      UPDATE honda_url_data 
      SET 
        ${url_type === 'feedback' ? 'feedback_count = feedback_count + 1, feedback_click_city = ?, click_state = ?, click_country = ?' : 'visit_count_vedio = visit_count_vedio + 1, vedio_click_city = ?, v_click_date  = ? ,  v_click_time  = ?   ,vedio_click_state = ?, vedio_click_country = ?'} 
      WHERE ${url_type === 'feedback' ? 'feedback_short_url' : 'vedio_short_url'} = ?
    `;



    // Execute SELECT query to fetch original URL
    const selectResult = await executeQuery(qrySelect, [unique_id]);
    if (selectResult.length > 0) {
      const orgUrl = selectResult[0].org_url;

      // Increment visit count
      await executeQuery(qryUpdateVisitCount, [city,date,time, state, country, unique_id]);

      // Log click data
 

      res.status(200).send({ success: '200', orgUrl, unique_id });
    } else {
      res.status(404).json({
        message: 'URL not found',
        clientIp,
        url_client,
        latitude: latitude || geo.ll[0],
        longitude: longitude || geo.ll[1],
        unique_id,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});
  

// Error handling middleware
app.use(errorMiddleware);

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
