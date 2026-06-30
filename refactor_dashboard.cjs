const fs = require('fs');

let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const tableStart = `<div className="table-scroll">`;
const startIndex = code.indexOf(tableStart);

if (startIndex === -1) {
  console.error("Could not find table start");
  process.exit(1);
}

// The table ends at `</table>\n                        </div>`
const tableEndStr = `                        </table>\r\n                        </div>`;
let endIndex = code.indexOf(tableEndStr, startIndex);

if (endIndex === -1) {
  // try linux line endings
  const tableEndStrLf = `                        </table>\n                        </div>`;
  endIndex = code.indexOf(tableEndStrLf, startIndex);
}

if (endIndex === -1) {
  console.error("Could not find table end");
  process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(endIndex + (code.includes(`</table>\r\n`) ? `                        </table>\r\n                        </div>`.length : `                        </table>\n                        </div>`.length));

const replacement = `<div className="registration-card-list">
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
                                            
                                    const isError = item.isPaymentError;
                                    const isPending = item.isPendingSync || (!item.isPaymentConfirmed && !item.isPaymentError);
                                    const isSuccess = item.isPaymentConfirmed;
                                    const statusClass = isError ? 'status-error' : isPending ? 'status-pending' : 'status-success';

                                    return (
                                    <div key={item.id} className={\`registration-card \${statusClass}\`}>
                                        <div className="registration-card__header">
                                            <div className="registration-card__avatar">
                                                {item.athletePhotoUrl ? (
                                                    <img src={item.athletePhotoUrl} alt={item.nome || copy.registrationsPanel.tableAthlete} loading="lazy" />
                                                ) : (
                                                    <span>{copy.registrationsPanel.noPhoto}</span>
                                                )}
                                            </div>
                                            <div className="registration-card__profile">
                                                <div className="registration-card__name">{item.nome}</div>
                                                <div className="registration-card__academy">{item.academia || copy.modalAssign.noAcademy}</div>
                                                
                                                <div className="registration-card__pipeline" role="list" aria-label={copy.registrationsPanel.tablePipeline}>
                                                    {pipelineSteps.map((label, stepIndex) => (
                                                        <span
                                                            key={\`\${item.id}-pipeline-\${stepIndex}\`}
                                                            className={\`registration-card__pipeline-step \${pipelineState.doneSteps[stepIndex] ? 'is-done' : ''} \${pipelineState.currentStepIndex === stepIndex ? 'is-current' : ''}\`}
                                                            role="listitem"
                                                            data-label={label}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="registration-card__body">
                                            <div className="registration-card__info-row">
                                                <AlertCircle className="registration-card__info-icon" size={14} />
                                                <div>
                                                    <div className="registration-card__info-label">{copy.registrationsPanel.tableEvent}</div>
                                                    <div className="registration-card__info-text">
                                                        <strong>{item.eventName}</strong><br />
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-strong)' }}>{formatEventDate(item.eventDate)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="registration-card__info-row">
                                                <CheckCircle2 className="registration-card__info-icon" size={14} />
                                                <div>
                                                    <div className="registration-card__info-label">{copy.registrationsPanel.tableCategory}</div>
                                                    <div className="registration-card__info-text">
                                                        {item.modalidade || '-'} <br/>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-strong)' }}>{item.categoria || '-'} / {item.faixa || '-'} / {item.peso || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="registration-card__info-row">
                                                <RotateCcw className="registration-card__info-icon" size={14} />
                                                <div style={{ flex: 1 }}>
                                                    <div className="registration-card__info-label">{copy.registrationsPanel.tableStatus}</div>
                                                    <div className={\`points-pill \${item.isPendingSync ? 'points-pill--warning' : item.isPaymentError ? 'points-pill--danger' : ''}\`} style={{ display: 'inline-flex', marginBottom: '0.3rem' }}>
                                                        {item.statusLabel}
                                                    </div>
                                                    <div className={\`registration-flow-indicator registration-flow-indicator--\${flowIndicator.tone}\`} style={{ marginTop: 0 }}>
                                                        {flowIndicator.tone === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                        <span>{flowIndicator.label}</span>
                                                    </div>
                                                    {item.syncError && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
                                                            {copy.registrationsPanel.lastError}: {item.syncError}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="registration-card__payment">
                                            <div className="registration-card__payment-header">
                                                <span>{copy.registrationsPanel.tablePayment}</span>
                                                <span className="registration-card__payment-total">{currencyFormatter.format(item.totalValue || 0)}</span>
                                            </div>
                                            
                                            {item.notes?.pixKey && (
                                              <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
                                                  <span style={{ color: 'var(--muted-strong)' }}>{copy.registrationsPanel.pixKey}:</span> {item.notes.pixKey}
                                              </div>
                                            )}

                                            {item.proofFileUrl && (
                                                <div className="registration-card__receipt-preview">
                                                    {item.isImageProof ? (
                                                        <img
                                                            className="registration-card__receipt-thumb"
                                                            src={item.proofFileUrl}
                                                            alt={item.proofName || copy.registrationsPanel.proofPreviewTitle}
                                                            loading="lazy"
                                                        />
                                                    ) : item.isPdfProof ? (
                                                        <embed
                                                            className="registration-card__receipt-thumb registration-card__receipt-thumb--pdf"
                                                            src={\`\${item.proofFileUrl}#toolbar=0&navpanes=0&scrollbar=0\`}
                                                            type="application/pdf"
                                                        />
                                                    ) : (
                                                        <div className="registration-card__receipt-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                                                            PDF
                                                        </div>
                                                    )}
                                                    <div className="registration-card__receipt-info">
                                                        <div className="registration-card__receipt-name">{item.proofName || 'Comprovante'}</div>
                                                        <button type="button" className="text-link" onClick={() => handleOpenProofFile(item)} style={{ fontSize: '0.75rem' }}>
                                                            {copy.registrationsPanel.openReceipt}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {!item.isPendingSync && canManagePanel && (
                                                <div className="registration-card__actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_CONFIRMED)}
                                                        disabled={registrationStatusUpdatingId === item.id || item.isPaymentConfirmed}
                                                    >
                                                        <CheckCircle2 size={14} /> Confirmar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => handleUpdateRegistrationPaymentStatus(item, REGISTRATION_STATUS.PAYMENT_ERROR)}
                                                        disabled={registrationStatusUpdatingId === item.id || item.isPaymentError}
                                                    >
                                                        <AlertCircle size={14} /> Erro
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>`;

fs.writeFileSync('src/pages/Dashboard.jsx', before + replacement + after);
console.log('Successfully replaced table with cards.');
