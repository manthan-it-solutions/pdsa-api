const { executeQuery } = require('../dbconfig/dbConfig')
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');


const authService = require('../services/authServices')

const bcrypt = require ('bcrypt')
const uploadHelper = require ('../utilities/uploadHelper');
const  generateUniqueId =require('../utilities/uniqueNumber')

const {getCurrentDateTime,addDaysToDate} = require('../utilities/DateTimefunction')







exports.getUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const currentUserId = req.user.user_id;

        const countQuery = `SELECT COUNT(*) AS total 
                            FROM user_master
                            WHERE user_id != ${currentUserId}`;

        const query = `SELECT *
                       FROM user_master
                       WHERE user_id != ${currentUserId}
                       ORDER BY id DESC
                       LIMIT ${limit} OFFSET ${offset}`;

        const [data, count] = await Promise.all([
            
            executeQuery(query),
            executeQuery(countQuery)
        ]);
        const total = count.length ? count[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: data,
            total: total,
            page: page,
            limit: limit,
            totalPages: totalPages
        });

    } catch (error) {
        return next(error);
    }
};



exports.hashPassword = async(req, res, next)=>{
    try {
        const usersQuery = 'SELECT id, user_id, user_password FROM user_master WHERE LENGTH(user_password) < 60'
        const users = await executeQuery(usersQuery)
        for (const user of users){
          
            const hashPassword = await authService.getHashPassword(user.user_password)
            const updateQuery = `UPDATE user_credentials SET user_password = ? WHERE id = ?`;
             await executeQuery(updateQuery, [hashPassword, user.id]);
        }
        res.json({
            success: true,
            message: "All plain text passwords are changed to hash."
        })
    } catch (error) {
        console.log('error: ', error);
        
    }
}


exports.checkUserId = async (req,res) =>{
    try {

        const  user_id=  req.params.user_id
 

        const query = `SELECT user_id FROM user_master WHERE user_id = ?
`

        const result = await executeQuery (query, user_id)
if(result.length >0){
    res.status(404).send({
        message:"found user" ,
        data:result
    })
}

else{
    res.status(200).send({message:"userid available"})

        

        
    }} catch (error) {
        console.log('error: ', error);
        
    }
}



