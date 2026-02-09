/**
 * =====================================================
 * LOCATION ROUTES
 * /api/location/area
 * /api/location/nearby-stores
 * =====================================================
 */

const express = require("express");
const router = express.Router();

// Node 18+ compatible fetch
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* =========================================
   GET AREA FROM PINCODE
   GET /api/location/area?pincode=401105
========================================= */
router.get("/area", async (req, res) => {
  try {
    const { pincode } = req.query;

    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: "Pincode required"
      });
    }

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&postalcode=${pincode}&country=India`,
      {
        headers: { "User-Agent": "LocalBasket/1.0" }
      }
    );

    const geoData = await geoRes.json();

    if (!geoData.length) {
      return res.json({
        success: false,
        message: "Area not found"
      });
    }

    const area = geoData[0].display_name.split(",")[0];

    return res.json({
      success: true,
      area
    });

  } catch (err) {
    console.error("📍 AREA ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Area detection failed"
    });
  }
});

/* =========================================
   POST GPS → PINCODE
   POST /api/location/nearby-stores
========================================= */
router.post("/nearby-stores", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: "Latitude & longitude required"
      });
    }

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: { "User-Agent": "LocalBasket/1.0" }
      }
    );

    const geoData = await geoRes.json();
    const pincode = geoData?.address?.postcode || "";
    const area =
      geoData?.address?.suburb ||
      geoData?.address?.city ||
      geoData?.address?.town ||
      "";

    return res.json({
      success: true,
      pincode,
      area
    });

  } catch (err) {
    console.error("📍 LOCATION ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Location service failed"
    });
  }
});

module.exports = router;
