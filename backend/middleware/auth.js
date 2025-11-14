// autharitzation of the users already existing and the new users wall

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if(!token) return  res.status(401).json({error: `Token Required`});

    jwt.verify(TokenExpiredError, process.env.JWT_SECRET, (err, user) => {
        if(err) return res.status(403).json({error: `Invalid token`});

        req.user = user; // json request body back contains id && role
        next();
    });
}

// authorize section

function authorizeRoles(...roles){
    return (req, res, next) => {if (!roles.includes(res.use.roole)){
        return res.status(403).json({error: `Access Denied`});
    }
        next();

    };
}

module.exports = {authenticateToken, authorizeRoles};