import * as redis from 'redis';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request,Response, query} from 'express';
import { ObjectId } from "mongodb";
import { collections,connectToDatabase } from "../services/database.service"
import Query from "../modules/query"


dotenv.config()
const app : express.Application = express()
const PORT = process.env.PORT || 7000
const client=redis.createClient();


app.use(cors())
app.use(express.json())

const start = async () => {
    try {
        await client.connect();
		connectToDatabase();
		client.on('error', err => console.log('Redis Client Error', err));
        app.listen(PORT, () => {
            console.log(`Server is connected to redis and is listening on port ${PORT}`)
        })
    } catch (error) {
        console.log(error)
    }
}

async function getCharacters(name:string){
	
	const url:string = `https://rickandmortyapi.com/api/character/?name=${name}`;
	const mon = await collections.querys?.find({"query": name}).toArray();
	try{
		if(await client.exists(name)){
			const data = await client.get(name);
			console.log("FoundRedis");
			return data;
		}else{
			if(mon?.length != 0){
				const data = mon!.at(0)!.data;
				await client.set(name,JSON.stringify(data));
				console.log("FoundMongo");
				return data;
			}else{
				const response = await axios.get(url);
				const data = await response.data.results;
				//console.log(data);
				const newQuery = new Query(name,data);
				const ins = await collections.querys?.insertOne(newQuery);
				ins
					? console.log(ins.insertedId)
					: console.log("Failed mongo insert"); 
				await client.set(name,JSON.stringify(data));
				console.log("WentToApi");
				return data;
			}
		}

	}catch(error){
		if(error == 'AxiosError: Request failed with status code 404'){
			console.log('404, Results not found.')
			await client.set(name,"there is nothing here");
			const a = JSON.stringify({ "error":"There is nothig here"});
			const newQuery = new Query(name,[JSON.parse(a)]);
			const ins = await collections.querys?.insertOne(newQuery);
			return {"error":"there is nothing here"};
		}
		else{
			console.log('Error;',error);
			return {"error": JSON.stringify(error)};
		}
	}

}

app.get('/characters/:query', async (req:express.Request,res:express.Response)=>{
	let data;
	try{
		const [,query] = req.params.query.split('=');
		console.log(query);
		if(query != undefined){
			 data = await getCharacters(query);
		}else{
			 data = {"undefined":"EmptyQuery"}; 
		}
		return res.status(200).json({data});
	}catch(error){
		console.log(error);
        return res.status(500).json({error});
	}

});


start()

      