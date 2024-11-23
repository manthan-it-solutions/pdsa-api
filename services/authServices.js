const jwt = require('jsonwebtoken');
const mysecret = 'myultrasecretcode'
var bcrypt = require('bcryptjs');
const ErrorHandler = require('../utilities/errorHandler.js')
const { executeQuery } = require('../dbconfig/dbConfig.js')

const createToken = (payload)=>{
    return jwt.sign(payload, mysecret);
}

const getUser = async(userId, next)=>{
    console.log('userId: ', userId);
    try {
        const query = `SELECT  user_id, name,email_id,mobile,department,  password,status FROM user_master WHERE user_id  = ?`
        const [user] = await executeQuery(query, [userId])
        if(!user){
            return next(new ErrorHandler('User not found.'))
        }

        
        return user
    } catch (error) {
       return next(error)
    }
}

const getHashPassword = (password)=>{
    return bcrypt.hash(password, 10)
    
}

const comparePassword =async (password, hashPassword) => {
    try {
        return bcrypt.compareSync(password,hashPassword,);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};


module.exports = {
    createToken,
    getHashPassword,
    comparePassword,
    getUser
}