const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const port = process.env.PORT || 5000;


//middlewares
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.skbfv9j.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const appointmentCollection = client.db("doc_port_db").collection("appointment_session");
const bookingCollection = client.db('doc_port_db').collection("bookings")
const userCollection = client.db('doc_port_db').collection("users")

async function run(){
    try{
        app.get('/appointmentOptions', async(req,res)=>{
            const date = req.query.date;
            console.log(date)
            const query = {}
            const cursor = appointmentCollection.find(query)
            const options = await cursor.toArray()
            const bookingQuery = {date:date}
            const alreadyBooked = await bookingCollection.find(bookingQuery).toArray()
            options.forEach(option =>{
                const bookedOptions = alreadyBooked.filter(book => book.treatment === option.name)
                const bookedSlots = bookedOptions.map(book => book.slot)
                // console.log(bookedSlots)
                const remainingSlots = option.slots.filter (slot => !bookedSlots.includes(slot))
                option.slots = remainingSlots;
            })

            res.send({
                success : "true",
                data:options
            })
        })

        app.get('/bookings', async(req,res)=>{
            const email = req.query.email;
            const query = {email:email}
            const bookings = await bookingCollection.find(query).toArray();

            res.send({
                success:true,
                data:bookings
            })
        })

        app.post('/bookings',async(req,res)=>{
            const booking = req.body;
            const query = {email:booking.email, date : booking.date, treatment:booking.treatment}
            const alreadyBooked = await bookingCollection.find(query).toArray()
            if(alreadyBooked.length){
                return res.send({
                    success: false,
                    message:`You have already booked ${booking.treatment} on ${booking.date} `
                })
            }
            const result = await bookingCollection.insertOne(booking)
            
            if(result.insertedId){
                res.send({
                    success:true,
                    message:"Inserted Successfully"
                })
            }else{
                res.send({
                    success:false,
                    message : "Failed to insert"
                })
            }
        })

        app.get('/jwt', async(req,res)=>{
            const email = req.query.email;
            const user = await userCollection.findOne({email:email})
            if(user){
                const token = jwt.sign({email},process.env.TOKEN)
                res.send({token:token})
            }
        })

        app.post('/users', async(req,res)=>{
            const user = req.body;
            const result = await userCollection.insertOne(user)

            if(result.insertedId){
                res.send({
                    success:true,
                    message:"User save to Db"
                })
            }else{
                res.send({
                    success:false,
                    message:"Failed to send"
                })
            }
        })
    }
    
    catch(e){
        console.log(e.name,e.message)
    }
}

run()


app.get('/',(req,res) => {
    res.send('DoctorsPortal server is running.')
})



app.listen(port,()=>{
    console.log('server is running on port', port)
})