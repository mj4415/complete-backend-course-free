const express = require('express');
const app = express();
const PORT=3000

app.use(express.json());

app.get('/' , (req,res) => {
    res.json ({
        message:'welcome!',
        version:'1.0.0'
    });
});
app.get('/api/info', (req,res) => {
    res.json ({
        message:'welcome to this route!',
        'timestamp': datetime.now().isoformat(),
    });
});
app.get('/api/greet/:name', (req,res) => {
    const name= req.params.name;
    res.json({
        message:`Hello ${name}!`
    });
});

app.post('/api/feedback', (res,req) => {
    const feedback= req.body
    res.json({
        message:'Feedback received!',
        success: true
    });
});
app.use((req,res) => {
    res.status(404).json({
        error: 'Page not found'
    });
});

app.listen(PORT,() => {
    console.log(`Server running on http://localhost:${PORT}`);
});