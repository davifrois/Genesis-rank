const fs = require('fs');

// 1. Update index.css
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.registration-card-grid')) {
  const newCss = `
.registration-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.registration-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}
.registration-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.registration-card__header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.registration-card__photo {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-tertiary);
  text-align: center;
}
.registration-card__header-info {
  flex: 1;
  min-width: 0;
}
.registration-card__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.registration-card__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.registration-card__section-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.registration-card__section-title {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  font-weight: 600;
  letter-spacing: 0.5px;
}
.registration-card__price-badge {
  display: inline-block;
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 16px;
}
.registration-card__footer {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.registration-card__actions {
  display: flex;
  gap: 8px;
}
.registration-card__actions .btn {
  flex: 1;
  justify-content: center;
  padding: 6px 8px;
  font-size: 12px;
}
.revenue-badge {
  display: inline-block;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 13px;
  margin-top: 8px;
}
`;
  fs.writeFileSync('src/index.css', css + '\n' + newCss);
  console.log('Added CSS to index.css');
}

// 2. Rewrite Dashboard.jsx
let jsx = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Replace table logic with card logic
let oldTableStart = jsx.indexOf('<div className="table-scroll">');
if (oldTableStart !== -1) {
  // Let's use regex to replace the table HTML block
  let replaced = jsx.replace(/<div className="table-scroll">[\s\S]*?<\/table>[\s\S]*?<\/div>/, `
                        <div className="registration-card-grid">
                            {registrationRows.map((item) => {
                                const pipelineState = registrationPipelineById.get(item.id) || {
                                    doneSteps: [true, false, false, false],
                                    currentStepIndex: 0
                                };
                                const pipelineSteps = [
                                    copy.registrationsPanel.pipelineRegistered,
                                    copy.registrationsPanel.pipelineApproved,
                                    copy.registrationsPanel.pipelineCategory,
                                    copy.registrationsPanel.pipelineBracket
                                ];
                                const hasCategory = Boolean(pipelineState.doneSteps?.[2]);
                                const hasBracket = Boolean(pipelineState.doneSteps?.[3]);
                                const flowIndicator = item.isPaymentError
                                    ? { label: copy.registrationsPanel.flowStatusPaymentError, tone: 'danger' }
                                    : item.isPaymentConfirmed
                                        ? hasCategory && hasBracket
                                            ? { label: copy.registrationsPanel.flowStatusDone, tone: 'success' }
                                            : hasCategory
                                                ? { label: copy.registrationsPanel.flowStatusCategory, tone: 'info' }
                                                : { label: copy.registrationsPanel.flowStatusApproved, tone: 'pending' }
                                        : { label: copy.registrationsPanel.flowStatusPending, tone: 'pending' };

                                return (
                                <div key={item.id} className="registration-card">
                                    <div className="registration-card__header">
                                        {item.athletePhotoUrl ? (
                                            <img className="registration-card__photo" src={item.athletePhotoUrl} alt={item.nome || copy.registrationsPanel.tableAthlete} loading="lazy" />
                                        ) : (
                                            <div className="registration-card__photo">{copy.registrationsPanel.noPhoto}</div>
                                        )}
                                        <div className="registration-card__header-info">
                                            <div className="table-name">{item.nome}</div>
                                            <div className="table-meta table-meta--tight">{item.academia || copy.modalAssign.noAcademy}</div>
                                            <div className={\`points-pill \${item.isPendingSync ? 'points-pill--warning' : item.isPaymentError ? 'points-pill--danger' : ''}\`} style={{ marginTop: '4px', display: 'inline-block' }}>
                                                {item.statusLabel}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="registration-card__body">
                                        <div className="registration-card__section-row">
                                            <div className="registration-card__section">
                                                <div className="registration-card__section-title">{copy.registrationsPanel.tableEvent}</div>
                                                <div className="table-name">{item.eventName}</div>
                                                <div className="table-meta table-meta--tight">{formatEventDate(item.eventDate)}</div>
                                            </div>
                                            <div className="registration-card__section" style={{ textAlign: 'right' }}>
                                                <div className="registration-card__section-title">{copy.registrationsPanel.tableCategory}</div>
                                                <div className="table-meta table-meta--tight">{item.modalidade || '-'}</div>
                                                <div className="table-meta table-meta--tight">
                                                    {item.categoria || '-'} / {item.faixa || '-'} / {item.peso || '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="registration-card__section-row">
                                            <div className="registration-card__section">
                                                <div className="registration-card__section-title">{copy.registrationsPanel.tableContact}</div>
                                                <div className="table-meta table-meta--tight">{item.email || '-'}</div>
                                                <div className="table-meta table-meta--tight">{item.phone || '-'}</div>
                                            </div>
                                            <div className="registration-card__section" style={{ textAlign: 'right' }}>
                                                <div className="registration-card__section-title">{copy.registrationsPanel.tablePayment}</div>
                                                <div className="registration-card__price-badge">
                                                    {currencyFormatter.format(item.totalValue || 0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="registration-card__section-row">
                                           <div className="registration-card__section">
                                                <div className="registration-card__section-title">{copy.registrationsPanel.receipt}</div>
                                                <div className="table-meta table-meta--tight" style={{wordBreak: 'break-all'}}>
                                                    {item.notes?.pixKey ? \`Pix: \${item.notes.pixKey}\` : '-'}
                                                </div>
                                                {item.proofFileUrl ? (
                                                    <button type="button" className="text-link" onClick={() => handleOpenProofFile(item)} style={{ textAlign: 'left', padding: 0 }}>
                                                        {copy.registrationsPanel.openReceipt}
                                                    </button>
                                                ) : (
                                                    <div className="table-meta table-meta--tight">{copy.registrationsPanel.noReceipt}</div>
                                                )}
                                            </div>
                                        </div>
                                        {item.notesText && (
                                            <div className="registration-card__section">
                                                <div className="registration-card__section-title">{copy.registrationsPanel.tableNotes}</div>
                                                <div className="table-meta table-meta--tight">{item.notesText}</div>
                                            </div>
                                        )}
                                        <div className="registration-card__section">
                                            <div className="registration-card__section-title">{copy.registrationsPanel.tablePipeline}</div>
                                            <div className="registration-pipeline" role="list" style={{ marginTop: '4px' }}>
                                                {pipelineSteps.map((label, stepIndex) => (
                                                    <span
                                                        key={\`\${item.id}-pipeline-\${stepIndex}\`}
                                                        className={\`registration-pipeline__step \${pipelineState.doneSteps[stepIndex] ? 'is-done' : ''} \${pipelineState.currentStepIndex === stepIndex ? 'is-current' : ''}\`}
                                                        role="listitem"
                                                        style={{ fontSize: '10px', padding: '2px 4px' }}
                                                    >
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className={\`registration-flow-indicator registration-flow-indicator--\${flowIndicator.tone}\`} style={{ marginTop: '8px' }}>
                                                {flowIndicator.tone === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                <span>{flowIndicator.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="registration-card__footer">
                                        {!item.isPendingSync && canManagePanel && (
                                            <div className="registration-card__actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost registration-status-btn"
                                                    onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_CONFIRMED)}
                                                    disabled={registrationStatusUpdatingId === item.id || item.isPaymentConfirmed}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Confirmar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost registration-status-btn"
                                                    onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_ERROR)}
                                                    disabled={registrationStatusUpdatingId === item.id || item.isPaymentError}
                                                >
                                                    <AlertCircle size={14} />
                                                    Erro
                                                </button>
                                            </div>
                                        )}
                                        {(item.paymentReviewNotes || item.paymentReviewedBy || item.paymentReviewedAt || item.syncError) && (
                                            <div className="registration-review-meta">
                                                {item.paymentReviewNotes && <div className="table-meta table-meta--tight">{copy.registrationsPanel.reviewNotes}: {item.paymentReviewNotes}</div>}
                                                {item.paymentReviewedBy && <div className="table-meta table-meta--tight">{copy.registrationsPanel.reviewedBy}: {item.paymentReviewedBy}</div>}
                                                {item.paymentReviewedAt && <div className="table-meta table-meta--tight">{copy.registrationsPanel.reviewedAt}: {formatEventDate(item.paymentReviewedAt)}</div>}
                                                {item.syncError && <div className="table-meta table-meta--tight registration-sync-error" style={{marginTop: '4px'}}>{copy.registrationsPanel.lastError}: {item.syncError}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
`);
  
  // Inject Revenue Badge into header
  replaced = replaced.replace(
      /const updatedLabel = group.updatedAt\s*\?\s*formatEventDateTime\(group\.updatedAt\)\s*:\s*formatEventDateTime\(new Date\(\)\.toISOString\(\)\);/,
      `const updatedLabel = group.updatedAt ? formatEventDateTime(group.updatedAt) : formatEventDateTime(new Date().toISOString());
                                const totalRevenue = group.rows.filter(r => r.isPaymentConfirmed).reduce((sum, r) => sum + (r.totalValue || 0), 0);`
  );
  replaced = replaced.replace(
      /<div className="table-name">\{eventNameForReport\}<\/div>/g,
      `<div className="table-name">{eventNameForReport}</div>
                                                {totalRevenue > 0 && (
                                                    <div className="revenue-badge">Valor Total Recebido: {currencyFormatter.format(totalRevenue)}</div>
                                                )}`
  );

  fs.writeFileSync('src/pages/Dashboard.jsx', replaced);
  console.log('Successfully updated Dashboard.jsx');
} else {
  console.log('Could not find old table block');
}
