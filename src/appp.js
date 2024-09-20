require('dotenv').config();
// const User=require("./src/models/users")
const express = require('express');
const Users= require("./models/users");
const cors=require("cors");
const cookieParser =require("cookie-parser");
const bcrypt=require('bcrypt')
const app = express();
const auth=require('./auth')
const jwt =require("jsonwebtoken");
const multer = require('multer');
const nodemailer = require("nodemailer");
const randomstring = require('randomstring');
const mongoose = require("mongoose");
const port = process.env.PORT || 3211
const otps = {};
app.use(cookieParser());
app.use(express.json());
app.use(cors());
// const OpenAI = require("openai");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/files");

// const cors=require("cors")
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))
const apiKey = process.env.GEMINI_KEY;

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);  


const upload = multer({ dest: 'uploads/' });
async function uploadToGemini(path, mimeType) {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  return file;
}

/**
 * Waits for the given file to be active.
 */
async function waitForFileActive(file) {
  console.log("Waiting for file processing...");
  let fileInfo = await fileManager.getFile(file.name);
  while (fileInfo.state === "PROCESSING") {
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 10000));
    fileInfo = await fileManager.getFile(file.name);
  }
  if (fileInfo.state !== "ACTIVE") {
    throw new Error(`File ${file.name} failed to process`);
  }
  console.log("...file is ready\n");
  return fileInfo;
}

/**
 * Endpoint to handle file upload and proxy to Gemini.
 */
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const file = await uploadToGemini(req.file.path, req.file.mimetype);
    const activeFile = await waitForFileActive(file);
    res.status(200).json({ fileUri: activeFile.uri });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(express.json());

app.post('/ask', async (req, res) => {
  const { fileUri, input } = req.body;

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              mimeType: "video/mp4", // Adjust mimeType accordingly
              fileUri: fileUri,
            },
          },
          {
            text: input,
          },
        ],
      },
    ],
  });

  try {
    const result = await chatSession.sendMessage(input);
    res.send( result.response.text() );
    console.log(result.response.text());
  } catch (error) {
    console.error('Request:', { fileUri, input });
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});
// end the video ask
// new asistant code start
// const apiKey = process.env.OPENAI_API_KEY;
// const openai = new OpenAI(apiKey);

// let assistant_id;

// // Create an Assistant
// async function createAssistant() {
//   const assistantResponse = await openai.beta.assistants.create({
//     name: "AVAZ", // adjust name as per requirement
//     instructions: "your name is avaz ai voice assistant who assist user you developed by shakib and kamruddin for BSC IT final year project.  ",
//     // tools: [{ type: "code_interpreter" }], // adjust tools as per requirement
//     model: "gpt-3.5-turbo-0125", // or any other GPT-3.5 or GPT-4 model
//   });
//   assistant_id = assistantResponse.id;
//   console.log(`Assistant ID: ${assistant_id}`);
// }

// createAssistant();


// Endpoint to handle chat
// app.post("/POST", async (req, res) => {
//   try {
//     if (!req.body.query) {
//       return res.status(400).json({ error: "Message field is required" });
//     }
//     // const userMessage = req.body.query;
//     const {query,Email}=req.body

//     // Create a Thread
//     const threadResponse = await openai.beta.threads.create();
//     const threadId = threadResponse.id;

//     // Add a Message to a Thread
//     await openai.beta.threads.messages.create(threadId, {
//       role: "user",
//       content: query,
//     });

//     // Run the Assistant
//     const runResponse = await openai.beta.threads.runs.create(threadId, {
//       assistant_id: assistant_id,
//     });

//     // Check the Run status
//     let run = await openai.beta.threads.runs.retrieve(threadId, runResponse.id);
//     while (run.status !== "completed") {
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//       run = await openai.beta.threads.runs.retrieve(threadId, runResponse.id);
//     }

//     // Display the Assistant's Response
// const messagesResponse = await openai.beta.threads.messages.list(threadId);
// const assistantResponses = messagesResponse.data.filter(msg => msg.role === 'assistant');
// const response = assistantResponses.map(msg => 
//   msg.content
//     .filter(contentItem => contentItem.type === 'text')
//     .map(textContent => textContent.text.value)
//     .join('\n')
// ).join('\n');
//  const user = await Users.findOne({Email:Email})

