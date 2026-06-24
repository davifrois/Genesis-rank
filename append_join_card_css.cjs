const fs = require('fs');
const path = require('path');
const css = `
/* Smoothcomp Style Join Card */
.smoothcomp-join-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
  color: #333;
  font-family: Arial, sans-serif;
  margin-bottom: 2rem;
}

.smoothcomp-join-card__header {
  background-color: #f5f5f5;
  padding: 15px 20px;
  border-bottom: 1px solid #ddd;
}

.smoothcomp-join-card__header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 500;
}

.smoothcomp-join-card__body {
  padding: 20px;
}

.smoothcomp-join-card__field {
  margin-bottom: 15px;
}

.smoothcomp-join-card__field label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.smoothcomp-join-card__field p {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.smoothcomp-join-card__footer {
  background-color: #f5f5f5;
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
}

.smoothcomp-join-card__btn {
  background-color: #7cb342;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: inline-block;
}

.smoothcomp-join-card__btn:hover {
  background-color: #689f38;
}

.smoothcomp-join-card .academy-select-light {
  font-size: 14px;
}
`;
fs.appendFileSync(path.join(__dirname, 'src', 'index.css'), css);
