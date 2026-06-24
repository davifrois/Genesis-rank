const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

const cssToAdd = `
/* ========================================================
   Academy Search and Profile Blocks
======================================================== */

.sc-profile-academy-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 1024px) {
  .sc-profile-academy-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.sc-academy-search-dropdown {
  position: relative;
  width: 100%;
}

.sc-academy-search-input-wrap {
  position: relative;
}

.sc-academy-search-input {
  width: 100%;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  color: #111827;
  padding: 10px 32px 10px 12px;
  border-radius: 4px;
  font-size: 0.875rem;
  outline: none;
}
.sc-academy-search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.sc-academy-search-caret {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.sc-academy-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 4px 4px;
  z-index: 50;
  max-height: 250px;
  overflow-y: auto;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.sc-academy-list-item {
  padding: 10px 12px;
  cursor: pointer;
  color: #111827;
  font-size: 0.875rem;
  background-color: #ffffff;
}

.sc-academy-list-item:hover, .sc-academy-list-item--active {
  background-color: #bae6fd;
}

.sc-academy-list-empty {
  padding: 10px 12px;
  color: #6b7280;
  font-size: 0.875rem;
  background-color: #ffffff;
}

.sc-academy-list-footer {
  padding: 12px;
  background-color: #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
}

.sc-academy-list-footer span {
  color: #9ca3af;
  font-size: 0.875rem;
}

.sc-btn-join-new {
  background-color: #0284c7;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
}

.sc-btn-join-new:hover {
  background-color: #0369a1;
}

.sc-btn-green {
  background-color: #65a30d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 24px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.sc-btn-green:hover {
  background-color: #4d7c0f;
}

.sc-btn-gray {
  background-color: #9ca3af;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 24px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.sc-btn-gray:hover {
  background-color: #6b7280;
}

/* Modals */
.sc-academy-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.sc-academy-modal {
  background-color: #ffffff;
  border-radius: 4px;
  width: 90%;
  max-width: 500px;
  padding: 32px 24px;
  text-align: center;
}

.sc-academy-modal-icon {
  margin: 0 auto 16px;
  color: #9ca3af;
}

.sc-academy-modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.sc-academy-modal-desc {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 24px;
}

.sc-academy-modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  margin-bottom: 24px;
  outline: none;
  color: #111827;
}

.sc-academy-modal-input:focus {
  border-color: #65a30d;
}

.sc-similar-list {
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 24px;
  max-height: 200px;
  overflow-y: auto;
}

.sc-similar-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
}
.sc-similar-item:last-child {
  border-bottom: none;
}
.sc-similar-item:hover {
  background-color: #f3f4f6;
}

.sc-similar-item-name {
  color: #3b82f6;
  font-size: 0.875rem;
}

.sc-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sc-modal-actions button {
  width: 100%;
}
`;

fs.appendFileSync(cssPath, cssToAdd);
console.log('CSS added');