// if (!user) {
//        //  return res.status(404).json({ message: 'User not found' });
//        res.send(response+" history not save");
//        console.log("user not found");
//       }else{
//           res.send(response)
//           let answer=response;
//           // Add the new chat object to the chats array
//             user.chats.push({query,answer});
        
//             // Save the updated user document
//             await user.save();

//       }  
          
//   } catch (error) {
//     console.error("Error processing chat:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });


// new asistant code end open ai 

// new asistant code start gemini ai 
app.post("/POST", async (req, res) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "your name is avaz ai voice assistant for gen-Z who assist user you developed by shakib and kamruddin for BSC IT final year project.  ",
  });
  
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };
  
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];
  
  try {
    if (!req.body.query) {
      return res.status(400).json({ error: "Message field is required" });
    }
    // const userMessage = req.body.query;
    const {query,Email}=req.body
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
      history: [
      ],
    });
  
    const result = await chatSession.sendMessage(query);
    console.log(result.response.text());
   
const response = result.response.text();
 const user = await Users.findOne({Email:Email})

if (!user) {
       //  return res.status(404).json({ message: 'User not found' });
       res.send(response+" history not save");
       console.log("user not found");
      }else{
          res.send(response)
          let answer=response;
          // Add the new chat object to the chats array
            user.chats.push({query,answer});
        
            // Save the updated user document
            await user.save();

      }  
          
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// new asistant code end gemini ai 




// ओल्ड बाककेण्ड कोड स्टार्ट 

// const OpenAI = require("openai");


// const openai = new OpenAI({
//   // apiKey:process.env.MYKEY
//   apiKey:""
// });

// const openFun=async(q)=>{
// const chatCompletion = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [{"role": "user", "content": q,}],
//     // max_tokens:100
//   });
//   console.log(chatCompletion.choices[0].message.content);
//   return chatCompletion.choices[0].message.content
// }


// my new code
// app.post("/POST",async(req,res)=>{
//   try {

//     const {query,Email}=req.body
//    //  console.log(query)
//  console.log(req.body);
//  let answer=await openFun(query);
//  const user = await Users.findOne({Email:Email})
//     if (!user) {
//      //  return res.status(404).json({ message: 'User not found' });
//      res.send(answer+" history not save");
//      console.log("user not found");
//     }else{
//     res.send(answer);
//     console.log(answer);
  
//     // Add the new chat object to the chats array
//     user.chats.push({query,answer});

//     // Save the updated user document
//     await user.save();


// console.log('done sav');
//    //  res.status(200).json({ message: 'Chat history updated successfully' });
//     }

//   } catch (error) {
//  // res.status(500).json({ message: 'Failed to update chat history' });
//  console.log(error);

//   }
   

// })
// my new code


app.get("/ai",async(req,res)=>{
  res.send("server is running")
    // res.send( await openFun())
})





// ओल्ड बाककेण्ड कोड एंड  

// import dotenv from 'dotenv'
// dotenv.config()
// require("./db/connectDB");





const transporter = nodemailer.createTransport({
    service:'gmail',
     auth: {
       // TODO: replace `user` and `pass` values from <https://forwardemail.net>
       user: process.env.SENDEREMAIL,
       pass: process.env.EMAILPASS,
     },
   });


app.post('/forgot',async(req,res)=>{

  try {
    const {Email,otp,pass,cpass}=req.body
    const forgot= await Users.find({Email:Email}).count()
    console.log(forgot);
    if (forgot===1) {
      console.log(forgot);
      res.send("exist")
    }
    else{
      res.send("not-exist")

    }
    



    

    // console.log(username);
  } catch (error) {
    console.log(error);
    res.send(error)
  }
})


