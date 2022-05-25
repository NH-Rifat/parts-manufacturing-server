const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbt9a.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })




async function run(){
    try{
        await client.connect();
        // console.log('connected with mongodb')
        const serviceCollection = client.db('car-manufacturing').collection('products');

        app.get('/products', async(req, res) =>{
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

        app.get('/item/:productId',async(req,res)=>{
          const id = req.params.productId;
          // console.log('product id,',id);
          const query = {_id: ObjectId(id)};
          const result = await serviceCollection.findOne(query)

          res.send(result)
        })


    }
    finally{

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('car manufacturing loaded')
})

app.listen(port, () => {
  console.log(`car manufacturing app listening at ${port}`)
})