exports.insert_user = async (req, res) => {
    try {
        // Destructure required fields from the request body
        const { designation, user_id, name, email_id, mobile, password, emp_code } = req.body;
        console.log('req.body: ', req.body);

        // Get the current date and time
        const { date, time } = getCurrentDateTime();

        // Validate required fields
        if (!designation || !user_id || !name || !email_id || !mobile || !password || !emp_code) {
            return res.status(400).send({ message: 'All fields are required' });
        }

        // Hash the password
        const saltRounds = 12; // Optimal for performance and security
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Prepare parameters for the query
        const params = [user_id, hashedPassword, name, mobile, email_id, designation, emp_code, date, time];

        // Insert query
        const query_insert_user = `
            INSERT INTO user_master 
            (user_id, password, name, mobile, email_id, department, emp_code, cdate, ctime)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Execute the query
        const result = await executeQuery(query_insert_user, params);

        // Send success response
        res.status(200).send({ message: 'User inserted successfully', result });
    } catch (error) {
        // Log and send error response
        console.error('Error inserting user:', error);
        res.status(500).send({ message: 'Internal server error', error: error.message });
    }
};





exports.update_user_details = async (req, res) => {
    try {
        // Extract `user_id` (dealerCode) from request parameters
     

        // Extract fields to update from the request body
        const { name, email_id, mobile, designation, emp_code, user_id,password } = req.body;
        console.log('req.body: ', req.body);

         // Hash the password
         const saltRounds = 12; // Optimal for performance and security
         const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Validate input
        if (!user_id) {
            return res.status(400).send({ message: 'User ID is required' });
        }
        if (!name || !email_id || !mobile || !designation || !emp_code) {
            return res.status(400).send({ message: 'All fields are required' });
        }

        // Static SQL query to update user details
        const query_update_user = `
            UPDATE user_master
            SET 
                name = ?,
                email_id = ?,
                mobile = ?,
                department = ?,
                emp_code = ?,
                password=?
            WHERE user_id = ?
        `;

        // Parameters for the query
        const params = [name, email_id, mobile, designation, emp_code,hashedPassword, user_id];

        // Execute the query
        const result = await executeQuery(query_update_user, params);

        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Send success response
        res.status(200).send({ message: 'User details updated successfully' });
    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).send({ message: 'Internal server error', error: error.message });
    }
};





exports.update_user_zone = async (req, res) => {
    try {

        const {date,time} =getCurrentDateTime()
        // Extract fields to update from the request body
        const { name, user_id, zone, region } = req.body;
        console.log('user_id: ', user_id);
        console.log('req.body: ', zone, region);
        
        // Validate input
        if (!user_id) {
            return res.status(400).send({ message: 'User ID is required' });
        }
        if (!name) {
            return res.status(400).send({ message: 'All fields are required' });
        }

        // Convert zone and region arrays into comma-separated strings
        const zoneString = Array.isArray(zone) ? zone.join(', ') : '';
        const regionString = Array.isArray(region) ? region.join(', ') : '';

        // First, check if the user exists in the database
        const checkUserQuery = 'SELECT * FROM crediantial_tbl WHERE user_id = ?';
        const checkUserParams = [user_id];
        
        const userExists = await executeQuery(checkUserQuery, checkUserParams);
        
        if (userExists.length > 0) {
            console.log(user_id,'user_id');
            // If user exists, update the user details
            const query_update_user = `
                UPDATE crediantial_tbl
                SET 
                   region_name = ?,
                   location = ?,
                   mdate=?,
                   mtime=?
                WHERE user_id = ?
            `;
            const updateParams = [regionString, zoneString,date,time, user_id];
            console.log('updateParams: ',query_update_user, updateParams);
            const result = await executeQuery(query_update_user, updateParams);
            
            if (result.affectedRows === 0) {
                return res.status(404).send({ message: 'User not found' });
            }
            
            return res.status(200).send({ message: 'User details updated successfully' });
        } else {
            // If user doesn't exist, insert a new user
            const query_insert_user = `
                INSERT INTO crediantial_tbl (user_id, region_name, location,cdate,ctime)
                VALUES (?, ?, ?,?,?)
            `;
            const insertParams = [user_id, regionString, zoneString,date,time];
            const result = await executeQuery(query_insert_user, insertParams);

            if (result.affectedRows === 0) {
                return res.status(500).send({ message: 'Error inserting user details' });
            }

            return res.status(201).send({ message: 'New user created successfully' });
        }
    } catch (error) {
        console.error('Error updating or inserting user details:', error);
        res.status(500).send({ message: 'Internal server error', error: error.message });
    }
};



exports.getZonedata=async (req,res)=>{
    try {
        const user_id = req.body.user_id
       

        const select_query = `select location , region_name  from crediantial_tbl where user_id =?`

        const result = await executeQuery(select_query,[user_id])
       
        

        res.status(200).json({data:result})

        
    } catch (error) {
        console.log('error: ', error);
        
    }
}



exports.updateProfile = async (req, res) => {
    const { name, email, phone } = req.body;
    const userId = req.user.user_id; 
  
    console.log(userId,'dfg')
    const query = `
        UPDATE user_master
        SET name = ?, email_id = ?, mobile = ?
        WHERE user_id = ?
    `;
    console.log(query,"got it")
    const values = [name, email, phone, userId];
  
    try {
        const result = await executeQuery(query, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
  
        // Fetch updated user data
        const updatedUser = await executeQuery('SELECT * FROM user_master WHERE user_id = ?', [userId]);
  
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser[0] // Return the updated user data
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  };




  exports.getTrsansactionDetails_data = async (req, res, next) => {
    console.log('hittttt');
    try {
        const userId = req.user.user_id;
        console.log('userId: ', userId);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        

        // Query to count total number of records
        let queryTotalCount = `
            SELECT COUNT(*) AS totalCount 
            FROM bal_transaction 
            
        `;
        const resultCount = await executeQuery(queryTotalCount);
        const totalCount = resultCount[0].totalCount;
        const totalPages = Math.ceil(totalCount / limit);

        // Query to get paginated results
        let queryCampaignData = `
            SELECT * 
            FROM bal_transaction 
           
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `;
        const campaignData = await executeQuery(queryCampaignData, [ limit, offset]);

        // Send response
        res.json({
            success: true,
            data: campaignData,
            page,
            limit,
            totalCount:totalCount
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "An error occurred." });
    }
};


exports.ClickDataGet = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 if not provided
        const offset = (page - 1) * limit; // Calculate the offset for pagination

        // Query to get the total count and paginated data
        const query = `
            SELECT 
                -- Region name
                dm.region AS region,

                -- Count of dealers in the current region
                COUNT(dm.dealer_code) AS dealer_count,

                -- Count of video links for the current region
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.cdate IS NOT NULL
                 AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())) AS video_send_count,

                -- Count of video clicks for the current region (with a non-null v_c_date)
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                
                 AND hu.v_click_date IS NOT NULL
                 AND MONTH(hu.v_click_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.v_click_date) = YEAR(CURRENT_DATE())) AS video_click_count,

                -- Count of feedback SMS sent for the current region (based on click_date)
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.cdate IS NOT NULL
                 AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())) AS total_feedback_sms_sent,

                -- Count of feedback click records for the current region
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.f_click_date IS NOT NULL
                 AND MONTH(hu.f_click_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.f_click_date) = YEAR(CURRENT_DATE())) AS total_feedback_click_count,

                -- Count of feedback SMS related to video click records for the current region
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL
                 AND MONTH(hu.feedback_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.feedback_date) = YEAR(CURRENT_DATE())) AS feedback_sms_video_count

            FROM 
                dealer_master dm

            -- Group by region to get counts for each region
            GROUP BY 
                dm.region

            -- Order the results by the specific region order: Central, East, North, PMB, South, West
            ORDER BY 
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West');
        `;

        // Execute the query with pagination using numbers, not strings
        const result = await executeQuery(query, [parseInt(limit), parseInt(offset)]);
       

        // Send the response
        res.status(200).send({
            success: '200',
            data: result,
            page,
            limit,
        });
    } catch (error) {
        console.error('Error fetching data: ', error);

        // Send an error response
        res.status(500).send({
            success: '500',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};




exports.getURL_data_zone = async (req, res) => {
    console.log('hitttt');
    try {
        const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 if not provided
        const offset = (page - 1) * limit; // Calculate the offset for pagination

        // Query to get the total count and paginated data
        const query = `
            SELECT 
                -- Zone name
                dm.zone AS zone,

                -- Count of video links for the current zone
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.cdate IS NOT NULL
                 AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())) AS video_send_count,

                -- Count of video clicks for the current zone (with a non-null v_c_date)
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
               
                 AND hu.v_click_date IS NOT NULL
                 AND MONTH(hu.v_click_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.v_click_date) = YEAR(CURRENT_DATE())) AS video_click_count,

                -- Count of feedback SMS sent for the current zone (based on click_date)
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.cdate IS NOT NULL
                 AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())) AS total_feedback_sms_sent,

                -- Count of feedback click records for the current zone
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.f_click_date IS NOT NULL
                 AND MONTH(hu.f_click_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.f_click_date) = YEAR(CURRENT_DATE())) AS total_feedback_click_count,

                -- Count of feedback SMS related to video click records for the current zone
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL
                 AND MONTH(hu.feedback_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.feedback_date) = YEAR(CURRENT_DATE())) AS feedback_sms_video_count

            FROM 
                dealer_master dm

            -- Group by zone to get counts for each zone
            GROUP BY 
                dm.zone

            -- Order the results by the specific zone order
            ORDER BY 
                FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab','HP','JK','CH','Rajasthan','Jharkhand','Chhattisgarh','UP Central',
                     'Delhi');
        `;

        // Execute the query
        const result = await executeQuery(query, [parseInt(limit), parseInt(offset)]);

        // Send the response
        res.status(200).send({
            success: '200',
            data: result,
            page,
            limit,
        });
    } catch (error) {
        console.error('Error fetching data: ', error);

        // Send an error response
        res.status(500).send({
            success: '500',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};




  

  exports.Dahboard_data_admin= async (req,res)=>{
try {

    const get_data_query= `
