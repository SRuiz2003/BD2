import { ObjectId } from "mongodb";
export default class query {
    constructor(public query: string, public data: Array<JSON>, public id?: ObjectId) {}
}