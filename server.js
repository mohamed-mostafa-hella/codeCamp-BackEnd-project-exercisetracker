require('dotenv').config();
const express = require('express')
const app = express()
const cors = require('cors')
const moment = require('moment');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
  });
  

// --------------------------------- mongoose conection and model creation ----------

// connect to mongoDB 
mongoose.connect(process.env.MONGODB_URL,{ useNewUrlParser: true, useUnifiedTopology: true }, err => {
  if(err) console.log(err);
  else console.log('Connected to MongoDB!!!')
  });

var exerciseUsersSchema = new mongoose.Schema({
    username : {type:String , required: true},
    exercises:[
        {
            _id:false,
            description:{
                type:String,
                required:true
            },
            duration:{
                type:Number,
                required:true
            },
            date:{
                type:Date,
                default:new Date()
            }
        }
    ]
});

const ExerciseUsersModel = mongoose.model('ExerciseUsersModel' , exerciseUsersSchema);

// ------------------ get function ---------------------

app.get('/api/users',(req , res)=>{
    ExerciseUsersModel.find({})
    .select('username _id')
    .exec((err,data)=>{
    if(err) console.log(err);
    else {
      res.json(data);
    }
  })
})



  app.get('/api/users/:_id/logs', async (req, res) => {
    let userId = req.params._id
    let from = req.query.from == undefined ? null:new Date(req.query.from) 
    let to = req.query.to == undefined ? null:new Date(req.query.to)
    let limit = parseInt(req.query.limit)
    
    const user = await ExerciseUsersModel.findOne({ _id: userId })
  
    if (user) {
      let count = user.exercises.length
      let result
      if (from && to) {
        result = {
          _id: userId,
          username: user.username,
          count,
          log: user.exercises
            .filter((e) => e.date >= from && e.date <= to)
            .slice(0, limit || count)
        }
      } else if (from) {
        result = {
          _id: userId,
          username: user.username,
          count,
          log: user.exercises
            .filter((e) =>e.date >= from)
            .slice(0, limit || count),
        }
      } else if (to) {
         result = {
          _id: userId,
          username: user.username,
          count,
          log: user.exercises
            .filter((e) => e.date <= to)
            .slice(0, limit || count),
        }
      } else {
       result = {
          _id: userId,
          username: user.username,
          count,
          log: user.exercises.slice(0, limit || count),
        }
      }
      result.log = result.log.map(p=>{
         return {
           date:new Date(p.date).toDateString(),
           description:p.description,
           duration:Number(p.duration)
         }
      })
      result.count = result.log.length
      console.log(result)
      res.send(result)      
    } 
    else
      res.json({ error: 'User not found!' })
  })


// -------------------- post functions ----------------------------

app.post('/api/users' , async(req,res)=>{
 
    let username  = req.body.username;
    let user = await ExerciseUsersModel.findOne({username});
    if(user){
        res.json({
            erroe : "User already exists!"
        })
    }
    ExerciseUsersModel.create({username},(err , newUser)=>{
        if(err){
            console.log('Error Invalid user data : '+err)
        }else{
            res.json({
                username : newUser.username,
                _id : newUser._id
            });
        }
    })
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  let { description, duration, date } = req.body
  let userId = req.params._id
  
  const user = await ExerciseUsersModel.findById(userId)
  
  if (user) {
    user.exercises = [
      ...user.exercises,
      {
        description: description,
        duration: Number(duration),
        date: date
          ? new Date(date)
          : new Date(),
      },
    ]
    const updatedUser = await user.save()
    
    res.json({
      username: updatedUser.username,
      _id: updatedUser._id,
      description,
      duration: Number(duration),
      date: date
          ? moment(date).format('ddd MMM DD YYYY')
          : moment().format('ddd MMM DD YYYY'),
    })
  } 
  else res.json({ error: 'User not found' })
  
})

// ---------------- lisener
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
