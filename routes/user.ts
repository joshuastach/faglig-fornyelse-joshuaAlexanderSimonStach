import { Hono } from "hono";
import { connectDB } from "../db/mongo.ts";



export const usersRoute = new Hono();

usersRoute.get("/", async c => {
    const db = await connectDB()
    const sales = await db.collection("sales").find().toArray()
    return c.json(sales);
})

usersRoute.post("/", async c => {
    const body = await c.req.json()
    const db = await connectDB()
    const result = await db.collection("sales").insertOne(body);
    return c.json({ insertId: result.insertedId })
})

