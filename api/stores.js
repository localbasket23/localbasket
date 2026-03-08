const STORES = [
  { id: 1, name: "Fresh Grocery", pin: "401105", category: "grocery" },
  { id: 2, name: "Daily Needs Store", pin: "401105", category: "daily products" },
  { id: 3, name: "City Mart", pin: "560001", category: "grocery" }
];

module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const pin = typeof req.query?.pin === "string" ? req.query.pin : "";
  const filtered = pin ? STORES.filter((store) => store.pin === pin) : STORES;

  res.status(200).json(filtered);
};