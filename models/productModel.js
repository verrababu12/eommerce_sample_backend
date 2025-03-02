const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  title: { type: String },
  brand: { type: String },
  price: { type: Number },
  id: { type: Number },
  image_url: { type: String },
  rating: { type: String },
});

const product = mongoose.model("product", productSchema);

module.exports = product;
