
const mongoose = require("mongoose");
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URL,{
useNewUrlParser:true,
useUnifiedTopology:true
// useCreateIndex:true
}).then(()=>{
    console.log("connected")
}).catch((e)=>{
    console.log(e)
})
