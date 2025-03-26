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
                new Date().toISOString().split('T')[0],
                new Date().toLocaleTimeString()
            ]);

            sourceIds.push(row.id);
        }

     

        try {
            const insertQuery = `INSERT INTO ${destinationTable} (
                cust_name, mobile, frame_no, dealer_code, model_name, admin_id, user_id, 
                feedback_url, feedback_short_url, final_message, status_data, 
                vedio_url, vedio_short_url, cdate, ctime
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
// cron.schedule('*/5 * * * * *', () => {
//     console.log('Running scheduled transfer task...');
//     transferHondaData();
// });

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

        console.log('Starting data transfer process...');

        const selectQuery = `SELECT * FROM ${sourceTable} ORDER BY id LIMIT 600`; // Retrieve data one by one
    
         let sourceData = await executeQuery(selectQuery);
         if(sourceData && sourceData.length > 0){

    
            for(let i=0;i<sourceData.length;i++){
                  const row = sourceData[i]; // Processing one record at a time
                 
    
                // Send message
                await message_send_api(row.mobile);
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
                    new Date().toLocaleTimeString()
                ];
    
                const sourceId = row.id;
    
                try {
                    const insertQuery = `INSERT INTO ${destinationTable} (
                        cust_name, mobile, frame_no, dealer_code, model_name, admin_id, user_id, 
                        feedback_url, feedback_short_url, final_message, status, 
                        vedio_url, vedio_short_url, cdate, ctime
                    ) VALUES ?`;
    
                    await executeQuery(insertQuery, [[dataToInsert]]);
    
                    const deleteQuery = `DELETE FROM ${sourceTable} WHERE id = ?`;
                    await executeQuery(deleteQuery, [sourceId]);
    
                    
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


async function  message_send_api(mobile){
    try {
        
        console.log('send message cron');
        return "ok"

    } catch (error) {
        console.log('error: ', error);
        
    }
}



// send message cron th this line to schedule the job
// cron.schedule('*/15 * * * * *',async () => {
//     console.log('Running scheduled transfer task...');
//   await  Send_message_final();
// });