SELECT 
    -- Total today's video send count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE DATE(hu.v_c_date) = CURDATE()) AS today_video_send_count,

    -- Total this week's video send count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE WEEK(hu.v_c_date, 1) = WEEK(CURDATE(), 1) 
     AND YEAR(hu.v_c_date) = YEAR(CURDATE())) AS week_video_send_count,

    -- Total last 15 days' video send count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE hu.v_c_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)) AS last_15_days_video_send_count,

    -- Total monthly video send count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE MONTH(hu.v_c_date) = MONTH(CURDATE()) 
     AND YEAR(hu.v_c_date) = YEAR(CURDATE())) AS month_video_send_count,

    -- Total today's feedback SMS sent count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE DATE(hu.click_date) = CURDATE()) AS today_feedback_sms_sent,

    -- Total this week's feedback SMS sent count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE WEEK(hu.click_date, 1) = WEEK(CURDATE(), 1) 
     AND YEAR(hu.click_date) = YEAR(CURDATE())) AS week_feedback_sms_sent,

    -- Total last 15 days' feedback SMS sent count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE hu.click_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)) AS last_15_days_feedback_sms_sent,

    -- Total monthly feedback SMS sent count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE MONTH(hu.click_date) = MONTH(CURDATE()) 
     AND YEAR(hu.click_date) = YEAR(CURDATE())) AS month_feedback_sms_sent,

    -- Today's date for reference
    DATE_FORMAT(CURDATE(), '%Y/%m/%d') AS today_date,

    -- Current week's range for reference (start of week and end of week)
    DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL -WEEKDAY(CURDATE()) DAY), '%Y/%m/%d') AS week_start_date,
    DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY), '%Y/%m/%d') AS week_end_date,

    -- Current month's range for reference (start of month and end of month)
    DATE_FORMAT(CURDATE(), '%Y/%m/01') AS month_start_date,
    DATE_FORMAT(LAST_DAY(CURDATE()), '%Y/%m/%d') AS month_end_date;

    `


    const result = await executeQuery(get_data_query)
    console.log('result: ', result);

    res.status(200).send({success:"200", data:result})

    
} catch (error) {
    console.log('error: ', error);
    res.status(500).send({message:error})
    
}

  }




  exports.getDealerDetailsZone = async (req, res) => {
    try {
        // Extract parameters from the request body
        const { zone, columnName, page = 1, limit = 10 } = req.body;
        const offset = (page - 1) * limit;

        // Define the filter conditions for each column
        const metricFilters = {
            video_send_count: `hu.v_c_date IS NOT NULL`,
            video_click_count: ` hu.v_click_date IS NOT NULL AND hu.v_click_date != ''`,
            total_feedback_click_count: `hu.f_click_date IS NOT NULL AND hu.f_click_date != ''`,
            feedback_sms_video_count: `hu.click_date IS NOT NULL AND hu.feedback_date != ''`,
        };

        // Validate the columnName
        if (!metricFilters[columnName]) {
            return res.status(400).json({ success: false, message: 'Invalid columnName provided' });
        }

        if (zone === 'total') {
            // Construct the SQL query for total aggregation across all zones
            let query = `
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
                    AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                    AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())
            `;
            
            // Execute the query to fetch dealer details without zone filtering
            const dealerDetailsResult11111 = await executeQuery(query, []);
            
            // Add pagination and order by region
            query += `
                ORDER BY 
                    FIELD(dm.region, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
                LIMIT ? OFFSET ?;
            `;
            
            const queryParams = [parseInt(limit), parseInt(offset)];
            const dealerDetailsResult = await executeQuery(query, queryParams);

            // Get the total count of dealers (without pagination)
            let totalCountQuery = `
                SELECT COUNT(DISTINCT dm.dealer_code) AS totalItems
                FROM dealer_master dm
                LEFT JOIN honda_url_data hu ON hu.dealer_code = dm.dealer_code
                WHERE 
                    ${metricFilters[columnName]}
                    AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                    AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())
            `;
            
            const [totalCountResult] = await executeQuery(totalCountQuery, []);
            const totalItems = totalCountResult[0]?.totalItems || 0;

            // Combine the metric count with the dealer details
            const combinedResult = dealerDetailsResult.map(dealer => ({
                ...dealer,
                [columnName]: dealer[columnName] || 0, // Set metric count for each dealer
            }));

            // Send the response with total items for pagination
            res.status(200).json({
                success: true,
                message: 'Data fetched successfully',
                data: combinedResult,
                count_total: dealerDetailsResult11111.length,  // Total number of records
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalItems / limit),  // Calculate total pages
            });
        } else {
            // Construct the SQL query for a specific zone
            let query = `
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
                    AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                    AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())
            `;
            
            // Add zone condition if provided
            query += ` AND dm.zone = ?`;

            const dealerDetailsResult11111 = await executeQuery(query, [zone]);
            
            // Add pagination and order by region
            query += `
                ORDER BY 
                    FIELD(dm.region, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
                LIMIT ? OFFSET ?;
            `;

            const queryParams = [zone, parseInt(limit), parseInt(offset)];
            const dealerDetailsResult = await executeQuery(query, queryParams);

            // Construct the query to get the total count of dealers (without pagination)
            let totalCountQuery = `
                SELECT COUNT(DISTINCT dm.dealer_code) AS totalItems
                FROM dealer_master dm
                LEFT JOIN honda_url_data hu ON hu.dealer_code = dm.dealer_code
                WHERE 
                    ${metricFilters[columnName]}
                    AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                    AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())
            `;

            // Add zone condition for total count query
            totalCountQuery += ` AND dm.zone = ?`;

            // Execute the query to get the total count of records (total number of dealers)
            const [totalCountResult] = await executeQuery(totalCountQuery, [zone]);
            const totalItems = totalCountResult[0]?.totalItems || 0;

            // Combine the metric count with the dealer details
            const combinedResult = dealerDetailsResult.map(dealer => ({
                ...dealer,
                [columnName]: dealer[columnName] || 0,
            }));

            // Send the response with total items for pagination
            res.status(200).json({
                success: true,
                message: 'Data fetched successfully',
                data: combinedResult,
                count_total: dealerDetailsResult11111.length,  // Total number of records
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalItems / limit),  // Calculate total pages
            });
        }
    } catch (error) {
        console.error('Error fetching dealer details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};


  







  // exports.getDealerDetailsRegion = async (req, res) => {
  //   try {
  //     // Get region and pagination params from the request body
  //     const region = req.body.region; // Region parameter to filter
  //     const columnName = req.body.columnName; // Region parameter to filter
  //     const { page = 1, limit = 10 } = req.body; // Default pagination values
  //     const offset = (page - 1) * limit;
  
  //     // Construct the SQL query with conditional region filter
  //     let query = `
  //       SELECT 
  //         dm.region AS region,
          
  //         -- Count of video links for the current region
  //         (SELECT COUNT(*) 
  //          FROM honda_url_data hu 
  //          WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
  //          AND hu.cdate IS NOT NULL
  //          AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
  //          AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())) AS video_send_count,
          
  //         -- Dealer details for this region
  //         hu.dealer_code,
  //         hu.cdate,
  //         hu.ctime,
  //         hu.v_c_date,
  //         hu.v_click_date,
  //         hu.click_date,
  //         hu.feedback_date,
  //         dm.main_dealer,
  //         dm.dealer_name,
  //         dm.dealer_type,
  //         dm.dealer_code AS Dealer_code,
  //         dm.region AS Dealer_Region,
  //         dm.state AS Dealer_State,
  //         dm.city AS Dealer_City,
  //         hu.model_name,
  //         hu.feedback_answer1,
  //         hu.feedback_answer2,
  //         hu.feedback_answer3,
  //         hu.feedback_answer4,
  //         hu.feedback_answer5,
  //         hu.feedback_date,
  //         hu.feedback_time
  //       FROM 
  //         dealer_master dm
  //       LEFT JOIN honda_url_data hu ON hu.dealer_code = dm.dealer_code
  //       WHERE 
  //         hu.cdate IS NOT NULL
  //         AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
  //         AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())`;
  
  //     // Add region condition if a region is provided
  //     const params = [];
  //     if (region) {
  //       query += ` AND dm.region = ?`;
  //       params.push(region);
  //     }
  
  //     // Add pagination and region order
  //     query += `
  //       ORDER BY 
  //         FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
  //       LIMIT ? OFFSET ?;
  //     `;
  //     params.push(parseInt(limit), parseInt(offset));
  
  //     // Execute the query
  //     const result = await executeQuery(query, params);
  
  //     // Send the response with the data
  //     res.status(200).json({
  //       success: true,
  //       message: 'Data fetched successfully',
  //       data: result,
  //       page: parseInt(page),
  //       limit: parseInt(limit),
  //     });
  //   } catch (error) {
  //     console.error('Error fetching dealer details:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Internal Server Error',
  //       error: error.message,
  //     });
  //   }
  // };
  

  exports.getDealerDetailsRegion = async (req, res) => {
    try {
        const { columnName, region } = req.body;

        console.log('Region:', region);
        console.log('Column Name:', columnName);

        // Define filters for specific metrics
        const metricFilters = {
            video_send_count: `hu.v_c_date IS NOT NULL`,
            video_click_count: `hu.v_click_date IS NOT NULL AND hu.v_click_date != ''`,
            total_feedback_click_count: `hu.f_click_date IS NOT NULL AND hu.f_click_date != ''`,
            feedback_sms_video_count: `hu.click_date IS NOT NULL AND hu.feedback_date != ''`,
        };

        // Validate columnName
        if (!metricFilters[columnName]) {
            return res.status(400).json({ message: 'Invalid columnName provided' });
        }

        // Validate region
        if (!region) {
            return res.status(400).json({ message: 'Region is required' });
        }

        if (region === "total") {
            // Query to fetch region-wise counts
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
        
            // Execute query for total region
            const totalRegionResult = await executeQuery(totalRegionQuery);
        
            // Fetch dealer details for all regions
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
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West');
            `;
        
            const dealerDetailsResult = await executeQuery(dealerDetailsQuery);
        
            // Convert RowDataPacket to plain JavaScript objects
            const dealersInRegion = dealerDetailsResult.map(dealer => {
                return JSON.parse(JSON.stringify(dealer)); // Convert to plain JavaScript object
            });
        
            // Combine dealer details with region-wise metrics
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
            return res.status(200).json({ success: '200', data: mergedData });
        }
        
        
         else {
            // For a specific region
            console.log('Fetching data for region:', region);

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
                    AND dm.region = ?  -- Filter by region
                ORDER BY 
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West');
            `;

            const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [region]);

            const metricCountQuery = `
                SELECT COUNT(*) AS ${columnName}
                FROM honda_url_data hu
                WHERE hu.dealer_code IN 
                    (SELECT dealer_code FROM dealer_master WHERE region = ?) 
                    AND ${metricFilters[columnName]};
            `;

            const [metricCountResult] = await executeQuery(metricCountQuery, [region]);

            // Combine dealer details with the count
            const combinedResult = dealerDetailsResult.map(dealer => ({
                ...dealer,
                [columnName]: metricCountResult ? metricCountResult[columnName] : 0,
            }));

            console.log(combinedResult,'combinedResultcombinedResult');

            return res.status(200).json({ success: '200', data: combinedResult });
        }
    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};










