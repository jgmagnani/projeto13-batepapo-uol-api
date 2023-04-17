import {MongoClient, ObjectId} from "mongodb";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import { stripHtml } from "string-strip-html";
import dayjs from "dayjs";
import { strict as assert } from "assert";


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

//setando formato de hora
const time = dayjs().format("HH:mm:ss");

//criando banco
const mongoClient = new MongoClient(process.env.DATABASE_URL) 
let db;

try{
    await mongoClient.connect();
    db = mongoClient.db;  
    
}catch(error) {
    console.log(error.message)
}


app.post("/participants", async (req, res) => {
    const user = req.body

    try{
        const userSchema = joi.object({
            name : joi.string().required()
        })

        const validation = userSchema.validate(user, {abortEarly: false});
        if(validation.error){
            const err = validation.error.details.map(item => item.message)
            return res.status(422).send(err)
        }

        const existUser = await db.collection("participants").findOne({name: user.name })
        if(existUser){
            return res.status(409).send("This user already exist")
        }


        const newUser = {
            name: user.name,
            lastStatus: Date.now()
        }

        const newUserMessage = {
            from: user.name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs(newUser.lastStatus).format("HH:mm:ss")
        }

        await db.collection("participants").insertOne(newUser)
        await db.collection("messages").insertOne(newUserMessage)
        res.sendStatus(201)
    }catch (err){
        res.sendStatus(500)
    }
})

app.get("/participants",  (req, res)=>{
    db.collection("participants").find().toArray().then(dados =>{
     
     res.send(dados)

    })
     .catch((res)=> {
         return res.status(500).send(err.message);
     })
})

app.post("/messages", async (req, res) => {
    const { to, type, text } = req.body
    const { user } = req.headers

    try{
        const existUser = await db.collection("participants").findOne({ name: user })
        if(!existUser) {
           return res.status(422).send("ocorreu um erro")
        }

        const newMessage = {
            from: existUser.name,
            to,
            text,
            type,
            time: dayjs(Date.now()).format("HH:mm:ss")
        }

        const messageSchema = joi.object({
            from: joi.string().required(),
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().valid("message", "private_message").required(),
            time: joi.string().required()
        })

        const validation = messageSchema.validate(newMessage, {abortEarly: false})
        if(validation.error) {
            const err = validation.error.details.map( item => item.message)
            return res.status(422).send(err)
        }

        await db.collection("messages").insertOne(newMessage)
        res.sendStatus(201)
    }catch(err) {
        res.sendStatus(500)
    }
})


app.get("/messages", async (req, res) => {
    const { user } = req.headers
    let limit = 100
    let lastMessages = []

    try{
        const listMessages = await db.collection("messages").find({ $or: [{ from: user }, { to: user }, { to: "Todos" }] }).toArray()
        const messages = listMessages.filter((message) => {
            if(message.type === 'message' || message.type === 'status'){
                return true
            }

            if(message.type === 'private_message' && message.from === user || message.to === user){
                return true
            }

            return false
        })

        if(req.query.limit){
            limit = parseInt(req.query.limit)

            if(limit < 1 || isNaN(limit)){
                return res.status(422).send("Invalid limit")
            }

            lastMessages = messages.reverse().slice(0, limit)
            return res.send(lastMessages)
        }

        res.send(messages)

        } catch (err) {
        res.sendStatus(500)
    }
})

app.post("/status", async(req, res) => {
    const { user } = req.headers

    try{
        const userUpdate = await db.collection("participants").findOne({ name: user })
        if(!userUpdate) return res.sendStatus(404)

        await db.collection("participants").updateOne(
            { name: user },
            {$set: { lastStatus: Date.now() }}
        )

        res.sendStatus(200)
    } catch (err) {
        res.sendStatus(500)
    }
})

//usuário inativo
setInterval(inactiveUser, 15000)

async function inactiveUser(){
    const now = Date.now()
   

    try{
       const user =  await db.collection("participants").findOne({})
       if(user && user.lastStatus < now - 10000 ){
        await db.collection("participants").deleteOne({name: user.name})
        db.collection("messages").insertOne({from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time})
        //console.log(`${user.name} deleted`)
        }

    }catch(error){
        console.log(error.message)
    }

}

const port = 5000
app.listen(port, () => console.log(`Servidor está rodando`));