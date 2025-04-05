const { executeQuery } = require('../../dbconfig/dbConfig');
const crypto = require('crypto');
const cron = require('node-cron');

// Flag to track if the process is already running
let isProcess = false;

// Function to generate a batch of unique short URLs
async function generateUniqueShortUrls(batchSize, tableName, baseurl) {
    let uniqueUrls = [];
    const existingUrlsQuery = `SELECT feedback_short_url, vedio_short_url FROM ${tableName}`;
    const existingUrlsResult = await executeQuery(existingUrlsQuery);
    
    // Store existing URLs in a Set for quick lookup
    const existingUrls = new Set(existingUrlsResult.flatMap(row => [row.feedback_short_url, row.vedio_short_url]));

    while (uniqueUrls.length < batchSize) {
        const uniqueId = crypto.randomBytes(5).toString('hex');
        const shortUrl = `${baseurl}/${uniqueId}`;
        
        // Only add unique short URLs
        if (!existingUrls.has(shortUrl)) {
            uniqueUrls.push(shortUrl);
            existingUrls.add(shortUrl);  // Add to existing set to prevent duplicates
        }
    }

    return uniqueUrls;
}
// Function to transfer data from source table to destination table
async function transferHondaData() {
    if (isProcess) {
        console.log('Process is already running, skipping this call.');
        return;  // Prevents the function from running if it's already in process
    }

    try {
        // Set isProcess to true to indicate the process is running
        isProcess = true;
        
        const sourceTable = 'honda_url_data1';
        const destinationTable = 'honda_url_data2';
        const batchSize = 2000;
        const baseurl = process.env.BACKEDURL;

        console.log('Starting data transfer process...');

        const selectQuery = `SELECT * FROM ${sourceTable} ORDER BY id LIMIT ${batchSize}`;
        const sourceData = await executeQuery(selectQuery);

        if (sourceData.length === 0) {
            console.log('No data found to transfer.');
            isProcess = false; // Reset isProcess to false when done
            return;
        }

        // Generate unique short URLs in batch
        const feedbackUrls = await generateUniqueShortUrls(batchSize, destinationTable, baseurl);
       
        const videoUrls = await generateUniqueShortUrls(batchSize, destinationTable, baseurl);

        const dataToInsert = [];
        const sourceIds = [];

        for (let i = 0; i < sourceData.length; i++) {
            const row = sourceData[i];
            const feedback_short_url = feedbackUrls[i];
           let new_feedback_id =feedback_short_url.split('/')[3]
            const video_short_url = videoUrls[i];

           let new_vedio_url =video_short_url.split('/')[3]




            dataToInsert.push([
                row.cust_name,
                row.mobile_number || '',
                row.frame_no || '',
                row.dealer_code || '',
                row.model_name || '',
                'manthanadmin',
                'isly_honda',
                (row.feedback_url + new_feedback_id) || '',
                feedback_short_url,
                'final_message',
                '1',
                (process.env.LINKVEDIOLINK + new_vedio_url) || '',
                video_short_url,
                row.filename,
                new_feedback_id,
                new_vedio_url,
                new Date().toISOString().split('T')[0],
                new Date().toLocaleTimeString()
            ]);

            sourceIds.push(row.id);
        }

     

        try {
            const insertQuery = `INSERT INTO ${destinationTable} (
                cust_name, mobile, frame_no, dealer_code, model_name, admin_id, user_id, 
                feedback_url, feedback_short_url, final_message, status_data, 
                vedio_url, vedio_short_url,filename,short_url_feedback,short_url_vedio, cdate, ctime
            ) VALUES ?`;

            await executeQuery(insertQuery, [dataToInsert]);

            const deleteQuery = `DELETE FROM ${sourceTable} WHERE id IN (?)`;
            await executeQuery(deleteQuery, [sourceIds]);

            await executeQuery('COMMIT');
            console.log(`Successfully transferred and deleted ${dataToInsert.length} records.`);
        } catch (error) {
            await executeQuery('ROLLBACK');
            console.error('Transaction failed:', error);
        }

    } catch (error) {
        console.error('Data transfer error:', error);
    } finally {
        // Set isProcess back to false when the process is done
        isProcess = false;
    }
}

// Uncomment this line to schedule the job
cron.schedule('*/5 * * * * *', () => {
    console.log('Running scheduled transfer task...');
    transferHondaData();
});

