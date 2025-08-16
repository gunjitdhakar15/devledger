const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6, // adds basic password strength
    },

    role:{
      type: String,
      enum : ['admin', 'member'],
      default: 'member',
    },
}, 
{ timestamps: true }
);

// Hash Password before saving
userSchema.pre("save", async function(next){
  if(!this.isModified("password")) return next(); // only hash if password is new or changed

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Add method to compare passwords later in login
userSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

module.exports = mongoose.model('User', userSchema);
