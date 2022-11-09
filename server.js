const express = require('express'),
    app = express(),
    env = require('dotenv').config(),
    { MongoClient, ServerApiVersion, ObjectId} = require('mongodb'),
    port = 2000;

const uri = `mongodb+srv://CIEESupportingStudents:${process.env.MONGO_PW}@support.emb45jc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect();
const db = client.db("CIEESupport")

app.use(express.json());

app.get('/pageTypes', (req, res) => {
    //Essentially the 4 buttons on the homepage
    let pages = db.collection("Pages").find({}).toArray().then( arr => res.send(arr))
})

app.post('/getPosts', (req,res) => {
    db.collection("Posts").find({"postType": req.body.postType}).toArray().then(arr => res.send(arr));
})

app.post('/removePost', (req,res) => {
    db.collection("Posts").deleteOne({"_id": ObjectId(req.body._id)}).then(res.sendStatus(200))
})


app.listen(port, () => {
    console.log(`Server started on ${port}`);
});