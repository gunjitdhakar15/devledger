const pool =  require('../config/db');
const becrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const saltRounds = 10; // making hashing complex using bcrypt

//registers a new user and hashes password
// POST /Register 
async function registerUser(req, res) {
    // object of the 
    const {username, email, password, role} = req.body;
    
    if(!username || !email || !password){
        return res.status(400).json({error: 'Missing Details'});
    }

    try{
        // Precheck if User Already exists
        const exists = await pool.query(`SELECT*FROM users WHERE email = $1`, [email]);
        if(exists.rows.length > 0){
            return res.status(400).json({error: `Email already registered`});
        }

        // password Hashing
        const hashPassword = await becrypt.hash(password, saltRounds);
        
        // New User
        await pool.query(
            `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)`, 
            [username, email, hashPassword, role || `user` ] );

            res.status(201).json({message: `User registered successfully`});
        }
        catch(err){
            console.error(err);
            res.status(500).json({error: `Database error`});
        }
}

// POST /login
async function loginUser(req, res) {
    const {email, password} = req.body;
    
    if(!email || !password){
        return res.status(400).json({error: `Missing Fields`});
    }

    try{
        const userResult = await pool.query(`SELECT*FROM user WHERE email = $1`, [email]);
        if(userResult.rows.length === 0){
            return res.status(400).json({ error: `Invalid credentials`});
        }
        const user = userResult.rows[0];

        // password comparing
        const passwordcompare = await becrypt.compare(password, user.password_hash);
        if(!passwordcompare){
            return res.status(400).json({error: `Invalid credentials`});
        }

        // Creating JWT TOKEN ( expires in 1 hour)
        const token = jwt.sign({ id: user.id, role: user.role}, process.env.JWT_SECRET,
            {expiresIn : '1h'}
        );

        res.json({token});
    }
    
    catch(err){
        console.error(err);
        res.status(500).json({ error: `Server error`});
    }
}

module.exports = (registerUser, loginUser);