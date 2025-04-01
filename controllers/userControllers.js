
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







exports.Searh_button_api_zone_user = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides user_id
    const fromdate = req.body.fromdate;
    const todate = req.body.todate;

    try {
        // Validate input dates
        if (!fromdate || !todate) {
            return res.status(400).json({ message: 'Please provide both fromdate and todate' });
        }

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
        console.log('Zone Array: ', zoneArray);

        if (zoneArray.length === 0) {
            return res.status(404).json({ message: 'No valid zones found' });
        }

        // Step 3: Dynamically build placeholders for SQL query
        const placeholders = zoneArray.map(() => '?').join(','); // Create "?" placeholders
        console.log('Placeholders: ', placeholders);

        // Step 4: Fetch data for the user's zones
        const result = await executeQuery(
            `
            SELECT 
                dm.zone AS zone,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.v_c_date IS NOT NULL
                 AND hu.cdate BETWEEN ? AND ?) AS video_send_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.v_click_date IS NOT NULL AND hu.v_click_date != ''   AND hu.cdate BETWEEN ? AND ?) AS video_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL   AND hu.cdate BETWEEN ? AND ?) AS total_feedback_sms_sent,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.f_click_date IS NOT NULL AND hu.f_click_date != ''   AND hu.cdate BETWEEN ? AND ?) AS total_feedback_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL AND hu.feedback_date != ''   AND hu.cdate BETWEEN ? AND ?) AS feedback_sms_video_count
            FROM 
                dealer_master dm
            WHERE 
                dm.zone IN (${placeholders}) -- Use IN operator for multiple zones
            GROUP BY 
                dm.zone
            ORDER BY 
                FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
            `,
            [fromdate, todate,fromdate, todate,fromdate, todate,fromdate, todate,fromdate, todate, ...zoneArray] // Pass the dates and zoneArray as query parameters
        );

        // Step 5: Return fetched data
        console.log('Fetched Data: ', result);
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



exports.Searh_button_api_region_user = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides authenticated user info
    console.log('userId: ', userId);

    const fromdate = req.body.fromdate;
    console.log('fromdate: ', fromdate);
    const todate = req.body.todate;
    console.log('todate: ', todate);

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
        const queryParams = [fromdate, todate, ...regionArray]; // Add date range params

        const result = await executeQuery(`
            SELECT 
                dm.region AS region,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.v_c_date IS NOT NULL 
                 AND hu.cdate BETWEEN ? AND ?) AS video_send_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.v_click_date IS NOT NULL AND hu.v_click_date != ''
                 AND hu.cdate BETWEEN ? AND ?) AS video_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL
                 AND hu.cdate BETWEEN ? AND ?) AS total_feedback_sms_sent,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.f_click_date IS NOT NULL AND hu.f_click_date != ''
                 AND hu.cdate BETWEEN ? AND ?) AS total_feedback_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL AND hu.feedback_date != ''
                 AND hu.cdate BETWEEN ? AND ?) AS feedback_sms_video_count
            FROM 
                dealer_master dm
            WHERE 
                dm.region IN (${placeholders}) -- Use IN operator for multiple regions
            GROUP BY 
                dm.region
            ORDER BY 
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
        `, [...queryParams, ...queryParams, ...queryParams, ...queryParams, ...queryParams]); // Pass all date range params for each metric

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

    try {
        const id = req.body.id
     let new_id = `${process.env.BACKEDURL}/${id}`



      

     
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
    d.dealer_name,
 h.feedback_date
  FROM 
    honda_url_data h
  LEFT JOIN 
    dealer_master d 
    ON h.dealer_code = d.dealer_code
  WHERE 
    h.feedback_short_url = ? 
    OR h.vedio_short_url = ?

`
       
        const result = await executeQuery(query_select_details,[new_id,new_id])
       
        

        res.status(200).send({success:"200", data:result})


    } catch (error) {
        console.log('error: ', error);
        res.status(500).send({message:error})
    }
}



exports.submit_feedback = async (req,res)=>{

    try {

        const { fullName,mobileNumber,modelName,dealership,receivedInfo,infoFormat,simulator,satisfaction,deliveryExperience}=req.body.formData 
const id = req.body.id
let new_id=`${process.env.BACKEDURL}/${id}`
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

	


        values =[receivedInfo,infoFormat,simulator,satisfaction,deliveryExperience,date,time,new_id,new_id]
  
        const result = await executeQuery (update_feedback_from,values)

        res.status(200).send({success:"updated"})
    } catch (error) {
        console.log('error: ', error);
        res.status(500).send ({message:error})
        
    }
}




exports.getUserDetailsRegion = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides authenticated user info
    const userRegion=   req.body.region
   
    const columnName = req.body.columnName;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;


    const fromdate = req.body.fromdate
    console.log('fromdate: ', fromdate);
    const todate = req.body.todate
    console.log('todate: ', todate);

    if(fromdate != ''  && todate != '' &&  fromdate != null  && todate != null ){
        console.log('111111111');
        try {
               // Define queries for specific metrics
               const metricFilters = {
                video_send_count: `hu.v_c_date IS NOT NULL`,
                video_click_count: `hu.v_click_date IS NOT NULL AND hu.v_click_date != ''`,
                total_feedback_click_count: `hu.f_click_date IS NOT NULL AND hu.f_click_date != ''`,
                feedback_sms_video_count: `hu.click_date IS NOT NULL AND hu.feedback_date != ''`,
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
                      AND hu.cdate BETWEEN ? AND ? -- Add date range filter
                ORDER BY 
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                         LIMIT ${limit} OFFSET ${offset};
                    ;
            `;
    
            const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [userRegion, fromdate, todate]);
    

       // Step 2: Execute the dealer details query filtered by the selected metric
       const total = `
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
           FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
               ;
           ;
   `;

   const total11 = await executeQuery(total, [userRegion]);
 



            // Step 3: Function to calculate sum for individual metrics
            const getMetricCount = async (metric) => {
                const metricSumQuery = `
                    SELECT COUNT(*) AS ${metric}
                    FROM honda_url_data hu
                    WHERE hu.dealer_code IN 
                        (SELECT dealer_code FROM dealer_master WHERE region = ?) 
                    AND ${metricFilters[metric]};
                `;
                const [metricCountResult] = await executeQuery(metricSumQuery, [userRegion, fromdate, todate]);
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
            res.status(200).json({ success: '200', data: combinedResult ,total:total11.length });
        } catch (error) {
            console.error('Error fetching region data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
            
            
    }


    else{
console.log('222222');
    if (userRegion === "total") {
        console.log('33333333333');
        try {
            // Metric filter for region-wise counts
            const metricFilters = {
                video_send_count: `hu.v_c_date IS NOT NULL`,
                video_click_count: `hu.v_click_date IS NOT NULL AND hu.v_click_date != ''`,
                total_feedback_click_count: `hu.f_click_date IS NOT NULL AND hu.f_click_date != ''`,
                feedback_sms_video_count: `hu.click_date IS NOT NULL AND hu.feedback_date != ''`,
            };
    
            // Step 1: Query to fetch region-wise counts based on columnName
            const totalRegionQuery = `
                SELECT 
                    dm.region AS region,
                    COUNT(*) AS ${columnName}
                FROM 
                    dealer_master dm
                LEFT JOIN honda_url_data hu ON hu.dealer_code = dm.dealer_code
                WHERE 
                    ${metricFilters[columnName]}
                GROUP BY 
                    dm.region
                ORDER BY 
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West');
            `;
    
            // Execute the query for region-wise data
            const totalRegionResult = await executeQuery(totalRegionQuery);
    
            // Step 2: Query to fetch dealer details
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
                    ${metricFilters[columnName]}
                ORDER BY 
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                         LIMIT ${limit} OFFSET ${offset};
                    ;
            `;
            
            // Execute the query for dealer details
            const dealerDetailsResult = await executeQuery(dealerDetailsQuery);
    
       // Step 2: Execute the dealer details query filtered by the selected metric
       const total = `
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
                    ${metricFilters[columnName]}
                ORDER BY 
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                         
                    ;
   `;

   const total11 = await executeQuery(total, [userRegion]);
 



            // Convert RowDataPacket to plain JavaScript objects
            const dealersInRegion = dealerDetailsResult.map(dealer => {
                return JSON.parse(JSON.stringify(dealer)); // Convert to plain JavaScript object
            });
    
            // Step 3: Combine region-wise counts and dealer details
            const combinedResult = totalRegionResult.map(regionData => {
                const dealersInRegionForRegion = dealersInRegion.filter(
                    dealer => dealer.region === regionData.region
                );
    
                return {
                    region: regionData.region,
                    [columnName]: regionData[columnName],
                    data: dealersInRegionForRegion, // Include dealer details
                };
            });
    
            // Merging all data into a single array
            const mergedData = combinedResult.reduce((acc, regionData) => {
                return acc.concat(regionData.data); // Concatenate all 'data' arrays into one
            }, []);
    
            // Log the merged data for debugging
            console.log(JSON.stringify(mergedData, null, 2), 'mergedData'); // Pretty print merged data
    
            // Send the merged data in the response
            return res.status(200).json({ success: '200', data: mergedData ,total:total11.length });
    
        } catch (error) {
            console.error('Error fetching region data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    
    
else{

console.log('22222222221111111111111');

    try {
    
         

        
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
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                     LIMIT ${limit} OFFSET ${offset};
                ;
        `;

        const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [userRegion]);
      



            // Step 2: Execute the dealer details query filtered by the selected metric
            const total = `
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
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                    ;
                ;
        `;

        const total11 = await executeQuery(total, [userRegion]);
      

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
        res.status(200).json({ success: '200', data: combinedResult ,total:total11.length });
    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

}

    }
};





exports.getUserDetailsZone = async (req, res) => {
    const userId = req.user.user_id;
    const userZone = req.body.zone
    const columnName = req.body.columnName;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const fromdate= req.body.fromdate
    console.log('fromdate: ', fromdate);
    const todate= req.body.todate
    console.log('todate: ', todate);


    if (fromdate != '' && todate != '' && fromdate != null && todate != null) {
        try {
            // Ensure columnName exists in the request body and is valid
            if (!columnName) {
                return res.status(400).json({ message: 'columnName is required' });
            }
    
            console.log(columnName, 11111);
    
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
    
            // Step 2: Execute the dealer details query filtered by the selected metric and date range
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
                    AND hu.cdate BETWEEN ? AND ? -- Add date range filter
                ORDER BY
                    FIELD(dm.region, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
                      LIMIT ${limit} OFFSET ${offset};
                    ;
            `;
    
            const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [userZone, fromdate, todate]);
    




                 // Step 2: Execute the dealer details query filtered by the selected metric and date range
                 const total = `
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
                     AND hu.cdate BETWEEN ? AND ? -- Add date range filter
                 ORDER BY
                     FIELD(dm.region, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
                       LIMIT ${limit} OFFSET ${offset};
                     ;
             `;
     
             const total11 = await executeQuery(total, [userZone, fromdate, todate]);
     
            // Step 3: Function to calculate sum for individual metrics with date range
            const getMetricCount = async (metric) => {
                const metricSumQuery = `
                    SELECT COUNT(*) AS ${metric}
                    FROM honda_url_data hu
                    WHERE hu.dealer_code IN 
                        (SELECT dealer_code FROM dealer_master WHERE zone = ?) 
                    AND ${metricFilters[metric]} 
                    AND hu.cdate BETWEEN ? AND ?;
                `;
                const [metricCountResult] = await executeQuery(metricSumQuery, [userZone, fromdate, todate]);
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
            res.status(200).json({ success: '200', data: combinedResult   , total :total11.length});
        } catch (error) {
            console.error('Error fetching region data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    


    else{

    


    if (userZone === 'total') {
        try {
            // Ensure columnName exists in the request body and is valid
            if (!columnName) {
                return res.status(400).json({ message: 'columnName is required' });
            }
    
            console.log(columnName, 11111);
    
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
    
            // Step 1: Query to fetch dealer details with the selected metric filter
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
                    ${metricFilters[columnName] || '1=1'} -- Filter rows based on the metric
                ORDER BY 
                    FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
                      LIMIT ${limit} OFFSET ${offset};
            `;
            
            const dealerDetailsResult = await executeQuery(dealerDetailsQuery);



            const total = `
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
                    ${metricFilters[columnName] || '1=1'} -- Filter rows based on the metric
                ORDER BY 
                    FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
                  
        `;
    
        const total11 = await executeQuery(total);
    
    
            // Step 2: Function to calculate sum for individual metrics for all zones
            const getMetricCount = async (metric) => {
                const metricSumQuery = `
                    SELECT COUNT(*) AS ${metric}
                    FROM honda_url_data hu
                    WHERE hu.dealer_code IN 
                        (SELECT dealer_code FROM dealer_master) 
                    AND ${metricFilters[metric]} ;
                `;
                const [metricCountResult] = await executeQuery(metricSumQuery);
                return metricCountResult[metric] || 0;
            };
    
            // Step 3: Fetch all metric counts for 'total' and combine them with the dealer data
            const videoSendCount = await getMetricCount('video_send_count');
            const videoClickCount = await getMetricCount('video_click_count');
            const totalFeedbackClickCount = await getMetricCount('total_feedback_click_count');
            const feedbackSmsVideoCount = await getMetricCount('feedback_sms_video_count');
    
            // Step 4: Map the dealer details to include the metric count for each dealer
            const combinedResult = dealerDetailsResult.map((dealer) => {
                return {
                    ...dealer,
                    video_send_count: videoSendCount, // Use the total count for each dealer
                    video_click_count: videoClickCount,
                    total_feedback_click_count: totalFeedbackClickCount,
                    feedback_sms_video_count: feedbackSmsVideoCount,
                };
            });
    
 
            res.status(200).json({ success: '200', data: combinedResult , total :total11.length });
    
        } catch (error) {
            console.error('Error fetching zone data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    

else{




    try {
        // Ensure columnName exists in the request body and is valid
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
                      LIMIT ${limit} OFFSET ${offset};
            ;
        `;

        const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [userZone]);

        const total = `
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

    const total11 = await executeQuery(total, [userZone]);



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
        res.status(200).json({ success: '200', data: combinedResult , total :total11.length});
    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

}

    }
};



























