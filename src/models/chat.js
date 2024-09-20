const mongoose=require('mongoose')
require('../connectDB/connect')


const chatSchegma= new mongoose.Schema({
    userId:{
        type:String,
        required:true
    },
    Query:{
        type:String,
        required:true
    
    },
    Response:{
        type:String,
        required:true
    }
    
    });

const CHAT = new mongoose.model("Chats",chatSchegma);
module.exports= CHAT;  
