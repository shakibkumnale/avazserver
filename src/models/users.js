const  mongoose  = require("mongoose");
require("../db/connectDB")
const jwt =require("jsonwebtoken");
const bcrypt=require('bcrypt')

const userSchegma= new mongoose.Schema({
Fname:{
    type:String,
    required:true

},
Lname:{
    type:String,
    required:true

},
Password:{ 
    type:String,
    required:true
},

City:{ 
    type:String,
    required:true
},

Email:{ type:String,
    required:true,
    unique: true 
},

Phone:{ type:String,
    required:true,
    unique:true
},
chats: [
    { 
      query: String,
      answer: String
    }
  ],
tokens:[{
    token:{
    type:String
    // required:true
    }
}]
});
userSchegma.methods.generateAuthToken = async function(){
    try {
    
    const token = jwt.sign({_id: this._id.toString()}, process.env.HASH);
    this.tokens = this.tokens.concat({token: token});
    
    await this.save();
    return token; 
    
    }catch (error) {
    // res.send("the error part" + error);
    console.log("the error part" + error);
    }
}



//for hashing password:------------
userSchegma.pre("save",async function(params){
    if(this.isModified('Password')){
    this.Password=await bcrypt.hash(this.Password,10)}
params()

})


//for update pass word remaining
// userSchegma.pre("updateOne",async function (next){
//     this.Password=await bcrypt.hash(this.Password,10)

// next()
// })

const User = new mongoose.model("User",userSchegma);
 module.exports= User;  