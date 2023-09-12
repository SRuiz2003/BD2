"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis = __importStar(require("redis"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const database_service_1 = require("../services/database.service");
const query_1 = __importDefault(require("../modules/query"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 7000;
const client = redis.createClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield client.connect();
        (0, database_service_1.connectToDatabase)();
        client.on('error', err => console.log('Redis Client Error', err));
        app.listen(PORT, () => {
            console.log(`Server is connected to redis and is listening on port ${PORT}`);
        });
    }
    catch (error) {
        console.log(error);
    }
});
function getCharacters(name) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://rickandmortyapi.com/api/character/?name=${name}`;
        const mon = yield ((_a = database_service_1.collections.querys) === null || _a === void 0 ? void 0 : _a.find({ "query": name }).toArray());
        try {
            if (yield client.exists(name)) {
                const data = yield client.get(name);
                console.log("FoundRedis");
                return data;
            }
            else {
                if ((mon === null || mon === void 0 ? void 0 : mon.length) != 0) {
                    const data = mon.at(0).data;
                    yield client.set(name, JSON.stringify(data));
                    console.log("FoundMongo");
                    return data;
                }
                else {
                    const response = yield axios_1.default.get(url);
                    const data = yield response.data.results;
                    //console.log(data);
                    const newQuery = new query_1.default(name, data);
                    const ins = yield ((_b = database_service_1.collections.querys) === null || _b === void 0 ? void 0 : _b.insertOne(newQuery));
                    ins
                        ? console.log(ins.insertedId)
                        : console.log("Failed mongo insert");
                    yield client.set(name, JSON.stringify(data));
                    console.log("WentToApi");
                    return data;
                }
            }
        }
        catch (error) {
            if (error == 'AxiosError: Request failed with status code 404') {
                console.log('404, Results not found.');
                yield client.set(name, "there is nothing here");
                const a = JSON.stringify({ "error": "There is nothig here" });
                const newQuery = new query_1.default(name, [JSON.parse(a)]);
                const ins = yield ((_c = database_service_1.collections.querys) === null || _c === void 0 ? void 0 : _c.insertOne(newQuery));
                return { "error": "there is nothing here" };
            }
            else {
                console.log('Error;', error);
                return { "error": JSON.stringify(error) };
            }
        }
    });
}
app.get('/characters/:query', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let data;
    try {
        const [, query] = req.params.query.split('=');
        console.log(query);
        if (query != undefined) {
            data = yield getCharacters(query);
        }
        else {
            data = { "undefined": "EmptyQuery" };
        }
        return res.status(200).json({ data });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
}));
start();
