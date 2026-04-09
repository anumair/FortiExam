const mongoose = require("mongoose");

const decryptLogSchema = new mongoose.Schema(
  {
    exam_id: { type: String, required: true, index: true },
    exam_time: { type: Date, required: true },
    decrypted_at: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DecryptLog", decryptLogSchema);
