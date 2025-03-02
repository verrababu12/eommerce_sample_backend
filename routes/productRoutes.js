const express = require("express");

const {
  allProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
} = require("../controllers/productController");

const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/all-products", allProducts);
router.post("/only-admin", protect, admin, createProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);
router.get("/", getProducts);

module.exports = router;