let isProcessMessage= false;
// Function to transfer data from source table to destination table
async function Send_message_final() {
    if (isProcessMessage) {
        console.log('Process is already running, skipping this call.');
        return;  // Prevents the function from running if it's already in process
    }
    try {
        // Set isProcess to true to indicate the process is running
        isProcessMessage = true;
        
        const sourceTable = 'honda_url_data2';
        const destinationTable = 'honda_url_data';
        const baseurl = process.env.BACKEDURL;


        let select_api_keyquery= `select api_key ,api_pass from customer_master `
let resut_query_key = await executeQuery(select_api_keyquery)
// console.log('resut_query_key: ', resut_query_key);
let api_key=resut_query_key[0].api_key
let api_password=resut_query_key[0].api_pass
// let api_password="dfisdfig"

let template_id= "123231"


        console.log('Starting data transfer process...');

        const selectQuery = `SELECT * FROM ${sourceTable} ORDER BY id LIMIT 600`; // Retrieve data one by one
    
         let sourceData = await executeQuery(selectQuery);
         if(sourceData && sourceData.length > 0){

    
            for(let i=0;i<sourceData.length;i++){
                  const row = sourceData[i]; // Processing one record at a time
                 
    

                  const sourceId = row.id;



                  const deleteQuery = `DELETE FROM ${sourceTable} WHERE id = ?`;
                  await executeQuery(deleteQuery, [sourceId]);
      
                // Send message
          
                let result= await message_send_api(row.mobile,row.short_url_feedback,row.short_url_vedio,api_key,api_password,template_id);

                let errorMessage=''
                let errorCode = ''

                let responseData=''
                let msg_id=''
           if(result){

            if(result.error){
                errorMessage=result.error.message
                errorCode=result.error.status
                console.log('errorCode: ', errorCode);
              
            }
            else{          
              responseData = JSON.stringify(result) // Convert object to JSON string
            //  if(responseData.status(204){
            
            //  })
              msg_id = result?.data?.mid || 'ms101'; // Convert object to JSON string
            }

        }
         
          
        //    let query_update_res= `UPDATE honda_url_data SET response=? WHERE feedback_short_url=?`;
        //    console.log(query_update_res,row.feedback_short_url,'query_update_res')

        //    let updatequeryexecute= await executeQuery(query_update_res ,[responseData,row.feedback_short_url])
        //    console.log('updatequeryexecute: ', updatequeryexecute);
                const dataToInsert = [
                    row.cust_name,
                    row.mobile || '',
                    row.frame_no || '',
                    row.dealer_code || '',
                    row.model_name || '',
                    'manthanadmin',
                    'isly_honda',
                    row.feedback_url || '', // Use feedback URL from source record
                    row.feedback_short_url || '', // Use short URL from source record
                    'final_message',
                    '1',
                    process.env.LINKVEDIOLINK || '',
                    row.vedio_short_url || '', // Use video short URL from source record
                    new Date().toISOString().split('T')[0],
                    new Date().toLocaleTimeString(),
                    row.filename,
                    row.short_url_feedback,
                    row.short_url_vedio,
                    responseData,
                    msg_id

                ];
    
           
                try {
                    const insertQuery = `INSERT INTO ${destinationTable} (
                        cust_name, mobile, frame_no, dealer_code, model_name, admin_id, user_id, 
                        feedback_url, feedback_short_url, final_message, status, 
                        vedio_url, vedio_short_url, cdate, ctime,filename,short_url_feedback,short_url_vedio,response,msg_id
                    ) VALUES ?`;
    
                    await executeQuery(insertQuery, [[dataToInsert]]);
    
                   
    
                    
                    console.log(`Successfully transferred and deleted record with ID: ${sourceId}`);
                } catch (error) {
                    await executeQuery('ROLLBACK');
                    console.error('Transaction failed for ID:', sourceId, error);
                }
            }  
         }    
    
    
    } catch (error) {
        console.error('Data transfer error:', error);
    } finally {
        // Set isProcess back to false when the process is done
        isProcessMessage = false;
    }
}

async function Send_message_final1() {
    if (isProcessMessage) {
        console.log('Process is already running, skipping this call.');
        return;  // Prevents the function from running if it's already in process
    }
    try{
        isProcessMessage=true;
        console.log('1')
    } catch (error) {
        console.error('Data transfer error:', error);
    } finally {
        // Set isProcess back to false when the process is done
        isProcessMessage = false;
    }
}


async function message_send_api(mobile, short_url_feedback, short_url_vedio,api_key,api_password,template_id) {
    try {
        const axios = require('axios');

        let data = JSON.stringify({
            "mobile_number": mobile,
            "feedback_url": short_url_feedback,
            "vedio_url": short_url_vedio,
            "api_key":api_key,
            "api_pass":api_password,
            "template_id":template_id
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://apipathwp.com/pdsa/hit_pdsa_send_message',
            headers: { 
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios.request(config);
        return response.data;

    } catch (error) {
        // console.log('Error:', error.response);
        return { error: error.response }; // Return an error response
    }
}

// Example usage





// send message cron th this line to schedule the job
cron.schedule('*/15 * * * * *',async () => {
    console.log('Running scheduled transfer task...');
  await  Send_message_final();
});
