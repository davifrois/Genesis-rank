const fs = require('fs');
const path = require('path');

const myAccountPath = path.join(__dirname, 'src', 'pages', 'MyAccount.jsx');
const cssPath = path.join(__dirname, 'src', 'index.css');

let myAccount = fs.readFileSync(myAccountPath, 'utf8');

// 1. Injetar utilitário de crop
if (!myAccount.includes('cropImageTo16x9')) {
    const cropUtil = `
const cropImageTo16x9 = (file) => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = 1200;
        const targetHeight = 675; // 16:9
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgRatio > targetRatio) {
          drawHeight = targetHeight;
          drawWidth = img.width * (targetHeight / img.height);
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = targetWidth;
          drawHeight = img.height * (targetWidth / img.width);
          offsetX = 0;
          offsetY = (targetHeight - drawHeight) / 2;
        }
        
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Erro ao processar imagem'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  })
);
`;
    myAccount = myAccount.replace('const splitName', cropUtil + '\\nconst splitName');
}

// 2. Atualizar handleImageFile
const oldHandleImageFile = `  const handleImageFile = async (event, field = 'photoUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await fileToDataUrl(file);
      setForm((previous) => ({ ...previous, [field]: imageData }));
      setError('');
    } catch {
      setError('Nao foi possivel ler a imagem selecionada.');
    } finally {
      event.target.value = '';
    }
  };`;

const newHandleImageFile = `  const handleImageFile = async (event, field = 'photoUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = field === 'coverUrl' ? await cropImageTo16x9(file) : await fileToDataUrl(file);
      setForm((previous) => ({ ...previous, [field]: imageData }));
      setError('');
    } catch {
      setError('Nao foi possivel ler a imagem selecionada.');
    } finally {
      event.target.value = '';
    }
  };`;

myAccount = myAccount.replace(oldHandleImageFile, newHandleImageFile);

// 3. Injetar handleCepBlur, handleExportBackup, handleImportBackup e atualizar ZIP
if (!myAccount.includes('handleCepBlur')) {
    const funcs = `
  const handleCepBlur = async (e) => {
    const rawCep = e.target.value.replace(/\\D/g, '');
    if (rawCep.length === 8) {
      try {
        const response = await fetch(\`https://viacep.com.br/ws/\${rawCep}/json/\`);
        const data = await response.json();
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            address: data.logradouro + (data.bairro ? \` - \${data.bairro}\` : ''),
            city: data.localidade,
            province: data.uf,
            country: 'Brasil'
          }));
        }
      } catch (err) {
        // Ignorar erro
      }
    }
  };

  const handleExportBackup = () => {
    try {
      const dataStr = localStorage.getItem('genesis_store_v1');
      if (!dataStr) return setError('Nenhum dado encontrado para backup.');
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`genesis-backup-\${new Date().toISOString().split('T')[0]}.json\`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Backup exportado com sucesso.');
    } catch (err) {
      setError('Erro ao exportar backup.');
    }
  };

  const handleImportBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.schemaVersion) throw new Error('Arquivo de backup invalido.');
        localStorage.setItem('genesis_store_v1', JSON.stringify(json));
        setSuccess('Restaurando backup...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setError('Erro ao ler arquivo de backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
`;
    myAccount = myAccount.replace('  const handleImageFile = ', funcs + '\\n  const handleImageFile = ');
}

myAccount = myAccount.replace(
    "{renderEditableTextRow('zip', txt.zip, form.zip)}",
    "{renderEditableTextRow('zip', txt.zip, form.zip, { onBlur: handleCepBlur })}"
);

