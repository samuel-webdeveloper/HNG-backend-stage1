# 🧠 String Analyzer API

A RESTful API built with **Express.js** and **SQLite** for analyzing, storing, and filtering strings based on computed properties such as length, palindrome status, word count, and more — with support for **natural language filtering**.

---

## 🚀 Features

- Compute string properties (length, unique characters, hash, etc.)
- Detect palindromes automatically  
- Retrieve stored strings by value  
- Filter strings using query parameters  
- Filter strings using natural language (e.g., “palindromic strings longer than 5 characters”)  
- Delete stored strings  
- Lightweight and persistent storage using **better-sqlite3**  

---

## 🛠️ Tech Stack

- **Node.js** + **Express.js** — REST API framework  
- **better-sqlite3** — Embedded database  
- **Morgan** — HTTP request logging  
- **Crypto** — For SHA256 hashing

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
git clone https://github.com/your-username/string-analyzer.git
cd string-analyzer

### 2️⃣ Install dependencies
npm install

### 3️⃣ Start the server
npm run start
Server runs at:
👉 http://localhost:4000

You should see:
{ "status": "ok" }

---

## 📡 API Endpoints

### ✅ Health Check

GET /


### 🧩 Add a new string

POST /strings



### 🔍 Get string by value

GET /strings/:string_value

Example

GET /strings/racecar




### 🔎 Filter strings

GET /strings

Example

GET /strings?is_palindrome=true&min_length=5




### 🗣️ Filter by Natural Language

GET /strings/filter-by-natural-language?query=your+phrase

Examples

GET /strings/filter-by-natural-language?query=palindromic strings longer than 5
GET /strings/filter-by-natural-language?query=strings containing the letter a
GET /strings/filter-by-natural-language?query=single word palindromic strings




### ❌ Delete a string

DELETE /strings/:string_value

Example

DELETE /strings/racecar





## 🧾 Example Workflow

### 1️⃣ Add new strings via POST /strings
### 2️⃣ View them with GET /strings
### 3️⃣ Query specific ones by /strings/:string_value
### 4️⃣ Filter them using parameters or natural language
### 5️⃣ Delete using DELETE /strings/:string_value


## 🧑‍💻 Author
Name: Samuel Oluwatobi Ayoola
Email: ayoolasam2019@gmail.com
GitHub: https://github.com/samuel-webdeveloper
🕸️ Built with Node.js, Express, and SQLite.