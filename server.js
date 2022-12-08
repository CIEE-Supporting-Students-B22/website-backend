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

app.post('/adminAddPage', (req,res) => {
    db.collection("Pages").insertOne(req.body).then(res.redirect('/admin-panel'));
})

app.post('/adminRemovePage', (req,res) => {
    console.log("removing ", req.body)
    db.collection("Pages").deleteOne(req.body).then(res.sendStatus(200))
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

function uploadNewImages(imagesToUpload, descToChange, postID) {
    for (let i=0;i<imagesToUpload.length;i++) {
        let filename = imagesToUpload[i].name;
        let newFileName = 'user_uploads/' + postID +'-'+i + filename.substring(filename.indexOf('.'))
        imagesToUpload[i].mv(newFileName, (error) => {
            if (error) console.log(error)
        })
        descToChange = descToChange.replaceAll('![]('+filename+')', '![](/getImage?pathname='+newFileName+')');
    }
    db.collection('Posts').updateOne({"_id": ObjectId(postID)}, { $set: { description: descToChange}});
}

function handlePostUpdate(mongoResponse, desc, req, res) {
    if (mongoResponse.acknowledged) {
        let postID = (mongoResponse.insertedId ? mongoResponse.insertedId.toString() : req.body._id.toString())
        if (req.files) {
            let listOfFiles = req.files.postImage;
            if (req.files.postImage.length === undefined) listOfFiles = [listOfFiles];
            deleteImages(postID).then(uploadNewImages(listOfFiles, desc, postID));
        }
        res.send({"_id": postID})
    }
}

app.post('/adminRemoveImage', (req,res) => {
    fs.unlinkSync(req.body.path);
    console.log('removed: ',req.body.path)
    res.sendStatus(204);
})

app.post('/adminAddPost', (req,res) => {
    db.collection("Posts").insertOne(req.body)
        .then((mongoResponse) => handlePostUpdate(mongoResponse, req.body.description, req, res));
})

app.post('/adminEditPost', (req,res) => {
    let newPost = req.body;
    newPost._id = ObjectId(req.body._id);
    db.collection("Posts").replaceOne({"_id": ObjectId(req.body._id)}, newPost)
        .then(res.send({"_id": req.body._id}))
        //.then((mongoResponse) => handlePostUpdate(mongoResponse, req, res));
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

app.post('/loginToSite', (req,res) => {
    if (req.body.username === 'admin' && req.body.password === 'admintest') {
        req.session.login = true;
        res.redirect('/admin-panel');
    }
    else res.redirect('/login');

})

//IF YOU CANT MAKE CHANGES GO TO http://localhost:2000/adminTest and LOGIN WITH:
//Username: admin
//Password: admintest
//then all editing and admin features should work
app.get('/loggedIn', (req,res) => {
    if (req.session.login) res.sendStatus(200);
    else res.sendStatus(401); //Unauthorized
})

app.post('/adminSubmitImage', (req,res) => {
    let listOfFiles = req.files.postImage;
    if (req.files.postImage.length === undefined) listOfFiles = [listOfFiles];
    db.collection("Posts").findOne({"_id": ObjectId(req.body.postID)}).then(data => {
        let currentImages = Number(data.numOfImages);
        console.log(currentImages);
        /*
        let findFiles = new Promise( (resolve, reject) => {
            glob('user_uploads/'+req.body.postID+'-*.*', (err, files) => {
                if (err) {
                    console.log(err)
                    reject();
                }
                if (files) {
                    console.log(files);
                    //currentImages = files.length;
                }
                resolve();
            })
        });
         */
        for (let i=0;i<listOfFiles.length;i++) {
            let filename = listOfFiles[i].name;
            let num = i+currentImages
            listOfFiles[i].mv('user_uploads/' + req.body.postID +'-'+ num + filename.substring(filename.indexOf('.')), (error) => {
                if (error) console.log(error)
            });
        }
        db.collection('Posts').updateOne({"_id": ObjectId(req.body.postID)}, { $set: { numOfImages: String(currentImages+listOfFiles.length)}});
        res.sendStatus(200);
    })
})

app.listen(port, () => {
    console.log(`Server started on ${port}`);
});