const auth = require("../middleware/auth");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const { User, validate } = require("../models/user");

const express = require("express");
const router = express.Router();

const confirmation = require("../services/emailConfirmation");
const checkPending = require("../services/checkPending");
//for security reason
router.put("/me", async (req, res) => {
  const user = await User.findById(req.body._id).select("-password"); //don't want to show the password
  if (!user) return res.status(404).send("User not found");

  // console.log(req.cookies);
  res.send(user);
});

// user registers
router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });

  if (user) return res.status(400).send("User already registered.");

  user = new User(_.pick(req.body, ["name", "email", "password", "carts"]));

  const salt = await bcrypt.genSalt(10);

  user.password = await bcrypt.hash(user.password, salt);
  user.confirmationCode = generateID();

  await user.save();

  confirmation(
    req.body.email,
    `Open http://localhost:5000/api/users/confirmation/${user.confirmationCode}/${user._id}`
  );
  res.send("Open Your Email");
});

// user logins in
router.put("/login/:email", async (req, res) => {
  const email = req.params.email;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).send("User Not Found");

  if (!checkPending(user, res)) {
    bcrypt.compare(
      req.body.password,
      user.password,
      async function (error, result) {
        if (result) {
          if (req.body.carts) {
            let newCarts = [];

            req.body.carts.forEach((item) => {
              let isExist = false;
              user.carts.forEach((userCartItem) => {
                if (item._id === userCartItem._id) {
                  userCartItem.count = item.count + userCartItem.count;
                  newCarts.push(userCartItem);
                  isExist = true;
                }
              });
              if (!isExist) {
                newCarts.push(item);
              }
            });
            user.carts = newCarts;

            await user.save();
          }
          const token = user.generateAuthToken();
          res.cookie("x-auth-token", token, {
            secure: process.env.NODE_ENV !== "development",
            httpOnly: true,
            //   expires: dayjs().add(30, "days").toDate(),
          });

          res.send(_.pick(user, ["_id", "name", "email", "carts"]));
        } else {
          res.status(404).send("User Not Found");
        }
      }
    );
  }
});

// user adds a shopping cart item
router.put("/addItem", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).send("User Not Found");
  if (!checkPending(user, res)) {
    const newItems = [];
    user.carts.forEach((item) => {
      if (item._id === req.body._id) {
        item.count += req.body.count;
      }
      newItems.push(item);
    });
    user.carts = newItems;
    await user.save();
    res.send("success");
  }
});

router.get("/userInfo", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).send("User Not Found");
  if (!checkPending(user, res)) {
    res.send(user.carts);
  }
});

router.delete("/clearCartItem", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).send("User Not Found");
  if (!checkPending(user, res)) {
    user.carts = [];
    await user.save();
    //need to change the return message
    res.send("success");
  }
});

router.get("/confirmation/:id/:userID", async (req, res) => {
  const user = await User.findById(req.params.userID);
  if (!user) return res.status(404).send("User not found");
  if (user.confirmationCode === req.params.id) {
    user.status = "Active";
    await user.save();
    const token = user.generateAuthToken();
    res.cookie("x-auth-token", token, {
      secure: process.env.NODE_ENV !== "development",
      httpOnly: true,
      //   expires: dayjs().add(30, "days").toDate(),
    });

    res.send(_.pick(user, ["_id", "name", "email", "carts"]));
  } else {
    res.status(400).send("Your confirmation code is invalid");
  }
});

// forgot password
router.put("/forgot", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).send("User not found");
  }
  user.changePasswordCode = generateID();

  await user.save();

  confirmation(
    req.body.email,
    `Your code is ${user.changePasswordCode}. `,
    "Your user information"
  );
  res.send("Open your email to get your code");
});

router.put("/forgot/:codeID", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).send("User not found");
  if (user.changePasswordCode === req.params.codeID) {
    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(req.body.password, salt);
    await user.save();
    return res.send("Your password has been changed");
  }
  res.status(400).send("Invalid confirmation code");
});

//Generate Confirmation ID
function generateID() {
  var key = {
    i: "w",
    l: "x",
    o: "y",
    u: "z",
  };
  var randomInt = Math.floor(Math.random() * 1e9);
  console.log(
    randomInt.toString(32).replace(/[ilou]/, function (a) {
      return key[a];
    })
  );
  return randomInt.toString(32).replace(/[ilou]/, function (a) {
    return key[a];
  });
}
module.exports = router;
