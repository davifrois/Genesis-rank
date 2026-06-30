const fs = require('fs');

const cssToAppend = `

/* ==========================================================================
   Public Registrations Card Redesign
   ========================================================================== */

.registration-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.registration-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.registration-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.registration-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--brand), var(--brand-strong));
  opacity: 0.8;
}

.registration-card.status-error::before {
  background: linear-gradient(90deg, var(--danger), #b91c1c);
}

.registration-card.status-pending::before {
  background: linear-gradient(90deg, var(--warning), #d97706);
}

.registration-card.status-success::before {
  background: linear-gradient(90deg, var(--success), #15803d);
}

.registration-card__header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 1rem;
}

.registration-card__avatar {
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border);
  background: var(--surface-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--muted);
  text-align: center;
}

.registration-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.registration-card__profile {
  flex: 1;
  min-width: 0;
}

.registration-card__name {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.registration-card__academy {
  font-size: 0.85rem;
  color: var(--muted-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.registration-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  font-size: 0.9rem;
}

.registration-card__info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.registration-card__info-icon {
  color: var(--muted);
  flex-shrink: 0;
  margin-top: 2px;
}

.registration-card__info-text {
  color: var(--ink);
  line-height: 1.4;
}

.registration-card__info-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 0.2rem;
  font-weight: 600;
}

.registration-card__payment {
  background: var(--surface-strong);
  border-radius: var(--radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  border: 1px solid rgba(255,255,255,0.03);
}

.registration-card__payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 1.05rem;
}

.registration-card__payment-total {
  color: var(--success);
}

.registration-card__receipt-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0,0,0,0.2);
  padding: 0.5rem;
  border-radius: var(--radius-md);
}

.registration-card__receipt-thumb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--surface);
}

.registration-card__receipt-thumb--pdf {
  pointer-events: none;
}

.registration-card__receipt-info {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
}

.registration-card__receipt-name {
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.registration-card__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.registration-card__actions .btn {
  flex: 1;
  min-width: 120px;
  justify-content: center;
  font-size: 0.85rem;
  padding: 0.5rem;
}

/* Redesigned Pipeline inside Card */
.registration-card__pipeline {
  display: flex;
  gap: 4px;
  margin-top: 0.75rem;
}

.registration-card__pipeline-step {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  position: relative;
}

.registration-card__pipeline-step.is-done {
  background: var(--brand);
}

.registration-card__pipeline-step.is-current {
  background: var(--warning);
}

.registration-card__pipeline-step::after {
  content: attr(data-label);
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: var(--muted);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.registration-card__pipeline:hover .registration-card__pipeline-step::after {
  opacity: 1;
}

@media (max-width: 768px) {
  .registration-card-list {
    grid-template-columns: 1fr;
  }
}
`;

fs.appendFileSync('src/index.css', cssToAppend);
console.log('Appended styles successfully');
