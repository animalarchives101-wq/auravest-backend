const { StatusCodes } = require("http-status-codes");
const customErrorAPI = require("../customError/customError");
const JWT = require("jsonwebtoken");

const authenticate = async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
        throw new customErrorAPI('Authorization header missing', StatusCodes.BAD_REQUEST);
    }
    
    const token = authorization.split(' ')[1];
    if (!token) {
        throw new customErrorAPI('You must be logged in', StatusCodes.BAD_REQUEST);
    }

    try {
        const payload = JWT.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new customErrorAPI("Token has expired", StatusCodes.UNAUTHORIZED);
        } else {
            console.log(error);
            throw new customErrorAPI("Invalid token", StatusCodes.UNAUTHORIZED);
        }
    }
};

module.exports = authenticate;
