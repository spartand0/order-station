const crypto = require("crypto");

// Function to encrypt data
function encryptData(data) {
  // Generate 16 bytes of random data for the initialization vector (IV)
  const initVector = process.env.IV;

  // Secret key - generate 32 bytes of random data
  const securityKey = process.env.SECRET_KEY;
  const cipher = crypto.createCipheriv("aes-256-cbc", securityKey, initVector);

  let encryptedData = cipher.update(data, "utf-8", "hex");
  encryptedData += cipher.final("hex");

  return encryptedData;
}

// Function to decrypt data
function decryptData(encryptedData) {
  // Generate 16 bytes of random data for the initialization vector (IV)
  const initVector = process.env.IV;
  // Secret key - generate 32 bytes of random data
  const securityKey = process.env.SECRET_KEY;
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    securityKey,
    initVector
  );

  let decryptedData = decipher.update(encryptedData, "hex", "utf-8");
  decryptedData += decipher.final("utf-8");

  return decryptedData;
}

// Export the functions so they can be used in other files
module.exports = {
  encryptData,
  decryptData,
};
