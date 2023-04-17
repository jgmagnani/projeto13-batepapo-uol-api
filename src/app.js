import {MongoClient, ObjectId} from "mongodb";
import express from "express";
import dayjs from "dayjs";




const app = express();


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





const port = 5000
app.listen(port, () => console.log(`Servidor está rodando`));