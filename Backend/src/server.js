import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import pool from "./configs/database.js";

// Health
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT current_database()");
    res.json({ status: "ok", database: result.rows[0].current_database });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));
