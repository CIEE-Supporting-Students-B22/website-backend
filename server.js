const express = require('express'),
    app = express(),
    env = require('dotenv').config(),
    glob = require('glob'),
    fileUpload = require('express-fileupload'),
    { MongoClient, ServerApiVersion, ObjectId} = require('mongodb'),
    port = 2000;

const uri = `mongodb+srv://CIEESupportingStudents:${process.env.MONGO_PW}@support.emb45jc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect();
const db = client.db("CIEESupport")

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

app.get('/pageTypes', (req, res) => {
    //Essentially the buttons on the homepage
    let pages = db.collection("Pages").find({}).toArray().then( arr => res.send(arr))
})

//Get all posts, NO LONG DESCRIPTION
app.post('/getPosts', (req,res) => {
    db.collection("Posts").find({"postType": req.body.postType}, {description:0}).toArray().then(arr => res.send(arr));
})

//Get a single post with its long description
app.post('/getPost', (req,res) => {
    db.collection("Posts").findOne({"_id": ObjectId(req.body._id)}).then( data => res.send(data));
})

app.post('/removePost', (req,res) => {
    db.collection("Posts").deleteOne({"_id": ObjectId(req.body._id)}).then(res.sendStatus(200))
})

function handlePostUpdate(mongoResponse, req, res) {
    if (mongoResponse.acknowledged) {
        if (req.files) {
            let filename = req.files.postImage.name;
            console.log(mongoResponse);
            req.files.postImage.mv('user_uploads/' + (mongoResponse.insertedId ? mongoResponse.insertedId.toString() : req.body._id.toString()) + filename.substring(filename.indexOf('.')), (error) => {
                if (error) console.log(error)
            });
        }
        res.send({"_id": mongoResponse.insertedId ? mongoResponse.insertedId.toString() : req.body._id})
    }
}

app.post('/addPost', (req,res) => {
    db.collection("Posts").insertOne(req.body)
        .then((mongoResponse) => handlePostUpdate(mongoResponse, req, res));
})

app.post('/editPost', (req,res) => {
    let newPost = req.body;
    newPost._id = ObjectId(req.body._id);
    db.collection("Posts").replaceOne({"_id": ObjectId(req.body._id)}, newPost)
        .then((mongoResponse) => handlePostUpdate(mongoResponse, req, res));
})

app.get('/getImages', (req,res) => {
    let filename = req.query._id;
    glob('user_uploads/'+filename+'.*', (err, files) => {
        if (err) console.log(err);
        if (files) {
            let listOfPaths = []
            files.forEach(imageName => listOfPaths.push(imageName))
            res.send(listOfPaths)
        }
    })
})

app.get('/getImage', (req,res) => {
    res.sendFile(__dirname+'/'+req.query.pathname)
})



app.listen(port, () => {
    console.log(`Server started on ${port}`);
});