const express = require('express'),
    app = express(),
    cookie = require('cookie-session'),
    fs = require('fs'),
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
app.use(cookie({
    name: 'session',
    keys: ['temp1', 'temp2']
}))

//redirect
app.use( (req,res,next) => {
    if (!(req.originalUrl.includes('/admin')) || req.session.login === true) next();
    else res.sendFile(__dirname+'/public/login.html');
})

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

app.post('/adminRemovePost', (req,res) => {
    db.collection("Posts").deleteOne({"_id": ObjectId(req.body._id)})
        .then(deleteImages(req.body._id))
        .then(res.sendStatus(200))
})

function deleteImages(postID) {
    return new Promise( (resolve, reject) => {
        glob('user_uploads/'+postID+'-*.*', (err, files) => {
            if (err) reject();
            for (let item of files) {
                fs.unlinkSync(item);
                console.log('deleted ' + item);
            }
            resolve();
        })
    })
}

function handlePostUpdate(mongoResponse, req, res) {
    if (mongoResponse.acknowledged) {
        let postID = (mongoResponse.insertedId ? mongoResponse.insertedId.toString() : req.body._id.toString())
        if (req.files) {
            let listOfFiles = req.files.postImage;
            if (req.files.postImage.length === undefined) listOfFiles = [listOfFiles];
            deleteImages(postID).then( () => {
                for (let i=0;i<listOfFiles.length;i++) {
                    let filename = listOfFiles[i].name;
                    listOfFiles[i].mv('user_uploads/' + postID +'-'+i + filename.substring(filename.indexOf('.')), (error) => {
                        if (error) console.log(error)
                    });
                }
            })
        }
        res.send({"_id": postID})
    }
}

app.post('/adminRemoveImage', (req,res) => {
    console.log(req.body.path);
    fs.unlinkSync(req.body.path);
    console.log('removed: ',req.body.path)
    res.send(204);
})

app.post('/adminAddPost', (req,res) => {
    db.collection("Posts").insertOne(req.body)
        .then((mongoResponse) => handlePostUpdate(mongoResponse, req, res));
})

app.post('/adminEditPost', (req,res) => {
    let newPost = req.body;
    newPost._id = ObjectId(req.body._id);
    db.collection("Posts").replaceOne({"_id": ObjectId(req.body._id)}, newPost)
        .then((mongoResponse) => handlePostUpdate(mongoResponse, req, res));
})

app.get('/getImages', (req,res) => {
    let filename = req.query._id;
    glob('user_uploads/'+filename+'-*.*', (err, files) => {
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

app.post('/login', (req,res) => {
    if (req.body.username === 'admin' && req.body.password === 'admintest') {
        req.session.login = true;
        res.redirect('/adminTest');
    }
    else res.sendFile(__dirname+'/public/login.html');
})

//IF YOU CANT MAKE CHANGES GO TO http://localhost:2000/adminTest and LOGIN WITH:
//Username: admin
//Password: admintest
//then all editing and admin features should work
app.get('/adminTest', (req,res) => {
    res.send('Logged in');
})


app.listen(port, () => {
    console.log(`Server started on ${port}`);
});