const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fbt9a.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    // console.log('connected with mongodb')
    const serviceCollection = client
      .db('car-manufacturing')
      .collection('products');
    const orderCollection = client.db('car-manufacturing').collection('orders');
    const userCollection = client.db('car-manufacturing').collection('users');
    const paymentCollection = client
      .db('car-manufacturing')
      .collection('payment');
    const reviewCollection = client
      .db('car-manufacturing')
      .collection('reviews');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      // console.log(requester);
      const requestAccount = await userCollection.findOne({ email: requester });
      if (requestAccount.role === 'admin') {
        next();
      } else {
        return res.status(403).send({ message: 'Forbiden Access' });
      }
    };

    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get('/item/:productId', async (req, res) => {
      const id = req.params.productId;
      // console.log('product id,',id);
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.findOne(query);

      res.send(result);
    });

    app.post('/order', async (req, res) => {
      const order = req.body;
      // console.log(order);

      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //(GET) Single user Orders
    app.get('/orders', verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log(email);

      const decodedEmail = req.decoded.email;
      // console.log('decoded email',decodedEmail);
      if (email === decodedEmail) {
        const query = { userEmail: email };
        const cursor = await orderCollection.find(query);
        const result = await cursor.toArray();
        // console.log(result);
        return res.json(result);
      } else {
        return res.status(403).send({ message: 'Not allow to access' });
      }
    });

    //(DELETE) DELETE Order
    app.delete('/deleteOrder/:id', async (req, res) => {
      const productId = req.params.id;
      // console.log(productId);
      const query = { _id: ObjectId(productId) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });

    //(POST) Post A Review
    app.post('/review', async (req, res) => {
      reviewDetails = req.body;
      const result = await reviewCollection.insertOne(reviewDetails);
      res.json(result);
    });

    //(GET) Show All Review
    app.get('/review', async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.json(result);
    });

    app.put('/userProfile/:email', async (req, res) => {
      // console.log('profile update');
      const email = req.params.email;
      // console.log(email);
      const user = req.body;
      // console.log(user);
      const filter = { email: email };
      // const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const updatedUser = await userCollection.updateOne(
        filter,
        updatedDoc
        // options
      );
      res.send(updatedUser);
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
      );
      res.send({ result, accessToken: token });
    });

    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get all user
    app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.json(result);
    });

    app.get('/useadmin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    });

    app.post('/addservice', verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await serviceCollection.insertOne(product);
      res.send(result);
    });

    app.get('/manageservice', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    app.delete(
      '/deleteService/:id',
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const productId = req.params.id;
        const query = { _id: ObjectId(productId) };
        const result = await serviceCollection.deleteOne(query);
        res.json(result);
      }
    );

    app.get('/manageAllOrders', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });

    app.put('/manageOrders/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body.status;
      // console.log(updateStatus);
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updateStatus,
        },
      };
      // console.log(updateDoc);
      const result = await orderCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete('/manageOrders/:id', async (req, res) => {
      const productId = req.params.id;
      // console.log(productId);
      const query = { _id: ObjectId(productId) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    app.post('/create-payment-intent', async (req, res) => {
      const service = req.body;
      const price = service.price;

      const amount = price * 100;

      // console.log(amount);
      if (amount) {
        const paymentIntent = await stripe.paymentIntents.create({
          // Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card'],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      }
    });

    app.patch('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await orderCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('car manufacturing loaded');
});

app.listen(port, () => {
  console.log(`car manufacturing app listening at ${port}`);
});
