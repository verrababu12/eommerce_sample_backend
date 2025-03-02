const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("./models/userModel");
const Product = require("./models/productModel");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.listen(3001, () => {
  console.log(`Server Running at http://localhost:3001`);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb Connected"))
  .catch((err) => console.log(err));

const protect = async (req, res, next) => {
  let token = req.headers.authorization;

  if (token) {
    try {
      const decoded = jwt.verify(
        token.split(" ")[1],
        process.env.JWT_SECRET_TOKEN
      );
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized" });
    }
  } else {
    res.status(401).json({ message: "No token, not authorized" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as admin" });
  }
};

app.post("/all-products", allProducts);
app.post("/only-admin", protect, admin, createProduct);
app.put("/:id", protect, admin, updateProduct);
app.delete("/:id", protect, admin, deleteProduct);
app.get("/products", getProducts);

app.post("/register", registerUser);
app.post("/login", loginUser);
app.get("/users", protect, admin, getUsers);
app.put("/users/:id/make-admin", protect, admin, updateUserToAdmin);

const allProducts = async (req, res) => {
  try {
    const products = await Product.insertMany(req.body);
    res.status(201).json({ message: "Products added successfully", products });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding products", error: error.message });
  }
};

const createProduct = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

const updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
};

const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  await product.deleteOne();
  res.json({ message: "Product deleted" });
};

const getProducts = async (req, res) => {
  const products = await Product.find({});
  res.json(products);
};

const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "user",
  });

  if (user) {
    res.status(201).json({ message: "User registered successfully" });
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET_TOKEN,
        { expiresIn: "30d" }
      ),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};

const getUsers = async (req, res) => {
  const users = await User.find({});
  res.json(users);
};

const updateUserToAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role) {
      return res.status(400).json({ message: "User is already an admin" });
    }

    if (req.user._id.toString() === user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You cannot update your own role" });
    }

    user.role = "admin";
    await user.save();

    res.json({ message: `${user.name} is now an admin` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
