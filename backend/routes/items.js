const { Item, validate } = require("../models/item");

const express = require("express");
const router = express.Router();
const _ = require("lodash");

const Redis = require("redis");
const reportError = require("../services/reportError");
const redisClient = Redis.createClient();
const DEFAULT_EXPIRATION = 86400000;

router.get("/", async (req, res) => {
  // throw new Error("CCCCCCC");

  redisClient.get("items", async (error, items) => {
    if (error)
      reportError("Redis server doest not set up or something error", error);
    if (items != null) {
      res.send(JSON.parse(items));
    } else {
      const storeItems = await Item.find().sort("title");

      redisClient.setex(
        "items",
        DEFAULT_EXPIRATION,
        JSON.stringify(storeItems)
      );
      res.send(storeItems);
    }
  });
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let item = new Item(
    _.pick(req.body, ["image", "title", "price", "info", "collectionType"])
  );
  item = await item.save();

  res.send(item);
});

router.put("/:id", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const item = await Item.findByIdAndUpdate(
    req.params.id,
    _.pick(req.body, ["image", "title", "price", "info", "collectionType"]),
    {
      new: true,
    }
  );

  if (!item)
    return res.status(404).send("The item with the given ID was not found.");

  res.send(item);
});

router.delete("/:id", async (req, res) => {
  const item = await Item.findByIdAndRemove(req.params.id);

  if (!item)
    return res.status(404).send("The item with the given ID was not found.");

  res.send(item);
});

router.get("/:id", async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item)
    return res.status(404).send("The item with the given ID was not found.");

  res.send(item);
});

module.exports = router;
