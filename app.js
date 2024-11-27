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







// app.post('/api/log-404', async (req, res) => {
//   try {
//     const { url: url_client, latitude, longitude, city, state, country } = req.body;
    
//   const url_side = process.env.URL_SERVER

//     // Get client IP address
//     let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//     if (clientIp.startsWith('::ffff:')) {
//       clientIp = clientIp.replace('::ffff:', '');
//     }

//     // Fetch geolocation data based on client IP using `geoip-lite` or external API fallback
//     let geo = geoip.lookup(clientIp);
//     if (!geo || !geo.ll) {
//       try {
//         const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
//         const data = response.data;

//         geo = data.status === 'success' ? { ll: [data.lat, data.lon] } : { ll: ['Unknown', 'Unknown'] };
//       } catch (error) {
//         console.error('Error fetching geolocation from external API:', error);
//         geo = { ll: ['Unknown', 'Unknown'] };
//       }
//     }

//     const unique_id =` ${url_side}${url_client}`; // Assuming URL is the unique identifier
//     console.log('unique_id: ', unique_id);
//     const { date, time } = getCurrentDateTime();

//     // Prepare SELECT query to fetch original URL
//     const qrySelect = `
//     SELECT 
//   CASE 
//     WHEN feedback_short_url = ? THEN feedback_url
//     ELSE vedio_url
//   END AS org_url,
//   CASE 
//     WHEN feedback_short_url = ? THEN 'feedback'
//     ELSE 'vedio'
//   END AS url_type
// FROM 
//   honda_url_data
// WHERE 
//   feedback_short_url = ? OR 
//   vedio_short_url = ?;

//     `;

//     // Execute SELECT query to determine the original URL and type
//     const selectResult = await executeQuery(qrySelect, [unique_id, unique_id,unique_id,unique_id]);
//     console.log('unique_id: ', unique_id);
    

//     if (selectResult.length > 0) {
//       const { feedback_url, vedio_url } = selectResult[0];
//       let url_type, orgUrl;

//       if (feedback_url) {
//         url_type = 'feedback';
//         orgUrl = feedback_url;
//       } else if (vedio_url) {
//         url_type = 'vedio';
//         orgUrl = vedio_url;
//       }

//       // Construct the UPDATE query dynamically based on `url_type`
//       const qryUpdateVisitCount = `
//         UPDATE honda_url_data 
//         SET 
//           ${
//             url_type === 'feedback'
//               ? 'feedback_count = feedback_count + 1, feedback_click_city = ?, feedback_click_state = ?, feedback_click_country = ?, f_click_date = ?, f_click_time = ?'
//               : 'visit_count_vedio = visit_count_vedio + 1, vedio_click_city = ?, vedio_click_state = ?, vedio_click_country = ?, v_click_date = ?, v_click_time = ?'
//           } 
//         WHERE ${url_type === 'feedback' ? 'feedback_short_url' : 'vedio_short_url'} = ?
//       `;

//       // Increment visit count and update metadata
//       await executeQuery(qryUpdateVisitCount, [
//         city || geo.ll[0],
//         state || geo.ll[1],
//         country || 'Unknown',
//         date,
//         time,
//         unique_id,
//       ]);

//       // Send the original URL and unique ID back to the client
//       res.status(200).send({ success: '200', orgUrl, unique_id });
//     } else {
//       // URL not found; respond with error and metadata
//       res.status(404).json({
//         message: 'URL not found',
//         clientIp,
//         url_client,
//         latitude: latitude || geo.ll[0],
//         longitude: longitude || geo.ll[1],
//         unique_id,
//       });
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

  

// Error handling middleware



app.post('/api/log-404', async (req, res) => {

  console.log('111111111');
  try {
    const { url: url_client, latitude, longitude, city, state, country } = req.body;
    const url_side = process.env.URL_SERVER;

    // Construct the unique ID for the short URL
    const unique_id = `${url_side}${url_client}`;
    console.log('Unique ID:', unique_id);

    // Get client IP address
    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    // Fetch geolocation data using geoip-lite or fallback to external API
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

    // Get the current date and time
    const { date, time } = getCurrentDateTime();

    // Query to fetch the original URL and determine its type
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
        feedback_short_url = ? OR 
        vedio_short_url = ?;
    `;

    // Execute SELECT query
    const selectResult = await executeQuery(qrySelect, [unique_id, unique_id, unique_id, unique_id]);
    console.log('Select Query Result:', selectResult);

    if (selectResult.length > 0) {
      // Extract `org_url` and `url_type` from the query result
      const { org_url, url_type } = selectResult[0];
    

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

      // Execute UPDATE query
      await executeQuery(qryUpdateVisitCount, [
        city || geo.ll[0],         // City or fallback geolocation
        state || geo.ll[1],        // State or fallback geolocation
        country || 'Unknown',      // Country or 'Unknown'
        date,                      // Current date
        time,                      // Current time
        unique_id,                 // Unique short URL
      ]);

      // Respond with the original URL and unique ID
      res.status(200).send({ success: '200', orgUrl: org_url, unique_id,url_type });
    } else {
      // If no matching URL found, return 404 with metadata
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


app.use(errorMiddleware);

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
