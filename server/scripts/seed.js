/**
 * Database Seeder for FitWise Platform.
 * Idempotent script that seeds:
 *  - 1 Demo Store with SHA-256 hashed publishable and secret keys
 *  - 1 Running A/B Experiment
 *  - 8 Products across all 4 categories (tshirt, jeans, kurta, blouse) and regions (US, UK, EU, IN)
 *  - 300 Sample Purchases with realistic return reasons (including 2 products that clearly run small)
 */

import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, disconnectDB } from "../src/config/db.js";
import {
  Store,
  Experiment,
  Product,
  Purchase,
  User,
  Recommendation,
  ChartFlag,
  Group,
  Journal,
  Event,
} from "../src/models/index.js";

// Demo API Credentials
export const DEMO_STORE_ID = "store_fitwise_demo";
export const DEMO_PUBLISHABLE_KEY = "fw_pub_demo_984f1a23c7e0";
export const DEMO_SECRET_KEY = "fw_sec_demo_a41b89c372ef";

const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

// 8 Products across tshirt, jeans, kurta, blouse and regions US, UK, EU, IN
export const SEED_PRODUCTS = [
  // 1. T-Shirt - Regular (US)
  {
    sku: "SKU-TSHIRT-CLASSIC",
    name: "Classic Crewneck Tee",
    imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800",
    brand: "UrbanClassic",
    category: "tshirt",
    region: "US",
    sizeChart: [
      { size: "XS", chest: [84, 89], waist: [70, 75] },
      { size: "S", chest: [89, 94], waist: [75, 80] },
      { size: "M", chest: [94, 99], waist: [80, 85] },
      { size: "L", chest: [99, 104], waist: [85, 90] },
      { size: "XL", chest: [104, 110], waist: [90, 96] },
      { size: "XXL", chest: [110, 118], waist: [96, 104] },
    ],
    flagCount: 0,
  },
  // 2. T-Shirt - Slim / Runs Small (EU)
  {
    sku: "SKU-TSHIRT-SLIM",
    name: "Slim Fit Stretch Tee",
    imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
    brand: "EuroFit",
    category: "tshirt",
    region: "EU",
    sizeChart: [
      { size: "XS", chest: [80, 85], waist: [66, 71] },
      { size: "S", chest: [85, 90], waist: [71, 76] },
      { size: "M", chest: [90, 95], waist: [76, 81] },
      { size: "L", chest: [95, 100], waist: [81, 86] },
      { size: "XL", chest: [100, 106], waist: [86, 92] },
      { size: "XXL", chest: [106, 114], waist: [92, 100] },
    ],
    flagCount: 1,
  },
  // 3. Jeans - Regular (US)
  {
    sku: "SKU-JEANS-REGULAR",
    name: "Oversized Denim Jacket",
    imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800",
    brand: "DenimCraft",
    category: "jeans",
    region: "US",
    sizeChart: [
      { size: "XS", waist: [68, 73], hip: [88, 93] },
      { size: "S", waist: [73, 78], hip: [93, 98] },
      { size: "M", waist: [78, 84], hip: [98, 104] },
      { size: "L", waist: [84, 90], hip: [104, 110] },
      { size: "XL", waist: [90, 97], hip: [110, 117] },
      { size: "XXL", waist: [97, 106], hip: [117, 126] },
    ],
    flagCount: 0,
  },
  // 4. Jeans - Skinny / Runs Small (UK)
  {
    sku: "SKU-JEANS-SKINNY",
    name: "Skinny High-Rise Jeans",
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
    brand: "LondonDenim",
    category: "jeans",
    region: "UK",
    sizeChart: [
      { size: "XS", waist: [64, 69], hip: [84, 89] },
      { size: "S", waist: [69, 74], hip: [89, 94] },
      { size: "M", waist: [74, 80], hip: [94, 100] },
      { size: "L", waist: [80, 86], hip: [100, 106] },
      { size: "XL", waist: [86, 93], hip: [106, 113] },
      { size: "XXL", waist: [93, 102], hip: [113, 122] },
    ],
    flagCount: 1,
  },
  // 5. Kurta - Anarkali (IN)
  {
    sku: "SKU-KURTA-ANARKALI",
    name: "Anarkali Embroidered Kurta",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
    brand: "Rivaaz",
    category: "kurta",
    region: "IN",
    sizeChart: [
      { size: "XS", shoulder: [36, 38], bust: [80, 85], length: [96, 100] },
      { size: "S", shoulder: [38, 40], bust: [85, 90], length: [99, 103] },
      { size: "M", shoulder: [40, 42], bust: [90, 96], length: [102, 106] },
      { size: "L", shoulder: [42, 44], bust: [96, 102], length: [105, 109] },
      { size: "XL", shoulder: [44, 46], bust: [102, 109], length: [108, 112] },
      { size: "XXL", shoulder: [46, 48], bust: [109, 117], length: [111, 115] },
    ],
    flagCount: 0,
  },
  // 6. Kurta - Straight Cut (IN)
  {
    sku: "SKU-KURTA-STRAIGHT",
    name: "Straight Cut Cotton Kurta",
    imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800",
    brand: "VedicVibe",
    category: "kurta",
    region: "IN",
    sizeChart: [
      { size: "XS", shoulder: [37, 39], bust: [82, 87], length: [98, 102] },
      { size: "S", shoulder: [39, 41], bust: [87, 92], length: [101, 105] },
      { size: "M", shoulder: [41, 43], bust: [92, 98], length: [104, 108] },
      { size: "L", shoulder: [43, 45], bust: [98, 104], length: [107, 111] },
      { size: "XL", shoulder: [45, 47], bust: [104, 111], length: [110, 114] },
      { size: "XXL", shoulder: [47, 49], bust: [111, 119], length: [113, 117] },
    ],
    flagCount: 0,
  },
  // 7. Blouse - Silk (IN)
  {
    sku: "SKU-BLOUSE-SILK",
    name: "Pure Silk Traditional Blouse",
    imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800",
    brand: "HeritageSilk",
    category: "blouse",
    region: "IN",
    sizeChart: [
      { size: "XS", bust: [78, 83], waist: [62, 67], shoulder: [34, 36] },
      { size: "S", bust: [83, 88], waist: [67, 72], shoulder: [36, 38] },
      { size: "M", bust: [88, 94], waist: [72, 78], shoulder: [38, 40] },
      { size: "L", bust: [94, 100], waist: [78, 84], shoulder: [40, 42] },
      { size: "XL", bust: [100, 107], waist: [84, 91], shoulder: [42, 44] },
      { size: "XXL", bust: [107, 115], waist: [91, 99], shoulder: [44, 46] },
    ],
    flagCount: 0,
  },
  // 8. Blouse - Cotton (US)
  {
    sku: "SKU-BLOUSE-COTTON",
    name: "Summer Cotton Day Blouse",
    imageUrl: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800",
    brand: "UrbanClassic",
    category: "blouse",
    region: "US",
    sizeChart: [
      { size: "XS", bust: [80, 85], waist: [64, 69], shoulder: [35, 37] },
      { size: "S", bust: [85, 90], waist: [69, 74], shoulder: [37, 39] },
      { size: "M", bust: [90, 96], waist: [74, 80], shoulder: [39, 41] },
      { size: "L", bust: [96, 102], waist: [80, 86], shoulder: [41, 43] },
      { size: "XL", bust: [102, 109], waist: [86, 93], shoulder: [43, 45] },
      { size: "XXL", bust: [109, 117], waist: [93, 101], shoulder: [45, 47] },
    ],
    flagCount: 0,
  },
];