// exports.getDealerDetailsRegion = async (req, res) => {
//   const { date, time } = getCurrentDateTime();
//   const days_add = addDaysToDate(date);
//   const filePath = path.join(__dirname, '../upload/PDSA_2024111706030111.csv'); // Ensure dynamic file path handling.

//   // Ensure the file exists
//   if (!fs.existsSync(filePath)) {
//     return res.status(404).json({
//       success: false,
//       message: 'File not found.',
//     });
//   }

//   const batchSize = 50; // Process 50 rows at a time

//   const processCsvFile = async () => {
//     const dataToInsert = [];
//     const linkDetailsToInsert = [];
//     const rows = []; // Store rows for sequential processing

//     // Read and parse CSV
//     await new Promise((resolve, reject) => {
//       fs.createReadStream(filePath)
//         .pipe(csvParser())
//         .on('data', (row) => {
//           rows.push(row); // Store row for later processing
//         })
//         .on('end', resolve)
//         .on('error', reject);
//     });

//     for (let i = 0; i < rows.length; i++) {
//       try {
//         const row = rows[i];
//         const fullName = `${row['Customer First name']} ${row['Customer Last name']}`.trim();
//         const admin_id = 'manthanadmin';
//         const user_id = 'isly_honda';
//         const final_message = 'final_message';
//         const status = '1';
       
