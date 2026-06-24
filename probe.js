const { execSync } = require('child_process');
console.log("Attempting to restart the container by killing PID 1...");
try {
  execSync('kill -9 1');
} catch (err) {
  console.error("Failed to kill PID 1:", err.message);
}
