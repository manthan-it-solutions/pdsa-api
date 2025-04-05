const adminMiddleware = require('../middlewere/adminMiddleware')
const authMiddleware = require('../middlewere/authMiddleware')
const adminController = require('../controllers/adminControllers')
const express = require('express')
const path = require('path'); // Make sure this is included
const fs = require('fs');

const router = express.Router()


router.get('/get-users', authMiddleware, adminMiddleware, adminController.getUsers)



router.put('/encrypt-password', adminController.hashPassword)


router.get('/get-dealer/:user_id', authMiddleware, adminMiddleware, adminController.checkUserId)


router.post('/add-user', authMiddleware, adminMiddleware, adminController.insert_user)


router.put('/update-dealer/:dealerCode', authMiddleware, adminMiddleware, adminController.update_user_details)


router.put('/update-zone', authMiddleware, adminMiddleware, adminController.update_user_zone)



router.post('/get_zone_data', authMiddleware, adminMiddleware, adminController.getZonedata)


router.post('/get_designation_data', authMiddleware, adminMiddleware, adminController.getDesignationData)



router.post('/pdsa_balance_header' , authMiddleware , adminMiddleware , adminController.PdsaUserBalance )

router.post('/update_profile_data',authMiddleware,adminMiddleware, adminController.updateProfile)

router.get('/getTrsansactionDetails_data', authMiddleware,adminMiddleware, adminController.getTrsansactionDetails_data);


router.get('/getURL_data',authMiddleware,adminMiddleware, adminController.ClickDataGet)










router.post('/getURL_data_zone',authMiddleware,adminMiddleware, adminController.getURL_data_zone)





router.get('/Dahboard_data_admin' , authMiddleware ,adminMiddleware, adminController.Dahboard_data_admin)


router.post('/getDealerDetailsZone' , authMiddleware ,adminMiddleware, adminController.getDealerDetailsZone)



router.post('/getDealerDetailsRegion' , authMiddleware ,adminMiddleware, adminController.getDealerDetailsRegion)


router.post('/insertdate_csvfile' , authMiddleware ,adminMiddleware, adminController.InsertDataCsvfile)

router.post('/Searh_button_api' , authMiddleware ,adminMiddleware, adminController.Searh_button_api)



router.post('/Searh_button_api_region' , authMiddleware ,adminMiddleware, adminController.Searh_button_api_region)


router.post('/pdsa_balance_header' , authMiddleware , adminMiddleware , adminController.PdsaUserBalance )



router.get('/pdsa_transaction_details' , authMiddleware , adminMiddleware , adminController.GetDataTransaction )










module.exports = router