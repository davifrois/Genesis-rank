const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');
const registrationCss = `
/* ========================================================
   Registration Panel - Card Layout Redesign 
======================================================== */
.registration-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.registration-card {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
}

.registration-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.15);
}

.registration-card__body {
  display: flex;
  flex-wrap: wrap;
  padding: 20px;
  gap: 24px;
  align-items: center;
}

.registration-card__info-group {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 2;
  min-width: 280px;
}

.registration-card__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.registration-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 0.7rem;
  color: #71717a;
  text-align: center;
}

.registration-card__name {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #f4f4f5;
}

.registration-card__meta {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
}

.registration-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag--outline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #a1a1aa;
}

.registration-card__status-group {
  flex: 1.5;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.registration-pipeline-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0;
}

.registration-pipeline-mini__step {
  height: 6px;
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  transition: all 0.3s;
}

.registration-pipeline-mini__step.is-done {
  background: #10b981;
}

.registration-pipeline-mini__step.is-current {
  background: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
}

.registration-flow-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.registration-flow-text--success { color: #34d399; }
.registration-flow-text--info { color: #38bdf8; }
.registration-flow-text--pending { color: #fbbf24; }
.registration-flow-text--danger { color: #f87171; }

.registration-card__contact {
  font-size: 0.8rem;
  color: #a1a1aa;
  display: flex;
  gap: 8px;
}

.registration-card__payment-group {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.registration-card__payment-info p {
  margin: 0 0 4px 0;
  font-size: 0.85rem;
  color: #e4e4e7;
}

.registration-card__payment-info p:last-child {
  margin: 0;
}

.registration-card__proof {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.registration-card__proof img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.registration-card__proof-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #27272a;
  color: #a1a1aa;
  font-size: 0.7rem;
  font-weight: bold;
}

.registration-card__proof-placeholder.pdf-icon {
  background: #7f1d1d;
  color: #fca5a5;
}

.registration-card__proof-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
  font-size: 0.7rem;
  flex-direction: column;
}

.registration-card__proof:hover .registration-card__proof-overlay {
  opacity: 1;
}

.registration-card__actions {
  display: flex;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.1);
}

.registration-card__actions .btn {
  flex: 1;
  border-radius: 0;
  padding: 16px;
  font-weight: 600;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn-action-reject {
  background: transparent;
  color: #f87171;
}

.btn-action-reject:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.1);
}

.btn-action-approve {
  background: transparent;
  color: #34d399;
  border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.btn-action-approve:hover:not(:disabled) {
  background: rgba(52, 211, 153, 0.1);
}

.registration-card__actions .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}

.registration-card__footer {
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.registration-card__sync-error {
  color: #f87171;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Lightbox */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lightbox-content {
  background: #18181b;
  border-radius: 16px;
  overflow: hidden;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  animation: modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-body {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  min-height: 300px;
}

.lightbox-body img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.lightbox-body embed {
  width: 100%;
  height: 70vh;
}

.lightbox-footer {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(24, 24, 27, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.lightbox-info h4 {
  margin: 0 0 4px 0;
  color: #fff;
  font-size: 1.2rem;
}

.lightbox-info p {
  margin: 0;
  color: #a1a1aa;
}

.lightbox-actions {
  display: flex;
  gap: 12px;
}

.lightbox-actions .btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid currentColor;
}

.badge-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-pill--success {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.badge-pill--warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.badge-pill--danger {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}
`;

if (!css.includes('Registration Panel - Card Layout Redesign')) {
    fs.writeFileSync(cssPath, css + '\n' + registrationCss);
    console.log('Registration CSS appended.');
} else {
    console.log('CSS already contains the Registration Panel styles.');
}