/**
 * Generate 300 purchases with realistic kept/return ratios.
 * Specifically, SKU-TSHIRT-SLIM and SKU-JEANS-SKINNY clearly "run small" with high too_small returns.
 */
export const generateSamplePurchases = () => {
  const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
  const RETURN_REASONS = ["too_small", "too_large", "style", "quality", "other"];
  const purchases = [];

  // 1. Generate 50 purchases for SKU-TSHIRT-SLIM (runs small)
  for (let i = 0; i < 50; i++) {
    const sizeBought = i < 35 ? "M" : "S";
    // 38% returned, and 85% of returns are 'too_small'
    const isReturned = i % 10 < 4;
    const kept = !isReturned;
    const returnReason = isReturned
      ? i % 10 !== 3
        ? "too_small"
        : "style"
      : null;
    const variant = i % 2 === 0 ? "treatment" : "control";

    purchases.push({
      storeId: DEMO_STORE_ID,
      userId: `usr_${1001 + (i % 30)}`,
      sku: "SKU-TSHIRT-SLIM",
      sizeBought,
      kept,
      returnReason,
      variant,
      createdAt: new Date(Date.now() - (50 - i) * 12 * 3600 * 1000),
    });
  }

  // 2. Generate 50 purchases for SKU-JEANS-SKINNY (runs small)
  for (let i = 0; i < 50; i++) {
    const sizeBought = i < 35 ? "M" : i % 2 === 0 ? "S" : "L";
    // 36% returned, 80% are 'too_small'
    const isReturned = i % 10 < 4;
    const kept = !isReturned;
    const returnReason = isReturned
      ? i % 5 !== 0
        ? "too_small"
        : "quality"
      : null;
    const variant = i % 2 === 0 ? "treatment" : "control";

    purchases.push({
      storeId: DEMO_STORE_ID,
      userId: `usr_${1020 + (i % 30)}`,
      sku: "SKU-JEANS-SKINNY",
      sizeBought,
      kept,
      returnReason,
      variant,
      createdAt: new Date(Date.now() - (50 - i) * 11 * 3600 * 1000),
    });
  }

  // 3. Generate remaining 200 purchases across other 6 products (healthy ~88% keep rate)
  const regularSkus = [
    "SKU-TSHIRT-CLASSIC",
    "SKU-JEANS-REGULAR",
    "SKU-KURTA-ANARKALI",
    "SKU-KURTA-STRAIGHT",
    "SKU-BLOUSE-SILK",
    "SKU-BLOUSE-COTTON",
  ];

  for (let i = 0; i < 200; i++) {
    const sku = regularSkus[i % regularSkus.length];
    const sizeBought = SIZES[i % SIZES.length];
    // ~12% returned
    const isReturned = i % 8 === 0;
    const kept = !isReturned;
    const returnReason = isReturned ? RETURN_REASONS[i % RETURN_REASONS.length] : null;
    const variant = i % 2 === 0 ? "treatment" : "control";

    purchases.push({
      storeId: DEMO_STORE_ID,
      userId: `usr_${1000 + (i % 60)}`,
      sku,
      sizeBought,
      kept,
      returnReason,
      variant,
      createdAt: new Date(Date.now() - (200 - i) * 6 * 3600 * 1000),
    });
  }

  return purchases;
};