//         const vedio_url = process.env.LINKVEDIOLINK;
//         const url_side = process.env.URL_SERVER;

//         const BACKEDURL= process.env.BACKEDURL

//         // Generate unique short URLs
//         const feedback_short_url = await generateUniqueShortUrl('link_details', BACKEDURL);
//         const vedio_short_url = await generateUniqueShortUrl('link_details', BACKEDURL);
//  const feedback_url = `http://192.168.0.122:3000/feedback?id=${feedback_short_url}`
//         // Prepare data for bulk insertion
//         dataToInsert.push([
//           fullName,
//           row['Customer mobile number'],
//           row['Frame No'],
//           row['Dealer_Code'],
//           row['MODEL_NAME'],
//           admin_id,
//           user_id,
//           feedback_url,
//           feedback_short_url,
//           final_message,
//           status,
//           vedio_url,
//           vedio_short_url,
//           date,
//           time,
//         ]);

//         linkDetailsToInsert.push([
//           generateUniqueId(10), // Unique ID for this record
//           feedback_url,
//           feedback_short_url,
//           days_add,
//           time,
//           admin_id,
//           days_add, // Validity date
//           15, // Validity days
//           '1',
//         ]);

//         // Insert batch when the size is reached or it's the last row
//         if (dataToInsert.length >= batchSize || i === rows.length - 1) {
//           await bulkInsertData(dataToInsert, linkDetailsToInsert);
//           dataToInsert.length = 0; // Clear batch
//           linkDetailsToInsert.length = 0;
//         }
//       } catch (error) {
//         console.error('Error processing row:', error.message);
//         // Continue processing other rows
//       }
//     }
//   };

