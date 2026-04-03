const express = require("express");
const admin = require("firebase-admin");
const User = require("../models/User");
const Student = require("../models/Student");

const router = express.Router();

function getFirebaseAuth() {
  if (admin.apps.length > 0) {
    return admin.auth();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return admin.auth();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function buildStudentEmailQuery(email) {
  return {
    $expr: {
      $eq: [
        {
          $toLower: {
            $trim: {
              input: { $ifNull: ["$emailId", ""] },
            },
          },
        },
        email,
      ],
    },
  };
}

function generateTemporaryPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let index = 0; index < length; index += 1) {
    const random = Math.floor(Math.random() * alphabet.length);
    password += alphabet[random];
  }
  return password;
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

router.post("/firebase-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required." });
    }

    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      return res.status(500).json({ message: "Firebase authentication is not configured on server." });
    }

    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    const email = normalizeEmail(decodedToken?.email);
    const isEmailVerified = Boolean(decodedToken?.email_verified);
    if (!email || !isEmailVerified) {
      return res.status(401).json({ message: "Firebase account email is not verified." });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const student = await Student.findOne(buildStudentEmailQuery(email)).select(
        "_id studentName department linkedUser"
      );

      if (!student) {
        return res.status(403).json({ message: "No account found for this Firebase email." });
      }

      user = await User.create({
        name: student.studentName,
        email,
        password: "firebase-auth",
        role: "student",
        department: student.department || null,
      });

      await Student.findByIdAndUpdate(student._id, { linkedUser: user._id }, { runValidators: true });
    }

    return res.json({
      message: "Firebase login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: "Firebase authentication failed", error: error.message });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const temporaryPassword = generateTemporaryPassword();
    const staffUser = await User.create({
      name,
      email,
      password: temporaryPassword,
      role: "staff",
      department: null,
    });

    return res.status(201).json({
      message: "Staff user created successfully",
      temporaryPassword,
      staff: {
        _id: staffUser._id,
        name: staffUser.name,
        email: staffUser.email,
        department: staffUser.department,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create staff user", error: error.message });
  }
});

router.put("/staff/:id", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const duplicate = await User.findOne({ email, _id: { $ne: req.params.id } });
    if (duplicate) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const updatedStaff = await User.findOneAndUpdate(
      { _id: req.params.id, role: "staff" },
      { name, email },
      { new: true, runValidators: true }
    ).select("_id name email department");

    if (!updatedStaff) {
      return res.status(404).json({ message: "Staff user not found." });
    }

    return res.json({ message: "Staff user updated successfully", staff: updatedStaff });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update staff user", error: error.message });
  }
});

router.delete("/staff/:id", async (req, res) => {
  try {
    const staffId = req.params.id;
    const assignedCount = await Student.countDocuments({ assignedStaff: staffId });
    if (assignedCount > 0) {
      return res.status(409).json({
        message: "Cannot delete this staff user while assigned to students. Reassign students first.",
      });
    }

    const deletedStaff = await User.findOneAndDelete({ _id: staffId, role: "staff" });
    if (!deletedStaff) {
      return res.status(404).json({ message: "Staff user not found." });
    }

    return res.json({ message: "Staff user deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete staff user", error: error.message });
  }
});

router.get("/staff", async (_req, res) => {
  try {
    const staffUsers = await User.find({ role: "staff" })
      .select("_id name email department")
      .sort({ name: 1 })
      .lean();

    return res.json(staffUsers);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch staff users", error: error.message });
  }
});

module.exports = router;