app.post('/form', async(req, res) => {
    try {
     const {Fname, Lname, Email, Phone, Password, CPassword, City, Otp} =req.body;
     console.log(Otp);
     console.log(typeof(Otp),typeof(otps[Email]));
     if(Otp===otps[Email]){
          delete otps[Email];
         const User = new Users({
             
            
              Fname:Fname,
              Lname:Lname,
              Password:Password,
              City:City,
              Email:Email,
              Phone:Phone
          });
          // const token= await User.generateAuthToken();
          // console.log(token);
// if we want to direct access (mean withouth login use ) below code
// res.cookie("jwt",token,{
//      expires:new Date(Date.now()+500000),
//      httpOnly:true
// });
          const created= await User.save();
          console.log("one");
          res.send("success");
     }else{
          res.send("invalid");
     }
    } catch (error) {
         console.log("done"+error);
         res.send(error) ;
    }
    });



app.post('/tokenAuth',auth,(req,res)=>{

  try {
      const userData=req.user
      const cookie=req.token
      const {Fname, Lname, Email, Phone, City,tokens}=userData;
    const uData={Fname, Lname, Email, Phone, City}
    // console.log(userData.token);
    console.log(Object.keys(userData.tokens).length)

    if (Object.keys(userData.tokens).length!=0) {
      
    const f=userData.tokens.filter((ele)=>{
          // console.log(ele.token);
          return ele.token===cookie
      })
      console.log(userData+" ..............app.js");
      console.log(cookie+" ..............app.js");
      console.log(f[0].token+"...........match");
      console.log(f[0].token===cookie);

      if (f[0].token===cookie) {
        res.statusMessage="Authenticated"
    res.send(uData)
      } else {
        res.statusMessage="Not-Authenticated"
        res.send()

      }
    }
    else{
      console.log('token== empty in database');
      res.send("Login again")
    }

  } catch (error) {
    console.log(error);
    res.send(error)
  }
})

app.post('/feedback', async(req, res)=>{1
  const {name,cemail,message}=req.body;
  console.log(req.body);
  console.log(cemail);
  


  // if(flag){
  var feedback ={
   from:`"${name}" <"${cemail}">`, // sender address
   to: 'Example@gmail.com', // list of receivers
   subject: name +" want to Contact",
   html:`<h1>${message}</h1>`,
 };
 transporter.sendMail(feedback,function(error,info){
   if(error){
        console.log(error);

        res.send(error);
   }else{
     console.log('done');
     console.log(cemail);
        res.send(flag);
   }



})
// }else{
//  res.send(flag)
// }
})

app.post('/logout',auth,async(req,res)=>{
  try {
    const userData=req.user
      const cookie=req.token
      console.log(userData,cookie,userData.tokens)
      const f=userData.tokens.filter((ele)=>{
        // console.log(ele.token);
        return ele.token!=cookie
    })
    userData.tokens=f
    await userData.save()
    res.statusMessage="logout"
    res.send()

    
    
  } catch (error) {
    console.log(error);
    
  }
})



app.post('/alllogout',auth,async(req,res)=>{
  try {
    const userData=req.user
      const cookie=req.token
      console.log(userData,cookie,userData.tokens)
      
    userData.tokens=[]
    await userData.save()
    res.statusMessage="alllogout"
    res.send()

    
    
  } catch (error) {
    console.log(error);
    
  }
})
app.post('/log', async(req, res)=>{
      try{
        console.log(req.body)
        const {Username,Pass_word,}=req.body;
        console.log("u "+Username+"ps"+Pass_word)

        // console.log('comelogin');
      const UserO= await Users.findOne({Email:Username});

      const UserOobj= await Users.find({Email:Username});
      console.log(UserOobj)
      // console.log("obj"+UserOobj)
      const {Fname, Lname, Email, Phone,Password, City}=UserOobj[0];
      const userdata={Fname, Lname, Email, Phone, City};
      // console.log("stk"+stk.Email,stk.Password);
      // console.log("[0]"+UserOobj[0])
console.log(Email, Password)
const HashPass=await bcrypt.compare(Pass_word,UserO.Password)
console.log(HashPass);
if(HashPass){
  console.log('match');

  const token= await UserO.generateAuthToken();
  console.log(token);
  const userdata={Fname, Lname, Email, Phone, City,token};


  // const verifyTOKEN=jwt.verify(token,"Shakib")
  // console.log("verification"+ verifyTOKEN._id);
  //  res.cookie("jwt",token,{
  //    expires:new Date(Date.now()+500000),
  //       httpOnly:true });
        // res.json({token:token})
        res.statusMessage='success';
        // res.cookie('jwt',token)
        res.send(userdata);
        // res.send("ok").statusMessage("done");
        // res.send(token)
}else
{ 
  console.log('not match');


   res.send("not match");
}
}catch(error){
  console.log(error)
 res.send("invailid");
}


    });