export const seedDatabase = async (customUri, { closeConnection = false } = {}) => {
  console.log("==================================================");
  console.log("🌱 FitWise Database Seeder Starting...");
  console.log("==================================================");

  // 1. Print API Keys once to stdout as required
  console.log("\n🔑 Demo API Keys (Keep these safe for widget & dashboard testing):");
  console.log(`   PUBLISHABLE KEY: ${DEMO_PUBLISHABLE_KEY}`);
  console.log(`   SECRET KEY     : ${DEMO_SECRET_KEY}`);
  console.log("   (Storing only SHA-256 hashes in database per API contract §2.1)\n");

  // 2. Connect to database
  await connectDB(customUri);

  try {
    // 3. Seed Demo Store (Idempotent upsert)
    const pubHash = hashKey(DEMO_PUBLISHABLE_KEY);
    const secHash = hashKey(DEMO_SECRET_KEY);

    await Store.findOneAndUpdate(
      { storeId: DEMO_STORE_ID },
      {
        storeId: DEMO_STORE_ID,
        name: "FitWise Flagship Store",
        ownerName: "Riya Jayaswal",
        website: "https://demo.fitwise.store",
        publicKeyHash: pubHash,
        secretKeyHash: secHash,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Seeded Store: '${DEMO_STORE_ID}'`);

    // 4. Seed A/B Experiments (1 Running, 1 Completed, 1 Paused)
    const experimentsData = [
      {
        experimentId: "exp_fitwise_ab_01",
        storeId: DEMO_STORE_ID,
        name: "Sizing Widget Enablement",
        description: "Compare conversion and return rates with FitWise sizing widget enabled vs disabled.",
        type: "widget_toggle",
        goal: "conversion_rate",
        variants: {
          a: { label: "Widget Hidden" },
          b: { label: "Widget Active" },
        },
        split: 0.5,
        status: "running",
        startedAt: new Date("2026-09-10T00:00:00.000Z"),
      },
      {
        experimentId: "exp_fitwise_ab_02",
        storeId: DEMO_STORE_ID,
        name: "Modal vs Drawer Widget Design",
        description: "Test compact bottom drawer versus centered modal design for size recommendations.",
        type: "widget_design",
        goal: "add_to_cart_rate",
        variants: {
          a: { label: "Centered Modal" },
          b: { label: "Slide-in Drawer" },
        },
        split: 0.5,
        status: "completed",
        startedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      {
        experimentId: "exp_fitwise_ab_03",
        storeId: DEMO_STORE_ID,
        name: "Placement Relative to Buy Button",
        description: "Evaluate sizing widget badge placement directly above or below the primary purchase button.",
        type: "widget_placement",
        goal: "return_rate",
        variants: {
          a: { label: "Above CTA Button" },
          b: { label: "Below CTA Button" },
        },
        split: 0.5,
        status: "paused",
        startedAt: new Date("2026-08-20T00:00:00.000Z"),
      },
    ];

    for (const exp of experimentsData) {
      await Experiment.findOneAndUpdate(
        { experimentId: exp.experimentId },
        exp,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`✅ Seeded ${experimentsData.length} Experiments (1 Running, 1 Completed, 1 Paused)`);

    // Seed realistic telemetry events for experiments
    await Event.deleteMany({
      experimentId: { $in: ["exp_fitwise_ab_01", "exp_fitwise_ab_02"] },
    });

    const expEvents = [];
    // exp_fitwise_ab_01: Control (150 visitors, 30 atc, 18 purchases, 5 returns)
    //                     Treatment (160 visitors, 45 atc, 31 purchases, 4 returns)
    for (let c = 0; c < 150; c++) {
      const vId = `c_vis_${c}`;
      expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "control", type: "widget_shown" });
      if (c < 30) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "control", type: "add_to_cart" });
      if (c < 18) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "control", type: "purchase" });
      if (c < 5) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "control", type: "return" });
    }
    for (let t = 0; t < 160; t++) {
      const vId = `t_vis_${t}`;
      expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "treatment", type: "widget_shown" });
      if (t < 45) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "treatment", type: "add_to_cart" });
      if (t < 31) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "treatment", type: "purchase" });
      if (t < 4) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_01", variant: "treatment", type: "return" });
    }

    // exp_fitwise_ab_02: Control (120 visitors, 24 atc, 14 purchases, 3 returns)
    //                     Treatment (125 visitors, 38 atc, 21 purchases, 3 returns)
    for (let c = 0; c < 120; c++) {
      const vId = `c_exp2_${c}`;
      expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "control", type: "widget_shown" });
      if (c < 24) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "control", type: "add_to_cart" });
      if (c < 14) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "control", type: "purchase" });
      if (c < 3) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "control", type: "return" });
    }
    for (let t = 0; t < 125; t++) {
      const vId = `t_exp2_${t}`;
      expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "treatment", type: "widget_shown" });
      if (t < 38) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "treatment", type: "add_to_cart" });
      if (t < 21) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "treatment", type: "purchase" });
      if (t < 3) expEvents.push({ storeId: DEMO_STORE_ID, visitorId: vId, experimentId: "exp_fitwise_ab_02", variant: "treatment", type: "return" });
    }

    await Event.insertMany(expEvents);
    console.log(`✅ Seeded ${expEvents.length} Experiment Events`);

    // 5. Seed 8 Products (Idempotent upserts)
    console.log("📦 Seeding 8 products across 4 categories and regions (US, UK, EU, IN)...");
    for (const prod of SEED_PRODUCTS) {
      await Product.findOneAndUpdate(
        { sku: prod.sku },
        prod,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`✅ Seeded 8 Products (including 'SKU-TSHIRT-SLIM' & 'SKU-JEANS-SKINNY' which run small)`);

    // 6. Seed Purchases & Recommendations with realistic status mix:
    // ~30% pending (90), ~50% kept (150), ~20% returned (60)
    const allSkus = SEED_PRODUCTS.map((p) => p.sku);
    await Purchase.deleteMany({ sku: { $in: allSkus } });
    await Recommendation.deleteMany({ storeId: DEMO_STORE_ID });

    const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
    const sampleRecs = [];
    const purchaseDocs = [];

    for (let i = 0; i < 300; i++) {
      const sku = allSkus[i % allSkus.length];
      const userId = `usr_${1000 + (i % 65)}`;
      const size = SIZES[(i + 2) % SIZES.length];
      const isKurta = sku.includes("KURTA");
      const confidence = isKurta && (i % 3 === 0)
        ? 0.42
        : Number((0.85 + (i % 14) * 0.01).toFixed(2));

      // Spread across the last 60 days
      const recDate = new Date(Date.now() - (299 - i) * 4.8 * 3600 * 1000);

      // Mix: 30% pending, 50% kept, 20% returned
      const mod = i % 10;
      let status = "kept";
      if (mod === 0 || mod === 4 || mod === 7) {
        status = "pending";
      } else if (mod === 3 || mod === 6) {
        status = "returned";
      }

      sampleRecs.push({
        storeId: DEMO_STORE_ID,
        userId,
        sku,
        predictedSize: size,
        confidence,
        status,
        createdAt: recDate,
      });

      if (status === "kept") {
        purchaseDocs.push({
          storeId: DEMO_STORE_ID,
          userId,
          sku,
          sizeBought: size,
          kept: true,
          returnReason: null,
          variant: i % 2 === 0 ? "treatment" : "control",
          createdAt: new Date(recDate.getTime() + 15 * 60 * 1000),
        });
      } else if (status === "returned") {
        const isSizeDiscrepant = sku === "SKU-TSHIRT-SLIM" || sku === "SKU-JEANS-SKINNY";
        purchaseDocs.push({
          storeId: DEMO_STORE_ID,
          userId,
          sku,
          sizeBought: size,
          kept: false,
          returnReason: isSizeDiscrepant ? "too_small" : (i % 2 === 0 ? "too_small" : "style"),
          variant: i % 2 === 0 ? "treatment" : "control",
          createdAt: new Date(recDate.getTime() + 15 * 60 * 1000),
        });
      }
    }

    // Additional purchases to guarantee Chart Doctor threshold (>= 30 orders, >= 25% too_small)
    for (let k = 0; k < 15; k++) {
      const isSmall = k < 10;
      const extraDate = new Date(Date.now() - (15 - k) * 36 * 3600 * 1000);
      purchaseDocs.push({
        storeId: DEMO_STORE_ID,
        userId: `usr_extra_slim_${k}`,
        sku: "SKU-TSHIRT-SLIM",
        sizeBought: "M",
        kept: !isSmall,
        returnReason: isSmall ? "too_small" : null,
        variant: k % 2 === 0 ? "treatment" : "control",
        createdAt: extraDate,
      });
      purchaseDocs.push({
        storeId: DEMO_STORE_ID,
        userId: `usr_extra_jeans_${k}`,
        sku: "SKU-JEANS-SKINNY",
        sizeBought: "M",
        kept: !isSmall,
        returnReason: isSmall ? "too_small" : null,
        variant: k % 2 === 0 ? "treatment" : "control",
        createdAt: extraDate,
      });
    }

    // Direct store purchases to bring total store purchases to exactly 300
    const regularSkusList = allSkus.filter(
      (s) => s !== "SKU-TSHIRT-SLIM" && s !== "SKU-JEANS-SKINNY"
    );
    for (let m = 0; m < 60; m++) {
      const sku = regularSkusList[m % regularSkusList.length];
      const extraDate = new Date(Date.now() - (60 - m) * 18 * 3600 * 1000);
      purchaseDocs.push({
        storeId: DEMO_STORE_ID,
        userId: `usr_store_direct_${m}`,
        sku,
        sizeBought: SIZES[m % SIZES.length],
        kept: true,
        returnReason: null,
        variant: m % 2 === 0 ? "treatment" : "control",
        createdAt: extraDate,
      });
    }

    await Purchase.insertMany(purchaseDocs);
    console.log(`✅ Seeded ${purchaseDocs.length} Sample Purchases with return reasons`);

    await Recommendation.insertMany(sampleRecs);
    console.log(`✅ Seeded ${sampleRecs.length} Sample Recommendations (90 Pending, 150 Kept, 60 Returned)`);

    // 7. Seed ChartFlags for products with size issues
    await ChartFlag.deleteMany({});
    const flags = await ChartFlag.create([
      {
        sku: "SKU-TSHIRT-SLIM",
        size: "M",
        direction: "runs_small",
        sampleSize: 50,
        returnShare: 0.38,
        suggestedFix: "38% of size M orders were returned as too small (50 orders evaluated).",
      },
      {
        sku: "SKU-TSHIRT-CLASSIC",
        size: "S",
        direction: "runs_small",
        sampleSize: 35,
        returnShare: 0.29,
        suggestedFix: "29% of size S orders were returned as too small (35 orders evaluated).",
      },
      {
        sku: "SKU-BLOUSE-COTTON",
        size: "M",
        direction: "runs_large",
        sampleSize: 30,
        returnShare: 0.27,
        suggestedFix: "27% of size M orders were returned as too large (30 orders evaluated).",
      },
    ]);
    await Product.updateOne({ sku: "SKU-TSHIRT-SLIM" }, { flagCount: 1 });
    await Product.updateOne({ sku: "SKU-TSHIRT-CLASSIC" }, { flagCount: 1 });
    await Product.updateOne({ sku: "SKU-BLOUSE-COTTON" }, { flagCount: 1 });
    console.log(`✅ Seeded ${flags.length} Chart Doctor Flags (Slim tee, Classic tee, Cotton blouse)`);

    // 8. Seed 6 Demo Community Groups
    await Group.deleteMany({ isDemo: true });
    const demoGroups = [
      {
        name: "Denim Enthusiasts & Fit Guide",
        description: "Generic discussion group for denim cut comparisons, waist rise measurements, and shrink-to-fit sizing advice.",
        category: "jeans",
        memberCount: 142,
        imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
        joined: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
      },
      {
        name: "T-Shirt Styling & Everyday Basics",
        description: "Generic community group sharing everyday crewneck cuts, heavyweight cotton weights, and wash care tips.",
        category: "tshirt",
        memberCount: 98,
        imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
        joined: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
      },
      {
        name: "Traditional Ethnic Wear & Silhouettes",
        description: "Generic community group covering kurta silhouettes, lengths, chest margins, and shoulder measurement advice.",
        category: "kurta",
        memberCount: 76,
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
        joined: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
      },
      {
        name: "Formal Blouses & Tailored Tops",
        description: "Generic styling group for structured office wear, button gap prevention, and bust dimension guidance.",
        category: "blouse",
        memberCount: 54,
        imageUrl: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800",
        joined: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
      },
      {
        name: "Sustainable Wardrobe & Sizing Longevity",
        description: "Generic tips on precision sizing to reduce return waste and choose durable garments that fit over time.",
        category: "general",
        memberCount: 185,
        imageUrl: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800",
        joined: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
      },
      {
        name: "Petite & Plus Fit Collective",
        description: "Generic inclusive fit community exploring cross-regional standard size chart comparisons and proportions.",
        category: "general",
        memberCount: 112,
        imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800",
        joined: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
      },
    ];
    await Group.insertMany(demoGroups);
    console.log(`✅ Seeded ${demoGroups.length} Demo Community Groups (marked isDemo: true)`);

    // 9. Seed 3 Demo Journals
    await Journal.deleteMany({ isDemo: true });
    const demoJournals = [
      {
        title: "How We Calibrate Size Charts for Cross-Regional Shoppers",
        authorName: "FitWise Editorial",
        excerpt: "Generic walkthrough of standard chest and waist mapping between US, UK, EU, and IN sizing systems.",
        body: "Accurate size charts require accounting for regional body profile differences. In this demo journal entry, we discuss how our machine learning models translate measurements across regional sizing systems and why bust and shoulder measurements require special care in tailored garments.",
        tags: ["sizing", "size-charts", "fit-guide"],
        likes: 24,
        liked: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
      {
        title: "5 Simple Adjustments That Reduced Our Return Rate by 12%",
        authorName: "Riya Jayaswal",
        excerpt: "Generic notes from store operations on updating product descriptions and garment measurements.",
        body: "By analyzing return reason feedback from shoppers citing 'too small' and calibrating our size charts with Chart Doctor recommendations, we reduced size-related returns by 12% over a 30-day window. This demo article highlights key steps for merchants.",
        tags: ["returns", "chart-doctor", "case-study"],
        likes: 48,
        liked: true,
        isDemo: true,
        storeId: DEMO_STORE_ID,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
      {
        title: "The Complete Measurement Guide for Ethnic Wear",
        authorName: "FitWise Editorial",
        excerpt: "Generic guide on standard shoulder, bust, and garment length measurements for kurtas and anarkalis.",
        body: "Ethnic wear like kurtas requires precise shoulder and bust measurements rather than generic chest widths. This demo post breaks down the standard guidelines for adding measurement illustrations to product pages to eliminate shopper sizing doubts.",
        tags: ["ethnic-wear", "kurta", "measurements"],
        likes: 19,
        liked: false,
        isDemo: true,
        storeId: DEMO_STORE_ID,
        createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000),
      },
    ];
    await Journal.insertMany(demoJournals);
    console.log(`✅ Seeded ${demoJournals.length} Demo Journals (marked isDemo: true)`);

    // Summary of run small verification
    const slimReturns = purchaseDocs.filter((p) => p.sku === "SKU-TSHIRT-SLIM" && !p.kept);
    const slimSmall = slimReturns.filter((p) => p.returnReason === "too_small");
    console.log(
      `   * SKU-TSHIRT-SLIM: ${slimReturns.length} returns (${slimSmall.length} cited 'too_small')`
    );

    const jeansReturns = purchaseDocs.filter((p) => p.sku === "SKU-JEANS-SKINNY" && !p.kept);
    const jeansSmall = jeansReturns.filter((p) => p.returnReason === "too_small");
    console.log(
      `   * SKU-JEANS-SKINNY: ${jeansReturns.length} returns (${jeansSmall.length} cited 'too_small')`
    );

    console.log("\n==================================================");
    console.log("✨ FitWise Database Seeding Completed Successfully!");
    console.log("==================================================");
  } finally {
    if (closeConnection) {
      await disconnectDB();
    }
  }
};

// Execute if run directly
const isMainModule =
  path.resolve(process.argv[1]).toLowerCase() ===
  fileURLToPath(import.meta.url).toLowerCase();

if (isMainModule) {
  // Pass closeConnection: true so disconnectDB() is called in the finally block
  seedDatabase(process.env.MONGO_URI, { closeConnection: true })
    .then(() => {
      console.log("✨ Seeding process finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}

export default seedDatabase;