// 4. Injetar seção de Backup e Restauração na interface
if (!myAccount.includes('Backup e Restauração')) {
    const backupUI = `
            <section className="smooth-settings-card smooth-media-card">
              <h2>{txt.coverImage} <label>{txt.selectImage}<input type="file" accept="image/*" onChange={(event) => handleImageFile(event, 'coverUrl')} /></label></h2>
              <div className="smooth-cover-preview">
                {form.coverUrl ? <img src={form.coverUrl} alt="Cover" /> : <Image size={92} />}
              </div>
            </section>

            <section className="smooth-settings-card">
              <h2>Backup e Restauração</h2>
              <div className="smooth-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', border: 'none', background: 'transparent' }}>
                <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Exporte todas as suas configurações, inscrições, academias e perfil para um arquivo seguro. Você pode importar este arquivo mais tarde ou em outro dispositivo.</p>
                <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
                  <button type="button" className="genesis-gradient-btn" onClick={handleExportBackup}>Exportar JSON</button>
                  <label className="genesis-outline-btn" style={{ cursor: 'pointer', textAlign: 'center', margin: 0 }}>
                    Importar Backup
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
                  </label>
                </div>
              </div>
            </section>
`;
    const originalCoverUI = \`            <section className="smooth-settings-card smooth-media-card">
              <h2>{txt.coverImage} <label>{txt.selectImage}<input type="file" accept="image/*" onChange={(event) => handleImageFile(event, 'coverUrl')} /></label></h2>
              <div className="smooth-cover-preview">
                {form.coverUrl ? <img src={form.coverUrl} alt="Cover" /> : <Image size={92} />}
              </div>
            </section>\`;
    
    myAccount = myAccount.replace(originalCoverUI, backupUI);
}

// 5. CSS Update
let css = fs.readFileSync(cssPath, 'utf8');

const premiumCss = \`
/* ========================================================
   Fase 2: Dark Premium Glassmorphism Settings Design 
======================================================== */
.smooth-settings-page {
  background: radial-gradient(circle at top left, #1a1a2e, #121212);
  color: #f4f4f5;
  font-family: 'Inter', 'Outfit', sans-serif;
  min-height: 100vh;
}

.smooth-settings-shell {
  max-width: 1200px;
  margin: 0 auto;
}

.smooth-settings-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.smooth-settings-card {
  background: rgba(24, 24, 27, 0.6) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
  padding: 24px !important;
  margin-bottom: 24px !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.smooth-settings-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4) !important;
}

.smooth-settings-card h2 {
  color: #e4e4e7 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding-bottom: 12px;
  font-weight: 600;
}

.smooth-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  padding: 16px 0 !important;
  color: #a1a1aa !important;
}

.smooth-row strong {
  color: #f4f4f5 !important;
  font-weight: 500;
}

.smooth-row input, .smooth-row select, .smooth-row textarea {
  background: rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  border-radius: 8px !important;
  padding: 10px 14px !important;
  transition: all 0.2s;
}

.smooth-row input:focus, .smooth-row select:focus, .smooth-row textarea:focus {
  border-color: #38bdf8 !important;
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.smooth-row button {
  color: #38bdf8 !important;
  font-weight: 600 !important;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background 0.2s;
}

.smooth-row button:hover {
  background: rgba(56, 189, 248, 0.1) !important;
}

.smooth-save-btn {
  background: linear-gradient(90deg, #0ea5e9, #3b82f6) !important;
  border: none !important;
  color: white !important;
  border-radius: 12px !important;
  padding: 14px 28px !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4) !important;
  transition: all 0.3s ease !important;
  width: 100%;
}

.smooth-save-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 25px rgba(14, 165, 233, 0.5) !important;
}

.genesis-gradient-btn {
  background: linear-gradient(90deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.genesis-gradient-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
}

.genesis-outline-btn {
  background: transparent;
  color: #e4e4e7;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.genesis-outline-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.4);
}

.ps-card {
  background: rgba(24, 24, 27, 0.6) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 16px !important;
  color: #e4e4e7;
}
.ps-card__title {
  color: #e4e4e7 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.ps-combo__input {
  background: rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: white !important;
}
.ps-combo__dropdown {
  background: #18181b !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
}
.ps-combo__item:hover {
  background: rgba(255,255,255,0.05) !important;
}
.ps-join-btn {
  background: linear-gradient(90deg, #10b981, #059669) !important;
  border: none !important;
  font-weight: 600 !important;
}
.ps-join-btn:disabled {
  background: #3f3f46 !important;
  color: #a1a1aa !important;
}
\`;

if (!css.includes('Fase 2: Dark Premium Glassmorphism Settings Design')) {
    fs.writeFileSync(cssPath, css + '\\n' + premiumCss);
}

fs.writeFileSync(myAccountPath, myAccount);
console.log('Fase 2 aplicada com sucesso!');
