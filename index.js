const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbt9a.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}


async function run(){
    try{
        await client.connect();
        // console.log('connected with mongodb')
        const serviceCollection = client.db('car-manufacturing').collection('products');
        const orderCollection = client.db('car-manufacturing').collection('orders');
        const userCollection = client.db('car-manufacturing').collection('users');

        app.put('/user/:email', async (req, res) => {
          const email = req.params.email;
          const user = req.body;
          const filter = { email: email };
          const options = { upsert: true };
          const updateDoc = {
            $set: user,
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
          res.send({ result, accessToken:token });
        })

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

        app.post('/order',async(req,res)=>{
          const order = req.body;
          console.log(order);

          const result = await orderCollection.insertOne(order);
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