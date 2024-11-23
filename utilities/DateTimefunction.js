function getCurrentDateTime() {
    const now = new Date();

    // Format date as yyyy-mm-dd
    const date = now.toISOString().split('T')[0];

    // Format time as hh:mm:ss
    const time = now.toTimeString().split(' ')[0];

    return { date, time };
}



module.exports=getCurrentDateTime