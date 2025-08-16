const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes (only logged-in users can access)
const protect = async (re, res, next) => {
    let token;

    try{
        //JWT usually comes in header: "Authorization: Bearer <token>"
        if(
            req.headers.authorization && 
            req.headers.authorization.startsWith("Bearer")
        ){
            token = req.headers.authorization.split(" ")[1];

            //Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            //Attach user (without password) to request object
            req.user  = await User.findById(decoded.id).select("-password");

            if(!req.user){
                return res.status(401).json({message: "User not found"});
            }
            
            next(); // move to controller
        }

        else{
            return res.status(401).json({ message: "Not authorized, token failed"});
        }
    }
        catch(error) {
            console.error("Auth error:", error);
            return res.status(401).json({ message: "Not authorized, token failed"}); 
        }
};

// Admin only Middle ware
const admin = (req, res, next) => {
    if (req.user && req.user.role === "admin"){
        next();
    } else{
        return res.status(403).json({ message: "Admin access only"});
    }
};

module.exports = { protect, admin};