// history apis start
app.post('/hi', async (req, res) => {
  const { Email} = req.body;

  try {
    // Find the user by userId
    const user = await Users.findOne({Email:Email});

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add the new chat object to the chats array
res.send(user.chats)

    // Save the updated user document
    // await user.save();

    // res.status(200).json({ message: 'Chat history updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error});
  }
});


// history apis eend



// app.post('/auth', async(req,res)=>{
//   try {
//     const token=req.cookies.jwt;
//     if(token){

//     const verifyUser=jwt.verify(token,"Shakib");
//     console.log(verifyUser);
//     const user=await Users.findOne({_id:verifyUser._id})
//     // console.log(user.fname)
//     res.send(user)
//     }else{
//       console.log("not found")
//       res.status(401).send("false")
//     }
 
    
// } catch (error) {
//    console.log(error)
//    res.send("false")
    
// }

// })

app.post('/forgotOTPAuth',async(req,res)=>{
  
  const {Email,otp}=req.body
  try {
    
    if(otp===otps[Email]){
      
      console.log(otp,otps[Email]);
      
      
      res.send("OTP-AUTHENTICATED")
      delete otps[Email];
  }
  else if (otp!=otps[Email]){
    console.log("wrog");
    res.send("NOT-OTP-AUTHENTICATED")


  }

} catch (error) {
  console.log(error);
  // res.send(error)
}
  
})

app.put('/reset', async(req,res)=>{
  try {
    const {Email,password}=req.body
    console.log(Email,password);
    const passhash=await bcrypt.hash(password,10)
console.log(passhash);
    const Reset=await Users.updateOne({Email:Email},{$set:{Password:passhash}})
    console.log(Reset.modifiedCount);
    console.log(Reset);

    res.send(Reset)
  } catch (error) {
    console.log(error);
    res.send(error)
  }
  })

// app.post('/reset',async(req,res)=>{
// try {
//   const Reset=await Users.
// } catch (error) {
//   console.log(error);
// }
// })

