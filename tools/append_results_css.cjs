const fs = require('fs');

const cssRules = `
/* --- Team Rankings (Top listas) --- */
.sc-team-rankings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .sc-team-rankings-grid {
    grid-template-columns: 1fr;
  }
}

.sc-team-ranking-block {
  background-color: #27272a;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #3f3f46;
}

.sc-team-ranking-header {
  padding: 16px 20px;
  background-color: #3f3f46;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sc-team-ranking-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.sc-team-ranking-header small {
  color: #a1a1aa;
  font-size: 12px;
}

.sc-team-ranking-list {
  display: flex;
  flex-direction: column;
}

.sc-team-ranking-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #3f3f46;
}

.sc-team-ranking-item:last-child {
  border-bottom: none;
}

.sc-team-rank-pos {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  width: 30px;
}

.sc-team-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.sc-team-stats {
  display: flex;
  gap: 16px;
  align-items: center;
}

.sc-stat-col {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #a1a1aa;
}

.sc-see-all {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: #a1a1aa;
  cursor: pointer;
  background-color: #27272a;
  border-top: 1px solid #3f3f46;
}

.sc-see-all:hover {
  background-color: #3f3f46;
  color: #fff;
}

.sc-empty-state {
  padding: 24px;
  text-align: center;
  color: #a1a1aa;
  font-style: italic;
}

/* --- Results --- */
.sc-brackets-results {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sc-bracket-result {
  background-color: #27272a;
  border-radius: 8px;
  border: 1px solid #3f3f46;
  overflow: hidden;
}

.sc-bracket-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #3f3f46;
}

.sc-bracket-result-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.sc-bracket-badge {
  background-color: #52525b;
  color: #d4d4d8;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
}

.sc-bracket-result-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sc-result-athlete {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sc-result-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  color: #fff;
}

.sc-result-info {
  display: flex;
  flex-direction: column;
}

.sc-result-info strong {
  font-size: 14px;
  color: #fff;
}

.sc-result-info small {
  font-size: 12px;
  color: #a1a1aa;
}
`;

fs.appendFileSync('src/index.css', cssRules);
console.log('Appended CSS rules to src/index.css');
