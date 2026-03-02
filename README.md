# 🚀 Genathon 3.0

Welcome to the official repository for **Genathon 3.0**, the flagship hackathon organized by **Club Elevate, IIIT Nagpur**. This repository contains the backend logic and assets powering the immersive experience behind our event website.



---

## 📁 Project Structure

```
WEB-main/
├── index.js                  # Entry point of the Node.js server
├── schema.js                 # Mongoose schema definitions
├── credentials.json          # Credentials for third-party integrations (keep secure)
├── package.json              # Project metadata and dependencies
├── package-lock.json         # NPM version lock file
├── /models
│   └── userRegisteration.js  # MongoDB schema for user registration
├── /Utils
│   ├── ExpressError.js       # Custom error class for handling HTTP errors
│   └── wrapAsync.js          # Wrapper to handle async errors in routes
├── /images                   # Static assets and branding visuals
│   ├── genp1.jpg
│   ├── amazon.png
│   ├── Xiaomi_logo.png
│   └── ...
├── /node_modules             # Installed npm packages (auto-generated)
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Language**: JavaScript
- **Assets**: JPEG, PNG (Sponsor logos, banners, posters)

---

## 🔧 Local Setup

To set up the project locally, follow these steps:

```bash
git clone https://github.com/yourusername/genathon-3.0.git
cd genathon-3.0/WEB-main
npm install
node index.js
```

> ⚠️ Ensure your MongoDB server is running and credentials are properly configured in `credentials.json`.

---

## 🧠 Key Features

- ✅ User registration and schema handling
- 🧰 Custom error handling architecture
- 📦 Modular backend structure
- 🎨 Static asset handling for frontend integration

---

## 🤝 Contributing

We welcome contributions and collaborations! If you'd like to enhance this project or fix issues, feel free to:

1. Fork the repo 🍴
2. Create your feature branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m 'feat: add new feature'`)
4. Push to the branch (`git push origin feature-name`)
5. Open a Pull Request

---

## 📬 Contact

- **Organized by**: Club Elevate, IIIT Nagpur

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).  
© 2025 Club Elevate, IIIT Nagpur