app.post('/otp', async(req, res) => {
      const {Email}=req.body;
      console.log(Email);
      const otp = randomstring.generate({ length: 6, charset: 'numeric' }); //online
      // const otp = "1";
      otps[Email]=otp;
    console.log(otps[Email]);
        var option ={
          from: "shakibkumnali@gmail.com", // sender address
          to: Email, // list of receivers
          subject: "Hello ✔", // Subject line
          // text: ` your otp is ${otp} `, // plain text body
          
          attachments: [{
               filename: 'Avaz-logo2.png',
               path: __dirname+'/Avaz-logo2.png',
               cid: 'myImg'
             }],
         html:`<!DOCTYPE html>
         <html lang="en">
           <head>
             <meta charset="UTF-8" />
             <meta name="viewport" content="width=device-width, initial-scale=1.0" />
             <meta http-equiv="X-UA-Compatible" content="ie=edge" />
             <title>Static Template</title>
         
             <link
               href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
               rel="stylesheet"
             />
           </head>
           <body
             style="
               margin: 0;
               font-family: 'Poppins', sans-serif;
               background: #ffffff;
               font-size: 14px;
             "
           >
             <div
               style="
                 max-width: 680px;
                 margin: 0 auto;
                 padding: 5px 30px 60px;
                 background: #f4f7ff;
                 background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner);
                 background-repeat: no-repeat;
                 background-size: 800px 452px;
                 background-position: top center;
                 font-size: 14px;
                 color: #434343;
               "
             >
               <header style="height: 130px;">
                 <table style="width: 100%;">
                   <tbody>
                     <tr style="height: 160px;">
                       <td>
                         <img
                           alt=""
                           src= "cid:myImg"
                           height="190px"
                           
         
                         />
                       </td>
                       <td style="text-align: right;">
                         <span
                           style="font-size: 16px; line-height: 30px; color: #ffffff;"
                           >12 Nov, 2021</span
                         >
                       </td>
                     </tr>
                   </tbody>
                 </table>
               </header>
         
               <main>
                 <div
                   style="
                     margin: 0;
                     margin-top: 70px;
                     padding: 92px 30px 115px;
                     background: #ffffff;
                     border-radius: 30px;
                     text-align: center;
                   "
                 >
                   <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                     <h1
                       style="
                         margin: 0;
                         font-size: 24px;
                         font-weight: 500;
                         color: #1f1f1f;
                       "
                     >
                       Your OTP
                     </h1>
                     <p
                       style="
                         margin: 0;
                         margin-top: 17px;
                         font-size: 16px;
                         font-weight: 500;
                       "
                     >
                      ${Email},
                     </p>
                     <p
                       style="
                         margin: 0;
                         margin-top: 17px;
                         font-weight: 500;
                         letter-spacing: 0.56px;
                       "
                     >
                       Thank you for choosing AVAZ. Use the following OTP
                       to complete the registeration . OTP is
                       valid for
                       <span style="font-weight: 600; color: #1f1f1f;">5 minutes</span>.
                       Do not share this code with others, including AVAZ
                       employees.
                     </p>
                     <p
                       style="
                         margin: 0;
                         margin-top: 60px;
                         font-size: 40px;
                         font-weight: 600;
                         letter-spacing: 25px;
                         color: #ba3d4f;
                       "
                     >
                     ${otp}
                     </p>
                   </div>
                 </div>
         
                 <p
                   style="
                     max-width: 400px;
                     margin: 0 auto;
                     margin-top: 90px;
                     text-align: center;
                     font-weight: 500;
                     color: #8c8c8c;
                   "
                 >
                   Need help? Ask at
                   <a
                     href="mailto: Example@gmail.com"
                     style="color: #499fb6; text-decoration: none;"
                     >AVAZ@gmail.com</a
                   >
                   or visit our
                   <a
                     href=""
                     target="_blank"
                     style="color: #499fb6; text-decoration: none;"
                     >Help Center</a
                   >
                 </p>
               </main>
         
               <footer
                 style="
                   width: 100%;
                   max-width: 490px;
                   margin: 20px auto 0;
                   text-align: center;
                   border-top: 1px solid #e6ebf1;
                 "
               >
                 <p
                   style="
                     margin: 0;
                     margin-top: 40px;
                     font-size: 16px;
                     font-weight: 600;
                     color: #434343;
                   "
                 >
                   AVAZ
                 </p>
                 <p style="margin: 0; margin-top: 8px; color: #434343;">
                  1st Rabodi, Thane (West), 400601
                 </p>
                 <div style="margin: 0; margin-top: 16px;">
                   <a href="" target="_blank" style="display: inline-block;">
                     <img
                       width="36px"
                       alt="Facebook"
                       src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook"
                     />
                   </a>
                   <a
                     href=""
                     target="_blank"
                     style="display: inline-block; margin-left: 8px;"
                   >
                     <img
                       width="36px"
                       alt="Instagram"
                       src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram"
                   /></a>
                   <a
                     href=""
                     target="_blank"
                     style="display: inline-block; margin-left: 8px;"
                   >
                     <img
                       width="36px"
                       alt="Twitter"
                       src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter"
                     />
                   </a>
                   <a
                     href=""
                     target="_blank"
                     style="display: inline-block; margin-left: 8px;"
                   >
                     <img
                       width="36px"
                       alt="Youtube"
                       src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube"
                   /></a>
                 </div>
                 <p style="margin: 0; margin-top: 16px; color: #434343;">
                   Copyright © 2022 Company. All rights reserved.
                 </p>
               </footer>
             </div>
           </body>
         </html>
         `,
      // html body
        };
        transporter.sendMail(option,function(error,info){
          if(error){
              //  console.log(error);
               res.send(error);
          }else{
               res.send("done");
          }

        })

})


app.listen(port, () => console.log(`Example app listening on port ${port}!`))