//   const generateUniqueShortUrl = async (tableName, url_side) => {
//     let short_url;
//     let isUnique = false;

//     while (!isUnique) {
//       const uniqueId = generateUniqueId(10);
//       short_url = `${url_side}/${uniqueId}`;

//       // Check if the short URL is unique
//       const checkQuery = `SELECT COUNT(*) AS count FROM ${tableName} WHERE short_url = ?`;
//       const [result] = await executeQuery(checkQuery, [short_url]);

//       if (result.count === 0) {
//         isUnique = true;
//       }
//     }
//     return short_url;
//   };

//   const bulkInsertData = async (dataToInsert, linkDetailsToInsert) => {
//     try {
//       // Start database transaction
//       await executeQuery('START TRANSACTION');

//       // Bulk insert data into `link_details`
//       if (linkDetailsToInsert.length > 0) {
//         const insertQueryLinkDetails = `
//           INSERT INTO link_details (
//             unique_id,
//             org_url,
//             short_url,
//             create_date,
//             create_time,
//             created_by,
//             validity_date,
//             validity_days,
//             status
//           ) VALUES ?`;
//         await executeQuery(insertQueryLinkDetails, [linkDetailsToInsert]);
//       }

//       // Bulk insert data into `honda_url_data`
//       if (dataToInsert.length > 0) {
//         const insertQueryHondaData = `
//           INSERT INTO honda_url_data (
//             cust_name,
//             mobile,
//             frame_no,
//             dealer_code,
//             model_name,
//             admin_id,
//             user_id,
//             feedback_url,
//             feedback_short_url,
//             final_message,
//             status,
//             vedio_url,
//             vedio_short_url,
//             cdate,
//             ctime
//           ) VALUES ?`;
//         await executeQuery(insertQueryHondaData, [dataToInsert]);
//       }

//       // Commit the transaction
//       await executeQuery('COMMIT');
//     } catch (error) {
//       console.error('Error in bulk insert:', error.message);
//       await executeQuery('ROLLBACK');
//       throw error;
//     }
//   };

//   try {
//     // Process the CSV file asynchronously
//     await processCsvFile();

//     res.status(200).json({
//       success: true,
//       message: 'All data inserted successfully.',
//     });
//   } catch (error) {
//     console.error('Error processing the file:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Internal Server Error.',
//       error: error.message,
//     });
//   }
// };

  
  

  
  









  





  


  

  

