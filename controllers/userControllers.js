
const { executeQuery } = require('../dbconfig/dbConfig')

const authMiddleware = require('../middlewere/authMiddleware')
const authService = require('../services/authServices')

const bcrypt = require ('bcrypt')
const uploadHelper = require ('../utilities/uploadHelper');
const { getCurrentDateTime } = require('../utilities/DateTimefunction');




exports.getURL_data_zone=async(req,res)=>{
console.log('hiyy');
    try {

      
        const user_id = req.user.user_id
        console.log('user_id: ', user_id);

        const select_data_user_id=`select region_name from crediantial_tbl where user_id =?`

       const  result = await executeQuery(select_data_user_id,[user_id]) 
       console.log('result: ', result);
     
       

       res.status(200).send({success:'200' , data:result})
    } catch (error) {
        console.log('error: ', error);
        
    }
}


exports.getURL_data_zone_user = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides user_id
    console.log('userId: ', userId);

    try {
        // Step 1: Get zone(s) for the user
        const [zoneResult] = await executeQuery(
            `SELECT location FROM crediantial_tbl WHERE user_id = ?`, 
            [userId]
        );

        if (!zoneResult || zoneResult.length === 0) {
            return res.status(404).json({ message: 'Zone(s) not found for user' });
        }

        // Step 2: Extract user zones and split if multiple zones exist
        const userZones = zoneResult.location; // Assuming 'location' contains zones as a string
        const zoneArray = userZones.split(',').map(zone => zone.trim()); // Split into an array of zones
        console.log('zoneArray: ', zoneArray);

        if (zoneArray.length === 0) {
            return res.status(404).json({ message: 'No valid zones found' });
        }

        // Step 3: Dynamically build placeholders for SQL query
        const placeholders = zoneArray.map(() => '?').join(','); // Create "?" placeholders
        console.log('placeholders: ', placeholders);

        // Step 4: Fetch data for the user's zones
        const result = await executeQuery(
            `
            SELECT 
                dm.zone AS zone,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.v_c_date IS NOT NULL) AS video_send_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.v_click_date IS NOT NULL AND hu.v_click_date != '') AS video_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL) AS total_feedback_sms_sent,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.f_click_date IS NOT NULL AND hu.f_click_date != '') AS total_feedback_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL AND hu.feedback_date != '') AS feedback_sms_video_count
            FROM 
                dealer_master dm
            WHERE 
                dm.zone IN (${placeholders}) -- Use IN operator for multiple zones
            GROUP BY 
                dm.zone
            ORDER BY 
                FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
            `,
            zoneArray // Pass the array as query parameters
        );

        // Step 5: Return fetched data
        console.log('Fetched data: ', result);
        res.status(200).json({ success: '200', data: result });

    } catch (error) {
        console.error('Error fetching zone data: ', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



exports.getURL_data_user = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides authenticated user info
    console.log('userId: ', userId);

    try {
        // Step 1: Get region for the user
        const [regionResult] = await executeQuery(
            `SELECT region_name FROM crediantial_tbl WHERE user_id = ?`, 
            [userId]
        );

        if (!regionResult || regionResult.length === 0) {
            return res.status(404).json({ message: 'Region not found for user' });
        }

        const userRegion = regionResult.region_name;
        console.log('userRegion:', userRegion);

        // Step 2: Split regions into an array (if multiple regions are present)
        const regionArray = userRegion.split(',').map((region) => region.trim());

        // Step 3: Fetch data for the regions using the SQL IN operator
        const placeholders = regionArray.map(() => '?').join(','); // Create placeholders for query
        const result = await executeQuery(`
            SELECT 
                dm.region AS region,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.v_c_date IS NOT NULL) AS video_send_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.v_click_date IS NOT NULL AND hu.v_click_date != '') AS video_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL) AS total_feedback_sms_sent,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.f_click_date IS NOT NULL AND hu.f_click_date != '') AS total_feedback_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL AND hu.feedback_date != '') AS feedback_sms_video_count
            FROM 
                dealer_master dm
            WHERE 
                dm.region IN (${placeholders}) -- Use IN operator for multiple regions
            GROUP BY 
                dm.region
            ORDER BY 
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
        `, regionArray); // Pass the array as parameters

        // Step 4: Return data
        res.status(200).json({ success: '200', data: result });

    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};





exports.get_dashboard_data_user = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides authenticated user info
    console.log('userId: ', userId);

    try {
        // Step 1: Get region for the user
        const [regionResult] = await executeQuery(
            `SELECT region_name FROM crediantial_tbl WHERE user_id = ?`, 
            [userId]
        );

        if (!regionResult || regionResult.length === 0) {
            return res.status(404).json({ message: 'Region not found for user' });
        }

        const userRegion = regionResult.region_name;

        // Step 2: Fetch dashboard data
        const result = await executeQuery(`
            SELECT 
                -- Total videos sent
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND hu.v_c_date IS NOT NULL) AS total_video_send_count,
                 
                -- Total feedback SMS sent
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND hu.click_date IS NOT NULL) AS total_feedback_sms_sent,
                 
                -- Today's video send count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND DATE(hu.v_c_date) = CURDATE()) AS today_video_send_count,
                 
                -- Today's feedback SMS sent count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND DATE(hu.click_date) = CURDATE()) AS today_feedback_sms_sent,
                 
                -- This week's video send count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND WEEK(hu.v_c_date, 1) = WEEK(CURDATE(), 1) 
                 AND YEAR(hu.v_c_date) = YEAR(CURDATE())) AS week_video_send_count,
                 
                -- This week's feedback SMS sent count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND WEEK(hu.click_date, 1) = WEEK(CURDATE(), 1) 
                 AND YEAR(hu.click_date) = YEAR(CURDATE())) AS week_feedback_sms_sent,
                 
                -- Last 15 days' video send count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND hu.v_c_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)) AS last_15_days_video_send_count,
                 
                -- Last 15 days' feedback SMS sent count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND hu.click_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)) AS last_15_days_feedback_sms_sent,
                 
                -- Monthly video send count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND MONTH(hu.v_c_date) = MONTH(CURDATE()) 
                 AND YEAR(hu.v_c_date) = YEAR(CURDATE())) AS month_video_send_count,
                 
                -- Monthly feedback SMS sent count
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master) 
                 AND MONTH(hu.click_date) = MONTH(CURDATE()) 
                 AND YEAR(hu.click_date) = YEAR(CURDATE())) AS month_feedback_sms_sent
        `);

        // Step 3: Return data
        res.status(200).json({
            success: true,
            data: result.length > 0 ? result[0] : { message: 'No data available' },
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




exports.select_user_details_by_user_id  = async (req,res)=>{
    console.log('hit1111');
    try {
        const id = req.body.id
      

     
        const query_select_details= `
  SELECT 
    h.cust_name,
    h.mobile,
    h.model_name,
    h.feedback_answer1,
    h.feedback_answer2,
    h.feedback_answer3,
    h.feedback_answer4,
    h.feedback_answer5,
    d.dealer_name
  FROM 
    honda_url_data h
  LEFT JOIN 
    dealer_master d 
    ON h.dealer_code = d.dealer_code
  WHERE 
    h.feedback_short_url = ? 
    OR h.vedio_short_url = ?

`
       
        const result = await executeQuery(query_select_details,[id,id])
        console.log('result: ', result);

        res.status(200).send({success:"200", data:result})


    } catch (error) {
        console.log('error: ', error);
        res.status(500).send({message:error})
    }
}



exports.submit_feedback = async (req,res)=>{

    try {
console.log(req.body,'req.bodyreq.body');
        const { fullName,mobileNumber,modelName,dealership,receivedInfo,infoFormat,simulator,satisfaction,deliveryExperience}=req.body.formData 
const id = req.body.id
        const {date,time} = getCurrentDateTime()
        


        const update_feedback_from = `UPDATE honda_url_data
SET 
    feedback_answer1 = ?,
    feedback_answer2 = ?,
    feedback_answer3 = ?,
    feedback_answer4 = ?,
    feedback_answer5 = ?,
    feedback_date = ?,
    feedback_time = ?
WHERE 
    feedback_short_url =? 
    OR vedio_short_url =?;
`


        values =[receivedInfo,infoFormat,simulator,satisfaction,deliveryExperience,date,time,id,id]
        console.log('values: ', values);





        const result = await executeQuery (update_feedback_from,values)

        res.status(200).send({success:"updated"})
    } catch (error) {
        console.log('error: ', error);
        res.status(500).send ({message:error})
        
    }
}




exports.getUserDetailsRegion = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides authenticated user info


    try {


        // Step 1: Get region for the user
        const [regionResult] = await executeQuery(
            `SELECT region_name FROM crediantial_tbl WHERE user_id = ?`,
            [userId]
        );

           const userRegion=   req.body.region

        // if (!regionResult || !regionResult.region_name) {
        //     return res.status(404).json({ message: 'Region not found for user' });
        // }

        const columnName = req.body.columnName;
        // const userRegion = regionResult.region_name;

        // Define queries for specific metrics
        const metricFilters = {
            video_send_count: `
                hu.v_c_date IS NOT NULL
            `,
            video_click_count: `
                hu.v_click_date IS NOT NULL AND hu.v_click_date != ''
            `,
            total_feedback_click_count: `
                hu.f_click_date IS NOT NULL AND hu.f_click_date != ''
            `,
            feedback_sms_video_count: `
                hu.click_date IS NOT NULL AND hu.feedback_date != ''
            `,
        };

        // Validate the columnName
        if (!metricFilters[columnName] && columnName !== 'sub_total') {
            return res.status(400).json({ message: 'Invalid columnName provided' });
        }

        // Step 2: Execute the dealer details query filtered by the selected metric
        const dealerDetailsQuery = `
            SELECT 
                dm.region AS region,    
                hu.dealer_code,
                hu.cdate,
                hu.ctime,
                hu.v_c_date,
                hu.v_click_date,
                hu.click_date,
                hu.feedback_date,
                dm.main_dealer,
                dm.dealer_name,
                dm.dealer_type,
                dm.dealer_code AS Dealer_code,
                dm.region AS Dealer_region,
                dm.state AS Dealer_State,
                dm.city AS Dealer_City,
                hu.model_name,
                hu.feedback_answer1,
                hu.feedback_answer2,
                hu.feedback_answer3,
                hu.feedback_answer4,
                hu.feedback_answer5,
                hu.feedback_date,
                hu.feedback_time
            FROM 
                dealer_master dm
            LEFT JOIN honda_url_data hu ON hu.dealer_code = dm.dealer_code
            WHERE 
                dm.region = ? 
                AND ${metricFilters[columnName] || '1=1'} -- Filter rows based on the metric
            ORDER BY 
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West');
        `;

        const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [userRegion]);

        // Step 3: Function to calculate sum for individual metrics
        const getMetricCount = async (metric) => {
            const metricSumQuery = `
                SELECT COUNT(*) AS ${metric}
                FROM honda_url_data hu
                WHERE hu.dealer_code IN 
                    (SELECT dealer_code FROM dealer_master WHERE region = ?) 
                AND ${metricFilters[metric]};
            `;
            const [metricCountResult] = await executeQuery(metricSumQuery, [userRegion]);
            return metricCountResult[metric] || 0;
        };

        // Step 4: Execute queries for 'sub_total' if columnName is 'sub_total'
        let subTotal = 0;
        if (columnName === 'sub_total') {
            // Run queries for each metric and calculate the sub_total using Promise.all
            const metrics = ['video_send_count', 'video_click_count', 'total_feedback_click_count', 'feedback_sms_video_count'];
            const counts = await Promise.all(metrics.map(metric => getMetricCount(metric)));

            // Calculate the sub_total
            subTotal = counts.reduce((sum, count) => sum + count, 0); // sum the counts
        }

        // Step 5: Map the dealer details to include the metric count or sub_total
        const combinedResult = await Promise.all(dealerDetailsResult.map(async (dealer) => {
            return {
                ...dealer,
                video_send_count: columnName === 'sub_total' ? 0 : await getMetricCount('video_send_count'),
                video_click_count: columnName === 'sub_total' ? 0 : await getMetricCount('video_click_count'),
                total_feedback_click_count: columnName === 'sub_total' ? 0 : await getMetricCount('total_feedback_click_count'),
                feedback_sms_video_count: columnName === 'sub_total' ? 0 : await getMetricCount('feedback_sms_video_count'),
                sub_total: columnName === 'sub_total' ? subTotal : 0,
            };
        }));
        
        console.log('combinedResult:', combinedResult.length);
        res.status(200).json({ success: '200', data: combinedResult });
    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




exports.getUserDetailsZone = async (req, res) => {
    const userId = req.user.user_id;
  

    try {
//         // Step 1: Get zone for the user
//         const [zoneResult] = await executeQuery(
//             `SELECT location FROM crediantial_tbl WHERE user_id = ?`, 
//             [userId]
//         );
//  console.log(zoneResult,"jhfkfhk")
//         if (!zoneResult || zoneResult.length === 0) {
//             return res.status(404).json({ message: 'Zone not found for user' });
//         }

//         const userZone = zoneResult.location;



const userZone = req.body.zone
console.log(userZone,"hhhhhhh") 
        // Ensure columnName exists in the request body and is valid
        const columnName = req.body.columnName;
        if (!columnName) {
            return res.status(400).json({ message: 'columnName is required' });
        }
console.log(columnName,11111)
        // Define queries for specific metrics
        const metricFilters = {
            video_send_count: `hu.v_c_date IS NOT NULL`,
            video_click_count: `hu.v_click_date IS NOT NULL AND hu.v_click_date != ''`,
            total_feedback_click_count: `hu.f_click_date IS NOT NULL AND hu.f_click_date != ''`,
            feedback_sms_video_count: `hu.click_date IS NOT NULL AND hu.feedback_date != ''`,
        };
 
        // Validate the columnName
        if (!metricFilters[columnName]) {
            return res.status(400).json({ message: 'Invalid columnName provided' });
        }

        // Step 2: Execute the dealer details query filtered by the selected metric
        const dealerDetailsQuery = `
            SELECT 
                dm.zone AS zone,    
                hu.dealer_code,
                hu.cdate,
                hu.ctime,
                hu.v_c_date,
                hu.v_click_date,
                hu.click_date,
                hu.feedback_date,
                dm.main_dealer,
                dm.dealer_name,
                dm.dealer_type,
                dm.dealer_code AS Dealer_code,
                dm.zone AS Dealer_zone,
                dm.state AS Dealer_State,
                dm.city AS Dealer_City,
                hu.model_name,
                hu.feedback_answer1,
                hu.feedback_answer2,
                hu.feedback_answer3,
                hu.feedback_answer4,
                hu.feedback_answer5,
                hu.feedback_date,
                hu.feedback_time
            FROM 
                dealer_master dm
            LEFT JOIN honda_url_data hu ON hu.dealer_code = dm.dealer_code
            WHERE 
                dm.zone = ? 
                AND ${metricFilters[columnName] || '1=1'} -- Filter rows based on the metric
            ORDER BY

                    FIELD(dm.region, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
            ;
        `;

        const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [userZone]);

        // Step 3: Function to calculate sum for individual metrics
        const getMetricCount = async (metric) => {
            const metricSumQuery = `
                SELECT COUNT(*) AS ${metric}
                FROM honda_url_data hu
                WHERE hu.dealer_code IN 
                    (SELECT dealer_code FROM dealer_master WHERE zone = ?) 
                AND ${metricFilters[metric]} ;
            `;
            const [metricCountResult] = await executeQuery(metricSumQuery, [userZone]);
            return metricCountResult[metric] || 0;
        };

        // Step 4: Map the dealer details to include the metric count
        const combinedResult = await Promise.all(dealerDetailsResult.map(async (dealer) => {
            return {
                ...dealer,
                video_send_count: await getMetricCount('video_send_count'),
                video_click_count: await getMetricCount('video_click_count'),
                total_feedback_click_count: await getMetricCount('total_feedback_click_count'),
                feedback_sms_video_count: await getMetricCount('feedback_sms_video_count'),
            };
        }));

        console.log('combinedResult:', combinedResult);
        res.status(200).json({ success: '200', data: combinedResult });
    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};





















