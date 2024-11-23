
const { executeQuery } = require('../dbconfig/dbConfig')

const authMiddleware = require('../middlewere/authMiddleware')
const authService = require('../services/authServices')

const bcrypt = require ('bcrypt')
const uploadHelper = require ('../utilities/uploadHelper');




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



exports.getURL_data_zone_user= async (req, res) => {
    const userId = req.user.user_id;
    console.log('userId: ', userId);

    try {
      

        // Step 1: Get zone for the user
        const [zoneResult] = await executeQuery(
            `SELECT location FROM crediantial_tbl WHERE user_id = ?`, 
            [userId]
            
        );
     

        if (!zoneResult || zoneResult.length === 0) {
            return res.status(404).json({ message: 'Zone not found for user' });
        }


        const userZone = zoneResult.location;
       

        // Step 2: Fetch data for the zone
        const result= await executeQuery(`
            SELECT 
                dm.zone AS zone,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu 
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.v_c_date IS NOT NULL) AS video_send_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.data_type = 'Video'
                 AND hu.v_click_date IS NOT NULL) AS video_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL) AS total_feedback_sms_sent,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.f_click_date IS NOT NULL) AS total_feedback_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE zone = dm.zone) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL) AS feedback_sms_video_count
            FROM 
                dealer_master dm
            WHERE 
                dm.zone = ?
            GROUP BY 
                dm.zone
            ORDER BY 
                FIELD(dm.zone, 'UP', 'West', 'UK', 'PMB', 'Bihar', 'Punjab','HP','JK','CH','Rajasthan','Jharkhand','Chhattisgarh','UP Central', 'Delhi')
        `, [userZone]);

       
console.log(result);
        // Step 3: Return data
        res.status(200).json({success:'200',  data:result});

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}



exports.getURL_data_user = async (req, res) => {
    const userId = req.user.user_id; // Assuming middleware provides authenticated user info
    console.log('userId: ', userId);

    try {
        // Step 1: Get region for the user
        const [regionResult] = await executeQuery(
            `SELECT region_name FROM crediantial_tbl WHERE user_id = ?`, 
            [userId]
        );

        if ( !regionResult   ||  regionResult.length === 0  ) {
            return res.status(404).json({ message: 'Region not found for user' });
        }

        const userRegion = regionResult.region_name;

        // Step 2: Fetch data for the region
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
                 AND hu.data_type = 'Video'
                 AND hu.v_click_date IS NOT NULL) AS video_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL) AS total_feedback_sms_sent,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.f_click_date IS NOT NULL) AS total_feedback_click_count,
                (SELECT COUNT(*) 
                 FROM honda_url_data hu
                 WHERE hu.dealer_code IN (SELECT dealer_code FROM dealer_master WHERE region = dm.region) 
                 AND hu.click_date IS NOT NULL 
                 AND hu.feedback_date IS NOT NULL) AS feedback_sms_video_count
            FROM 
                dealer_master dm
            WHERE 
                dm.region = ?
            GROUP BY 
                dm.region
            ORDER BY 
                FIELD(dm.region, 'Central', 'East', 'North', 'PMB', 'South', 'West')
        `, [userRegion]);

        // Step 3: Return data
        res.status(200).json({success:'200', data: result });

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























