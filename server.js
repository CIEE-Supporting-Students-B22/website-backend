const express = require('express'),
    app = express(),
    port = 2000;

app.use(express.json());

app.get('/test', (req,res) => {
    res.send('Test get request')
})

app.get('/pageTypes', (req, res) => {
    //Essentially the 4 buttons on the homepage
    let pageTypes = [
        {postType : "things-to-do", title : "Things To Do"},
        {postType : "language-prep", title : "Language Prep"},
        {postType : "using-services", title : "Using Services in the Czech Republic"},
        {postType : "upcoming-trips", title : "Upcoming Trips offered by CIEE"}
    ]
    res.send(pageTypes);
})

app.post('/removePost', (req,res) => {
    console.log(req.body);
})


app.listen(port, () => {
    console.log(`Server started on ${port}`);
});