const { executeQuery } = require('../dbconfig/dbConfig')
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const AWS = require('aws-sdk');
const axios = require('axios');



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
                 AND hu.cdate BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()) AS video_send_count,

                -- Count of video clicks for the current region (with a non-null v_c_date)
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.v_click_date IS NOT NULL
                 AND hu.v_click_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()) AS video_click_count,

                -- Count of feedback SMS sent for the current region (based on click_date)
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.cdate IS NOT NULL
                 AND hu.cdate BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()) AS total_feedback_sms_sent,

                -- Count of feedback click records for the current region
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.f_click_date IS NOT NULL
                 AND hu.f_click_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()) AS total_feedback_click_count,

                -- Count of feedback SMS related to video click records for the current region
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL
                 AND hu.feedback_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) AND CURRENT_DATE()) AS feedback_sms_video_count

            FROM 
                dealer_master dm

            -- Group by region to get counts for each region
            GROUP BY 
                dm.region

            -- Order the results by the specific region order: Central, East, North, PMB, South, West
            ORDER BY 
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West');
        `;

        // Execute the query with pagination
        const result = await executeQuery(query, [parseInt(limit), parseInt(offset)]);
        console.log('result: ', result);

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




exports.Searh_button_api_region = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 if not provided
        const offset = (page - 1) * limit; // Calculate the offset for pagination

        const { fromdate, todate } = req.body; // Destructure fromdate and todate from the request body

        // Validate dates
        if (!fromdate || !todate) {
            return res.status(400).send({
                success: '400',
                message: 'Both fromdate and todate are required.',
            });
        }

        // Query to get the total count and paginated data
        const query = `
            SELECT 
                dm.region AS region,
                COUNT(dm.dealer_code) AS dealer_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.cdate IS NOT NULL
                 AND hu.cdate BETWEEN ? AND ?) AS video_send_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.v_click_date IS NOT NULL
                 AND hu.v_click_date BETWEEN ? AND ?) AS video_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.cdate IS NOT NULL
                 AND hu.cdate BETWEEN ? AND ?) AS total_feedback_sms_sent,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.f_click_date IS NOT NULL
                 AND hu.f_click_date BETWEEN ? AND ?) AS total_feedback_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL
                 AND hu.feedback_date BETWEEN ? AND ?) AS feedback_sms_video_count
            FROM 
                dealer_master dm
            GROUP BY 
                dm.region
            ORDER BY 
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West');
        `;

        // Execute the query with dynamic date values and pagination
        const result = await executeQuery(query, [
            fromdate, todate, // For video_send_count
            fromdate, todate, // For video_click_count
            fromdate, todate, // For total_feedback_sms_sent
            fromdate, todate, // For total_feedback_click_count
            fromdate, todate, // For feedback_sms_video_count
        ]);
        
        console.log('result: ', result);

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
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Query to get total count
        const countQuery = `SELECT COUNT(DISTINCT zone) AS total_count FROM dealer_master`;
        const countResult = await executeQuery(countQuery);
        const totalCount = countResult[0]?.total_count || 0;

        // Query to get paginated data
        const query = `
            SELECT 
                dm.zone AS zone,
                (SELECT COUNT(*) FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.cdate IS NOT NULL
                 AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())) AS video_send_count,

                (SELECT COUNT(*) FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.v_click_date IS NOT NULL
                 AND MONTH(hu.v_click_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.v_click_date) = YEAR(CURRENT_DATE())) AS video_click_count,

                (SELECT COUNT(*) FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.cdate IS NOT NULL
                 AND MONTH(hu.cdate) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.cdate) = YEAR(CURRENT_DATE())) AS total_feedback_sms_sent,

                (SELECT COUNT(*) FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.f_click_date IS NOT NULL
                 AND MONTH(hu.f_click_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.f_click_date) = YEAR(CURRENT_DATE())) AS total_feedback_click_count,

                (SELECT COUNT(*) FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL
                 AND MONTH(hu.feedback_date) = MONTH(CURRENT_DATE())
                 AND YEAR(hu.feedback_date) = YEAR(CURRENT_DATE())) AS feedback_sms_video_count

            FROM dealer_master dm
            GROUP BY dm.zone
            ORDER BY FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab','HP','JK','CH','Rajasthan','Jharkhand','Chhattisgarh','UP Central', 'Delhi')
            LIMIT ? OFFSET ?;
        `;

        const result = await executeQuery(query, [parseInt(limit), parseInt(offset)]);

        res.status(200).send({
            success: '200',
            total_count: totalCount,  // ✅ Total count of all zones
            data: result,             // ✅ Paginated data
            page,
            limit,
        });

    } catch (error) {
        console.error('Error fetching data: ', error);
        res.status(500).send({
            success: '500',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};






exports.Searh_button_api = async (req, res) => {
    const { todate, fromdate } = req.body; // Extract `fromdate` and `todate` from the request body

    try {
        const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 if not provided
        const offset = (page - 1) * limit; // Calculate the offset for pagination

        // Check if dates are provided, otherwise return an error
        if (!fromdate || !todate) {
            return res.status(400).send({
                success: '400',
                message: 'Both fromdate and todate are required.',
            });
        }

        // Query to get the total count and paginated data with date filtering
        const query = `
            SELECT 
                dm.zone AS zone,

                -- Count of video links for the current zone
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.cdate IS NOT NULL
                 AND DATE(hu.cdate) BETWEEN ? AND ?) AS video_send_count,

                -- Count of video clicks for the current zone (with a non-null v_c_date)
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.v_click_date IS NOT NULL
                 AND DATE(hu.v_click_date) BETWEEN ? AND ?) AS video_click_count,

                -- Count of feedback SMS sent for the current zone
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.cdate IS NOT NULL
                 AND DATE(hu.cdate) BETWEEN ? AND ?) AS total_feedback_sms_sent,

                -- Count of feedback click records for the current zone
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.f_click_date IS NOT NULL
                 AND DATE(hu.f_click_date) BETWEEN ? AND ?) AS total_feedback_click_count,

                -- Count of feedback SMS related to video click records for the current zone
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL
                 AND DATE(hu.feedback_date) BETWEEN ? AND ?) AS feedback_sms_video_count

            FROM 
                dealer_master dm

            -- Group by zone to get counts for each zone
            GROUP BY 
                dm.zone

            -- Order the results by the specific zone order
            ORDER BY 
                FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab','HP','JK','CH','Rajasthan','Jharkhand','Chhattisgarh','UP Central',
                     'Delhi')
            LIMIT ? OFFSET ?;
        `;

        // Execute the query with dynamic date parameters
        const result = await executeQuery(query, [
            fromdate, todate, // For video_send_count
            fromdate, todate, // For video_click_count
            fromdate, todate, // For total_feedback_sms_sent
            fromdate, todate, // For total_feedback_click_count
            fromdate, todate, // For feedback_sms_video_count
            parseInt(limit), parseInt(offset), // Pagination
        ]);

        // Send the response
        res.status(200).send({
            success: '200',
            data: result,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error('Error fetching data:', error);

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
     WHERE DATE(hu.cdate) = CURDATE()) AS today_video_send_count,

    -- Total this week's video send count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE hu.cdate >= DATE_ADD(CURDATE(), INTERVAL -WEEKDAY(CURDATE()) DAY) 
     AND hu.cdate <= CURDATE()) AS week_video_send_count,

    -- Total last 15 days' video send count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE hu.cdate >= DATE_SUB(CURDATE(), INTERVAL 15 DAY) 
     AND hu.cdate <= CURDATE()) AS last_15_days_video_send_count,

    -- Total monthly video send count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE MONTH(hu.cdate) = MONTH(CURDATE()) 
     AND YEAR(hu.cdate) = YEAR(CURDATE())) AS month_video_send_count,

    -- Total today's feedback SMS sent count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE DATE(hu.click_date) = CURDATE()) AS today_feedback_sms_sent,

    -- Total this week's feedback SMS sent count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE hu.click_date >= DATE_ADD(CURDATE(), INTERVAL -WEEKDAY(CURDATE()) DAY) 
     AND hu.click_date <= CURDATE()) AS week_feedback_sms_sent,

    -- Total last 15 days' feedback SMS sent count
    (SELECT COUNT(*) 
     FROM honda_url_data hu 
     WHERE hu.click_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY) 
     AND hu.click_date <= CURDATE()) AS last_15_days_feedback_sms_sent,

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

    -- Last 15 days' range for reference (start and end dates)
    DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 15 DAY), '%Y/%m/%d') AS last_15_days_start_date,
    DATE_FORMAT(CURDATE(), '%Y/%m/%d') AS last_15_days_end_date,

    -- Current month's range for reference (start of month and end of month)
    DATE_FORMAT(CURDATE(), '%Y/%m/01') AS month_start_date,
    DATE_FORMAT(LAST_DAY(CURDATE()), '%Y/%m/%d') AS month_end_date;
    `


    const result = await executeQuery(get_data_query)
    console.log('result: 111111111111', result);

    res.status(200).send({success:"200", data:result})

    
} catch (error) {
    console.log('error: ', error);
    res.status(500).send({message:error})
    
}

  }




  exports.getDealerDetailsZone = async (req, res) => {
    try {
        // Extract parameters from the request body
        const { zone, columnName,fromDate,toDate } = req.body;
        console.log('toDate: ', toDate);
        console.log('fromDate: ', fromDate);
        const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const offset = (page - 1) * limit;
        
     

        if (fromDate && toDate && fromDate !== "null" && toDate !== "null") {
            try {
                console.log('Processing date conditions...');
        
                // Define filter conditions for each column
                const metricFilters = {
                    video_send_count: `hu.v_c_date IS NOT NULL`,
                    video_click_count: `hu.v_click_date IS NOT NULL AND hu.v_click_date != ''`,
                    total_feedback_click_count: `hu.f_click_date IS NOT NULL AND hu.f_click_date != ''`,
                    feedback_sms_video_count: `hu.click_date IS NOT NULL AND hu.feedback_date != ''`,
                };
        
                // Validate the column name
                if (!metricFilters[columnName]) {
                    return res.status(400).json({ success: false, message: 'Invalid columnName provided' });
                }
        
                // Base query for dealer details
                let baseQuery = `
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
                        dm.network_type,
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
                        AND hu.cdate BETWEEN ? AND ?
                `;
        
                // Add zone condition if provided
                if (zone !== 'total') {
                    baseQuery += ` AND dm.zone = ?`;
                }
                
        
                // Add pagination and ordering
                const paginatedQuery = `
                    ${baseQuery}
                    ORDER BY 
                        FIELD(dm.region, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab', 'HP', 'JK', 'CH', 'Rajasthan', 'Jharkhand', 'Chhattisgarh', 'UP Central', 'Delhi')
                    LIMIT ? OFFSET ?;
                `;
        
                // Query to get the total count of dealers
                const totalCountQuery = `
                    SELECT COUNT(DISTINCT dm.dealer_code) AS totalItems
                    FROM dealer_master dm
                    LEFT JOIN honda_url_data hu ON hu.dealer_code = dm.dealer_code
                    WHERE 
                        ${metricFilters[columnName]} 
                        AND hu.cdate BETWEEN ? AND ?
                        ${zone !== 'total' ? `AND dm.zone = ?` : ''}
                `;
        
                // Prepare query parameters
                const queryParams = zone !== 'total'
                    ? [fromDate, toDate, zone, parseInt(limit), parseInt(offset)]
                    : [fromDate, toDate, parseInt(limit), parseInt(offset)];
                
                const totalCountParams = zone !== 'total'
                    ? [fromDate, toDate, zone]
                    : [fromDate, toDate];
        
                // Execute queries
                const dealerDetailsResult = await executeQuery(paginatedQuery, queryParams);
            
                const [totalCountResult] = await executeQuery(totalCountQuery, totalCountParams);
               
        
                // Calculate total items and pages
                const totalItems = totalCountResult?.totalItems || 0;
                const totalPages = Math.ceil(totalItems / limit);
        
                // Combine metric count with dealer details
                const combinedResult = dealerDetailsResult.map(dealer => ({
                    ...dealer,
                    [columnName]: dealer[columnName] || 0, // Set metric count for each dealer
                }));
        
       
                // Send the response
                res.status(200).json({
                    success: true,
                    message: 'Data fetched successfully',
                    data: combinedResult,
                    count_total: totalItems,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages,
                });
            } catch (error) {
                console.error('Error while fetching data:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
            }
        }
        



else{

console.log('2222222222');

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
                    dm.network_type,
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
                    dm.network_type,
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


  exports.getDealerDetailsRegion = async (req, res) => {
const fromdate = req.body.fromdate

const todate = req.body.todate
console.log('todate: ', todate);
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const offset = (page - 1) * limit;


if (fromdate != '' && todate != '' && fromdate != "null" && todate != "null") {
    console.log('11111111');

    try {
        const { columnName, region } = req.body;

        console.log('Region:', region);
        console.log('Column Name:', columnName);

        // Define filters for specific metrics
        const metricFilters = {
            video_send_count: `hu.v_c_date IS NOT NULL `,
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
                    dm.network_type,
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
                    AND hu.cdate BETWEEN ? AND ?  -- Use parameterized query for fromdate and todate
                ORDER BY 
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West') 
                    LIMIT ${limit} OFFSET ${offset};
                    
            `;

            const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [fromdate, todate]);



            const totaldata = `
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
                dm.network_type,
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
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                  
        `;

        const totaldata111 = await executeQuery(totaldata, [region,]);



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
            return res.status(200).json({ success: '200', data: mergedData  , total:totaldata111.length});
        } else {
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
                    dm.network_type,
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
                    AND dm.region = ?  -- Use parameterized query for region
                    AND hu.cdate BETWEEN ? AND ?  -- Use parameters for fromdate and todate
                ORDER BY 
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West') 
                    LIMIT ${limit} OFFSET ${offset};
            `;

            const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [region, fromdate, todate]);


            



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

            return res.status(200).json({ success: '200', data: combinedResult });
        }
    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

else{
console.log('2222222222');
    try {
        const { columnName, region } = req.body;

        console.log('Region:', region);
        console.log('Column Name:', columnName);

        // Define filters for specific metrics
        const metricFilters = {
            video_send_count: `hu.v_c_date IS NOT NULL `,
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
                    dm.network_type,
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
            `;
        
            const dealerDetailsResult = await executeQuery(dealerDetailsQuery);
        
            const totaldata = `
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
                    dm.network_type,
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
                   
            `;

        const totaldata111 = await executeQuery(totaldata, [region,]);


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
            return res.status(200).json({ success: '200', data: mergedData   ,total:totaldata111.length });
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
                    dm.network_type,
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
                    FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                      LIMIT ${limit} OFFSET ${offset}
            `;

            const dealerDetailsResult = await executeQuery(dealerDetailsQuery, [region,]);
           




            const totaldata = `
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
                dm.network_type,
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
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
                  
        `;


      

        const totaldata111 = await executeQuery(totaldata, [region,]);
       
       

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

           

            return res.status(200).json({ success: '200', data: combinedResult  , total :totaldata111.length});
        }
    } catch (error) {
        console.error('Error fetching region data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


};

// Initialize S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWSACCESSKEYID,
    secretAccessKey: process.env.AWSSECRETACCESSKEY
   
});

const bucketName = 'hondapdsa';

const folderName = 'datafile/'; // The folder inside the bucket where the file is located
const filePrefix = 'PDSA_'; // Prefix for files to filter

// Function to get the latest file with prefix 'PDSA_' inside the 'datafile/' folder
async function getLatestFile() {
    try {
        const objects = await s3.listObjectsV2({
            Bucket: bucketName,
            Prefix: folderName // Only list objects inside the 'datafile/' folder
        }).promise();

        console.log('Fetched objects:', objects); // Log objects to verify

        // Filter files that start with 'PDSA_' and end with '.csv'
        const pdsaFiles = objects.Contents
            .map(obj => obj.Key)
            .filter(name => name.startsWith(folderName + filePrefix) && name.endsWith('.csv')) // Adjusted filter for '.csv'
            .sort((a, b) => b.localeCompare(a)); // Sort files in descending order to get the latest file

        console.log('Filtered PDSA files:', pdsaFiles); // Log filtered files

        // Return the latest file if found
        return pdsaFiles.length > 0 ? pdsaFiles[0] : null;
    } catch (error) {
        console.error('Error fetching S3 files:', error.message);
        throw error;
    }
}

// Function to validate mobile numbers (must start with 5-9 and have exactly 10 digits)
function isValidMobileNumber(number) {
    return /^[5-9]\d{9}$/.test(number); // Ensures it starts with 5,6,7,8,9 and has exactly 10 digits
}

// Function to process CSV file and insert valid data into the database
async function processCsvFile(filePath, fileName) {
    const dataToInsert = [];
    let invalidCount = 0; // Counter for invalid mobile numbers

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                const mobileNumber = row['Customer mobile number'].trim();

                // Validate mobile number before inserting
                if (isValidMobileNumber(mobileNumber)) {
                    dataToInsert.push([
                        row['Customer First name'] + ' ' + row['Customer Last name'],
                        mobileNumber,
                        row['Frame No'],
                        row['Dealer_Code'],
                        row['MODEL_NAME'],
                        'manthanadmin',
                        'isly_honda',
                        fileName,
                        `${process.env.URL_short_IP}/feedback?id=`,
                        process.env.LINKVEDIOLINK,
                        new Date().toISOString().split('T')[0], // Date in yyyy-mm-dd
                        new Date().toISOString().split('T')[1].split('.')[0] // Time in hh:mm:ss
                    ]);
                } else {
                    console.error(`Invalid mobile number found: ${mobileNumber}`); // Log invalid number
                    invalidCount++; // Increment invalid number counter
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // Bulk insert only if there are valid records
    if (dataToInsert.length > 0) {
        await executeQuery(
            `INSERT INTO honda_url_data1 (cust_name, mobile_number, frame_no, dealer_code, model_name, admin_id, user_id, filename, feedback_url, vedio_url, create_date, create_time) VALUES ?`,
            [dataToInsert]
        );
    }

    console.log(`Processing complete. Inserted: ${dataToInsert.length}, Skipped invalid: ${invalidCount}`);
}

// Main function to handle file processing and insertion
exports.InsertDataCsvfile = async (req, res) => {
    try {
        // Get the latest file
        const fileName = await getLatestFile();
        if (!fileName) {
            return res.status(404).json({ success: false, message: 'No files found in S3 bucket.' });
        }

        // Check if the file has already been uploaded in the DB
        const existingFile = await executeQuery(
            `SELECT filename FROM file_upload_master WHERE filename = ?`, 
            [fileName]
        );

        if (existingFile.length > 0) {
            return res.status(400).json({ success: false, message: 'This file has already been uploaded.' });
        }

        const localFilePath = path.join(__dirname, `../upload/${fileName}`);

        // Download the file from S3
        const fileData = await s3.getObject({ Bucket: bucketName, Key: fileName }).promise();
        fs.writeFileSync(localFilePath, fileData.Body);
        console.log(`File downloaded: ${localFilePath}`);

        // Process the CSV file and insert data
        await processCsvFile(localFilePath, fileName);

        // Respond success
        res.status(200).json({ success: true, message: 'All data inserted successfully.' });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};


// exports.InsertDataCsvfile = async (req, res) => {
   
//   const { date, time } = getCurrentDateTime();
//   const days_add = addDaysToDate(date);
//   let file_name='PDSA_20241117060301_new.csv'
//   const filePath = path.join(__dirname, `../upload/${file_name}`); // Ensure dynamic file path handling.


//   // Ensure the file exists
//   if (!fs.existsSync(filePath)) {
//     return res.status(404).json({
//       success: false,
//       message: 'File not found.',
//     });
//   }

//   const batchSize = 1000; // Process 50 rows at a time

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
//     const sanitizeName = (name) => name.replace(/[^\w\s]/gi, '').trim();

//     for (let i = 0; i < rows.length; i++) {
//       try {
//         const row = rows[i];
//         const fullName11 = `${row['Customer First name']} ${row['Customer Last name']}`.trim();
//         const  fullName=   sanitizeName(fullName11)
//         const admin_id = 'manthanadmin';
//         const user_id = 'isly_honda';
//         const final_message = 'final_message';
//         const status = '1';
       
//         const vedio_url = process.env.LINKVEDIOLINK;
//         const url_side = process.env.URL_SERVER;

//         const BACKEDURL= process.env.BACKEDURL

   
//         const feedback_short_url =""
//         const vedio_short_url ="" 
//  const feedback_url = `${process.env.URL_short_IP}/feedback?id=${feedback_short_url}`


//         // Prepare data for bulk insertion
//         dataToInsert.push([
//           fullName,
//           row['Customer mobile number'],
//           row['Frame No'],
//           row['Dealer_Code'],
//           row['MODEL_NAME'],
//           admin_id,
//           user_id,
//           file_name,
//           feedback_url,
//           vedio_url,
//           date,
//           time,
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

 

//   const bulkInsertData = async (dataToInsert) => {
   
//     try {
//       // Bulk insert data into `honda_url_data`
//       if (dataToInsert.length > 0) {
//         const insertQueryHondaData = `
//           INSERT INTO honda_url_data1 (
//             cust_name,
//             mobile_number,
//             frame_no,
//             dealer_code,
//             model_name,
//             admin_id,
//             user_id,
//             filename,
//             feedback_url,
//             vedio_url,
//             create_date,
//             create_time
//           ) VALUES ?`;

      
//         await executeQuery(insertQueryHondaData, [dataToInsert]);
//       }


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



exports.PdsaUserBalance = async (req, res) => {
    try {


        let select_api_keyquery= `select api_key ,api_pass from customer_master `
        let resut_query_key = await executeQuery(select_api_keyquery)
        // console.log('resut_query_key: ', resut_query_key);
        let api_key=resut_query_key[0].api_key
        let api_password=resut_query_key[0].api_pass

       let response = await  Balence_fitch_pdsa(api_key,api_password)

       if(response){
        console.log('response: ', response);

        if(response.success){
            res.status(200).json({balance:response.balance[0].balance});

        }else{

            // res.status(210).json({
            
            // })
        }
       }
       else{
        res.status(210).json({
            success:false,
            message:'No Balance found'
        });
       }
    
    } catch (error) {
        console.error('API Request Failed:', error.message);
        res.status(500).json({ error: "Failed to fetch balance", details: error.message });
    }
};



async function Balence_fitch_pdsa(api_key,api_password){
    try {

        let data = JSON.stringify({
            "api_key": api_key,
            "api_pass": api_password
          });


        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://apipathwp.com/pdsa/whtsapp_balance_check',
            headers: { 
              'Content-Type': 'application/json'
            },
            data : data
          };
  
          const response = await axios.request(config);
       
        
          return response.data;
        
    } catch (error) {
        console.log('error: ', error);
        return false;
      
        
    }
}





exports.GetDataTransaction= async (req,res)=>{
    try {
        let select_api_keyquery= `select api_key ,api_pass from customer_master `
        let resut_query_key = await executeQuery(select_api_keyquery)
        // console.log('resut_query_key: ', resut_query_key);
        let api_key=resut_query_key[0].api_key
        let api_password=resut_query_key[0].api_pass

        


        
    } catch (error) {
        console.log('error: ', error);
        
    }
}



  
  

  
  









  





  


  

  

