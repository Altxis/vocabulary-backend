import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'

const app = express()
app.use(cors())
app.use(express.json());
const port = 3001
const url = 'mongodb://127.0.0.1:27017/';
const mongoClient = new MongoClient(url);
let db

const dbConnect = async () => {
  await mongoClient.connect();
  const db = mongoClient.db('vocabulary');
  return db
}

app.post('/api/words', async (req, res) => {
  try {
    const { skip, limit, search } = req.body
    const words = db.collection('words')
    const conditions = {}
    if (search) {
      conditions['$or'] = [
        { 'word': { $regex: search, $options: 'i' } },
        { 'translation': { $regex: search, $options: 'i' } },
      ]
    }
    const result = await words.find(conditions).skip(skip).limit(limit).toArray()
    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/words/statistics', async (req, res) => {
  try {
    console.log(req.body)
    const { id } = req.body
    const words = db.collection('words')
    const item = await words.findOne({ _id: ObjectId.createFromHexString(id) })
    await words.updateOne({ _id: ObjectId.createFromHexString(id) }, { $inc: { numberOfViews: 1 } })
    res.json(item)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/words/:id', async (req, res) => {
  try {
    const { id } = req.params
    const words = db.collection('words')
    const result = await words.findOne({ _id: ObjectId.createFromHexString(id) })
    console.log(result)
    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/hello/save-data', async (req, res) => {
  try {
    const sections = db.collection('sections')
    const words = db.collection('words')
    const data = req.body
    for (const section of data) {
      const { wordsArray, ...sectionData } = section
      await sections.updateOne({
          title: sectionData.title
      }, { $set: sectionData }, { upsert: true })
      const v = await sections.findOne({ title: sectionData.title })
      for (const word of wordsArray) {
        const { id, ...clearWord } = word
        await words.updateOne({
          externalId: word.id
        }, { $set: { sectionId: v._id, ...clearWord, externalId: word.id } }, { upsert: true })
      }
    }
    res.send({ message: 'Done' })
  } catch (error) {
    console.log(error)
    res.status(500).send({ error: error.message })
}
})

dbConnect().then(_db => {
  db = _db
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})
