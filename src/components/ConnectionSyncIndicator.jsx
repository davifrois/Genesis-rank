import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import { offlineSyncService } from '../services/offlineSyncService';
import './ConnectionSyncIndicator.css';

export default function ConnectionSyncIndicator({ compact = false }) {
  const [status, setStatus] = useState(offlineSyncService.getStatus());
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  // Fechar popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowPopover(false);
      }
    };
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  const handleSyncNow = async () => {
    await offlineSyncService.flushQueue();
  };

  const handleExportBackup = () => {
    offlineSyncService.exportOfflineBackup();
  };

  const formatLastSync = (isoString) => {
    if (!isoString) return 'Nunca sincronizado';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Data indisponível';
    }
  };

  const { isOnline, pendingCount, isSyncing, lastSyncTime } = status;

  let badgeClass = 'online';
  let badgeLabel = 'Online';
  let Icon = Wifi;

  if (isSyncing) {
    badgeClass = 'syncing';
    badgeLabel = 'Sincronizando...';
    Icon = RefreshCw;
  } else if (!isOnline) {
    badgeClass = 'offline';
    badgeLabel = pendingCount > 0 ? `Offline (${pendingCount} na fila)` : 'Offline';
    Icon = WifiOff;
  } else if (pendingCount > 0) {
    badgeClass = 'offline';
    badgeLabel = `${pendingCount} na fila`;
    Icon = RefreshCw;
  }

  return (
    <div className="sync-indicator-wrapper" ref={popoverRef}>
      <button 
        type="button"
        className={`sync-status-badge ${badgeClass}`}
        onClick={() => setShowPopover(!showPopover)}
        title="Status da conexão e sincronização com banco de dados"
      >
        <span className={`sync-dot ${isOnline ? 'online' : 'offline'} ${isSyncing ? 'sync-spin' : ''}`} />
        <Icon size={14} className={isSyncing ? 'sync-spin' : ''} />
        {!compact && <span>{badgeLabel}</span>}
      </button>

      {showPopover && (
        <div className="sync-popover">
          <div className="sync-popover-header">
            <span className="sync-popover-title">Conexão & Sincronização</span>
            <button 
              type="button"
              className="sync-close-btn"
              onClick={() => setShowPopover(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="sync-popover-info">
            <div className="sync-info-row">
              <span className="sync-info-label">Status da Rede:</span>
              <span className="sync-info-val" style={{ color: isOnline ? '#34d399' : '#fbbf24' }}>
                {isOnline ? '● Online (Conectado)' : '○ Offline (Sem Internet)'}
              </span>
            </div>

            <div className="sync-info-row">
              <span className="sync-info-label">Lutas/Ações na Fila:</span>
              <span className={`sync-info-val ${pendingCount > 0 ? 'highlight' : ''}`}>
                {pendingCount === 0 ? 'Nenhuma (Tudo salvo)' : `${pendingCount} pendente(s)`}
              </span>
            </div>

            <div className="sync-info-row">
              <span className="sync-info-label">Última Sincronização:</span>
              <span className="sync-info-val">{formatLastSync(lastSyncTime)}</span>
            </div>
          </div>

          <div className="sync-popover-actions">
            <button 
              type="button"
              className="sync-action-btn primary"
              onClick={handleSyncNow}
              disabled={isSyncing}
            >
              <RefreshCw size={14} className={isSyncing ? 'sync-spin' : ''} />
              {isSyncing ? 'Sincronizando Agora...' : 'Sincronizar Agora'}
            </button>

            <button 
              type="button"
              className="sync-action-btn secondary"
              onClick={handleExportBackup}
              title="Baixar arquivo JSON completo das lutas para pen-drive"
            >
              <Download size={14} />
              Baixar Backup JSON (Pen-drive)
            </button>
          </div>

          <div className="sync-notice">
            Todas as lutas e pódios são salvos com segurança localmente mesmo sem internet. Ao reconectar, os dados sobem sozinhos.
          </div>
        </div>
      )}
    </div>
  );
}
