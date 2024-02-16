const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

mongoose.connect("mongodb://localhost/smsmagic", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  email: {
    type: String,
    unique: true,
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: { type: String, required: true, match: /^[0-9]+$/ },
  role: String, // Assuming you have a role field for user roles
});

const companySchema = new mongoose.Schema({
  name: String,
  employees: Number,
  industry: String,
  revenue: Number,
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const clientSchema = new mongoose.Schema({
  name: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  email: {
    type: String,
    unique: true,
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: { type: String, required: true, match: /^[0-9]+$/ },
});

const clientUserSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
});

const User = mongoose.model("User", userSchema);
const Company = mongoose.model("Company", companySchema);
const Client = mongoose.model("Client", clientSchema);
const ClientUser = mongoose.model("ClientUser", clientUserSchema);

app.use(cors());
app.use(express.json());

// Middleware to check user role
const checkAdminRole = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "ROLE_ADMIN") {
    return res
      .status(403)
      .json({ error: "Access forbidden. Only ROLE_ADMIN users are allowed." });
  }
  next();
};

// Middleware to validate email format
const validateEmailFormat = (req, res, next) => {
  const user = req.user;
  if (!user || !isValidEmail(user.email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }
  next();
};

// Helper function to validate email format using regex
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Search for companies by employees range
app.get("/companies/:minEmployees/:maxEmployees", async (req, res) => {
  try {
    const { minEmployees, maxEmployees } = req.params;
    const companies = await Company.find({
      employees: { $gte: parseInt(minEmployees), $lte: parseInt(maxEmployees) },
    });
    res.json(companies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Search for clients by user or company name
app.get("/clients", async (req, res) => {
  try {
    const { user, name } = req.query;
    const query = {};

    if (user) {
      query.user = user;
    }

    if (name) {
      query.name = { $regex: new RegExp(name, "i") };
    }

    const clients = await Client.find(query);
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Using aggregation to get companies with max revenue in their industry
app.get("/max-revenue-companies", async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$industry",
          maxRevenue: { $max: "$revenue" },
        },
      },
      {
        $lookup: {
          from: "companies",
          let: { industry: "$_id", maxRevenue: "$maxRevenue" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$industry", "$$industry"] },
                    { $eq: ["$revenue", "$$maxRevenue"] },
                  ],
                },
              },
            },
          ],
          as: "maxRevenueCompanies",
        },
      },
      {
        $unwind: "$maxRevenueCompanies",
      },
    ];

    const maxRevenueCompanies = await Company.aggregate(pipeline);
    res.json(maxRevenueCompanies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// GET user profile endpoint with email validation
app.get("/user/profile", validateEmailFormat, (req, res) => {
  const user = req.user;
  res.json({ username: user.username, email: user.email, phone: user.phone });
});

// Create Client endpoint with role-based access control
app.post("/clients", checkAdminRole, async (req, res) => {
  try {
    const { name, user, company, email, phone } = req.body;
    const existingClient = await Client.findOne({ company });

    if (existingClient) {
      return res
        .status(400)
        .json({ error: "Company name is already taken by another client" });
    }

    const newClient = new Client({ name, user, company, email, phone });
    await newClient.save();
    res.json(newClient);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
