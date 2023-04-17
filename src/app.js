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
    const name = req.body.name;

    const schema =  joi.object({
        name : joi.string().required(),
    })


    try {
        const response = await db.collection("participants").findOne({name: sanitizedName})
        if(response) return res.sendStatus(409)
        
        await db.collection("participants").insertOne({name: sanitizedName, lastStatus: Date.now()})

        await db.collection("messages").insertOne({
            from: sanitizedName, to: 'Todos', text: 'entra na sala...', type: 'status', time: time
        })

        return res.sendStatus(201);
    }catch(err){
        return res.status(500).send(err.message);
    }

}
)

app.get("/participants",  (req, res)=>{
    db.collection("participants").find().toArray().then(dados =>{
     
     res.send(dados)

    })
     .catch((res)=> {
         return res.status(500).send(err.message);
     })
})





const port = 5000
app.listen(port, () => console.log(`Servidor está rodando`));