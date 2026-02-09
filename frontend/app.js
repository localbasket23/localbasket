// app.js (simplified)
const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

// example Model
const StoreSchema = new mongoose.Schema({
  storeName: String,
  pincode: String,
  address: String,
  verified: Boolean,
  rating: Number
});
const Store = mongoose.model('Store', StoreSchema);

// endpoint
app.get('/api/stores', async (req, res) => {
  const { pincode } = req.query;
  if(!pincode) return res.status(400).json({ message: 'pincode required' });
  try{
    // find verified stores first, then fallback to stores in same district logic could be added
    const stores = await Store.find({ pincode, verified: true }).limit(50);
    res.json({ stores });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// connect + listen
const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser:true, useUnifiedTopology:true })
  .then(()=> app.listen(PORT, ()=> console.log('Server started', PORT)))
  .catch(err=> console.error(err));
