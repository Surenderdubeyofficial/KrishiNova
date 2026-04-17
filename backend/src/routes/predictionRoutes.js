import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runMlScript } from "../utils/pythonRunner.js";

const router = Router();

router.post(
  "/crop-prediction",
  asyncHandler(async (req, res) => {
    const { state, district, season } = req.body;
    const rawResult = await runMlScript("ML/crop_prediction/ZDecision_Tree_Model_Call.py", [
      state,
      district,
      season,
    ]);
    const crops = rawResult
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && line !== ",");
    res.json({ result: crops.join(", "), crops });
  }),
);

router.post(
  "/crop-recommendation",
  asyncHandler(async (req, res) => {
    const { n, p, k, temperature, humidity, ph, rainfall } = req.body;
    const result = await runMlScript("ML/crop_recommendation/recommend.py", [
      JSON.stringify(Number(n)),
      JSON.stringify(Number(p)),
      JSON.stringify(Number(k)),
      JSON.stringify(Number(temperature)),
      JSON.stringify(Number(humidity)),
      JSON.stringify(Number(ph)),
      JSON.stringify(Number(rainfall)),
    ]);
    res.json({ result });
  }),
);

router.post(
  "/fertilizer-recommendation",
  asyncHandler(async (req, res) => {
    const { n, p, k, temperature, humidity, soilMoisture, soilType, cropType } = req.body;
    const result = await runMlScript("ML/fertilizer_recommendation/fertilizer_recommendation.py", [
      String(Number(n)),
      String(Number(p)),
      String(Number(k)),
      String(Number(temperature)),
      String(Number(humidity)),
      String(Number(soilMoisture)),
      soilType,
      cropType,
    ]);
    res.json({ result });
  }),
);

router.post(
  "/rainfall",
  asyncHandler(async (req, res) => {
    const { subdivision, month } = req.body;
    const result = await runMlScript("ML/rainfall_prediction/rainfall_prediction.py", [
      subdivision,
      month,
    ]);
    res.json({ result });
  }),
);

router.post(
  "/yield",
  asyncHandler(async (req, res) => {
    const { state, district, season, crop, area } = req.body;
    const result = await runMlScript("ML/yield_prediction/yield_prediction.py", [
      state,
      district,
      season,
      crop,
      String(Number(area)),
    ]);
    res.json({ result });
  }),
);

export default router;
