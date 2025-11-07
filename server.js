// ===============================
// 📘 SERVER.JS - Bookstore Backend
// ===============================

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const port = 3000;

app.use("/assets", express.static("assets"));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // phục vụ file HTML tĩnh

// -------------------------------
// 🔗 Kết nối database MySQL (Laragon)
// -------------------------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",       // mặc định Laragon user = root
  password: "",       // mặc định Laragon password = rỗng
  database: "bookstore", // đúng tên database của bạn
});

db.connect((err) => {
  if (err) {
    console.error("❌ Lỗi kết nối MySQL:", err);
  } else {
    console.log("✅ Kết nối thành công tới MySQL (bookstore)");
  }
});

// -------------------------------
// 🏠 Route trang chính
// -------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// -------------------------------
// 📚 API: Lấy danh sách sách
// -------------------------------
app.get("/api/books", (req, res) => {
  db.query("SELECT * FROM books WHERE visible = 1", (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn:", err);
      return res.status(500).json({ error: "Không thể truy xuất dữ liệu" });
    }
    res.json(results);
  });
});

// 📘 API: Lấy chi tiết sách
app.get("/api/books/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM books WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi truy vấn database" });
    if (result.length === 0)
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    res.json(result[0]);
  });
});

// -------------------------------
// 🧍 API: Đăng ký người dùng
// -------------------------------
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" });
  }

  // Mã hoá mật khẩu bằng bcrypt
  const hashed = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
    [username, hashed, email || null],
    (err, result) => {
      if (err) {
        console.error(err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
        }
        return res.status(500).json({ error: "Đăng ký thất bại" });
      }
      res.json({ message: "Đăng ký thành công!" });
    }
  );
});

// -------------------------------
// 🔐 API: Đăng nhập người dùng
// -------------------------------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Lỗi server" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Sai tên đăng nhập" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Sai mật khẩu" });
    }

    res.json({
      message: "Đăng nhập thành công",
      user: { id: user.id, username: user.username, email: user.email },
    });
  });
});

// -------------------------------
// 🚀 Khởi chạy server
// -------------------------------
app.listen(port, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
});

// ✅ API tổng hợp dữ liệu cho trang Admin
app.get("/api/admin/summary", (req, res) => {
  const summary = {
    user_count: 0,
    product_count: 0,
    order_count: 0,
    total_revenue: 0,
  };

  const queries = [
    "SELECT COUNT(*) AS total FROM users",
    "SELECT COUNT(*) AS total FROM books",
    "SELECT COUNT(*) AS total FROM orders",
    "SELECT SUM(total_price) AS total FROM orders",
  ];

  db.query(queries[0], (err, userResult) => {
    if (err) return res.status(500).json({ error: err.message });
    summary.user_count = userResult[0].total;

    db.query(queries[1], (err, bookResult) => {
      if (err) return res.status(500).json({ error: err.message });
      summary.product_count = bookResult[0].total;

      db.query(queries[2], (err, orderResult) => {
        if (err) return res.status(500).json({ error: err.message });
        summary.order_count = orderResult[0].total;

        db.query(queries[3], (err, revenueResult) => {
          if (err) return res.status(500).json({ error: err.message });
          summary.total_revenue = revenueResult[0].total || 0;

          res.json(summary);
        });
      });
    });
  });
});

// ✅ API LẤY DANH SÁCH USERS (có tìm kiếm)
app.get("/api/users", (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : "%";
  db.query(
    "SELECT * FROM users WHERE username LIKE ? OR email LIKE ?",
    [search, search],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ✅ API THÊM USER
app.post("/api/users", (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "Thiếu thông tin" });

  const hashedPassword = password; // hoặc dùng bcrypt sau
  db.query(
    "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
    [username, email, hashedPassword, role || "user"],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Thêm người dùng thành công", id: result.insertId });
    }
  );
});

// ✅ API CẬP NHẬT USER
app.put("/api/users/:id", (req, res) => {
  const { username, email, role } = req.body;
  const { id } = req.params;
  db.query(
    "UPDATE users SET username=?, email=?, role=? WHERE id=?",
    [username, email, role, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Cập nhật thành công" });
    }
  );
});

// ✅ API XÓA USER
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Xóa thành công" });
  });
});
