const ErrorHandler = require('./../utilities/errorHandler')

const adminMiddleware = async(req, res, next)=>{
    try {
        if(req && req.user){
            const user = req.user
            if(user?.status === '2'){
                return next()
            }
            return next(new ErrorHandler('You are not admin.', 403));
        }else{
            return next(new ErrorHandler('Unauthorized', 401));
        }
    } catch (error) {
        return next(error)
    }
}

module.exports = adminMiddleware