const STORES = [
  { id: 1, store_name: "Fresh Grocery", pincode: "401105", category_name: "Grocery", is_online: 1, avg_rating: 4.4, rating_count: 18 },
  { id: 2, store_name: "Daily Needs Store", pincode: "401105", category_name: "Daily Products", is_online: 0, avg_rating: 4.1, rating_count: 9 },
  { id: 3, store_name: "City Mart", pincode: "560001", category_name: "Grocery", is_online: 1, avg_rating: 4.7, rating_count: 31 }
];

module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const pin = typeof req.query?.pincode === "string"
    ? req.query.pincode
    : (typeof req.query?.pin === "string" ? req.query.pin : "");
  const filtered = pin ? STORES.filter((store) => store.pincode === pin) : STORES;

  res.status(200).json({ success: true, stores: filtered });
};
