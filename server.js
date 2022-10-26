const express = require('express'),
    app = express(),
    port = 3000;

app.get('/', (req, res) => {
    res.send("Test");
})



app.listen(port, () => {
    console.log(`Server started on ${port}`);
});