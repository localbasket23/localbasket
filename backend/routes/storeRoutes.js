const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const {
  createStore,
  listStores,
  getStoreById
} = require("../controllers/storeController");

router.post("/create", upload.any(), createStore);
router.get("/", listStores);
router.get("/:id", getStoreById);

module.exports = router;
