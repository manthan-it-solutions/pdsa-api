
const authMiddleware = require('../middlewere/authMiddleware')
const userController = require('../controllers/userControllers')
const express = require('express')
const path = require('path'); // Make sure this is included
const fs = require('fs');

const router = express.Router()

router.get('/get_side_bar_region' , authMiddleware , userController.getURL_data_zone)



router.get('/getURL_data_zone_user' , authMiddleware , userController.getURL_data_zone_user)



router.get('/getURL_data_user' , authMiddleware , userController.getURL_data_user)



router.get('/get_dashboard_data_user' , authMiddleware , userController.get_dashboard_data_user)


router.post('/select_user_details_by_link'  , userController.select_user_details_by_user_id)



router.post('/submit_feedback'  , userController.submit_feedback)


router.post('/getUserDetailsRegion' , authMiddleware ,userController.getUserDetailsRegion)



router.post('/getUserDetailsZone' , authMiddleware ,userController.getUserDetailsZone)




router.post('/Searh_button_api_zone_user' , authMiddleware ,userController.Searh_button_api_zone_user)


router.post('/Searh_button_api_region_user' , authMiddleware ,userController.Searh_button_api_region_user)









module.exports = router