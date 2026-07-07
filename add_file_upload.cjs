const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AcademyProfileSettings.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes("import { compressImage }")) {
    content = content.replace(
        "import { useI18n } from '../hooks/useI18n';",
        "import { useI18n } from '../hooks/useI18n';\nimport { compressImage } from '../utils/imageUtils';"
    );
}

const helperToAdd = `
  const fileToDataUrl = (file) => compressImage(file, 800, 800, 0.7);

  const handleImageFile = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const imageData = await fileToDataUrl(file);
        setFormData((prev) => ({ ...prev, logoUrl: imageData }));
        setErrorMsg('');
      } catch {
        setErrorMsg(isEnglish ? 'Could not read the selected image.' : 'Não foi possível ler a imagem selecionada.');
      } finally {
        event.target.value = '';
      }
  };
`;

if (!content.includes('handleImageFile')) {
    content = content.replace(
        "const handleChange = (e) => {",
        helperToAdd + "\n  const handleChange = (e) => {"
    );
}

// Replace the input field for logoUrl
const oldInputHTML = `
                          <input 
                              type="text" 
                              name="logoUrl"
                              value={formData.logoUrl}
                              onChange={handleChange}
                              className="input"
                              placeholder="https://..."
                              style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '8px', color: '#fff', width: '100%' }}
                          />
                          <p style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '8px' }}>
                              {isEnglish ? "Provide a direct link to your academy's logo image (PNG or JPG)." : 'Forneça um link direto para a imagem do logotipo da sua academia (PNG ou JPG).'}
                          </p>
`;

const newInputHTML = `
                          <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleImageFile}
                              className="input"
                              style={{ backgroundColor: '#0f0f11', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '8px', color: '#fff', width: '100%' }}
                          />
                          <p style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '8px' }}>
                              {isEnglish ? "Select an image file (PNG or JPG) from your device." : 'Selecione uma imagem (PNG ou JPG) do seu computador ou celular.'}
                          </p>
`;

content = content.replace(oldInputHTML, newInputHTML);

// Replace "URL do Logotipo" with "Logotipo da Academia"
content = content.replace(
    "{isEnglish ? 'Logo URL' : 'URL do Logotipo'}",
    "{isEnglish ? 'Academy Logo' : 'Logotipo da Academia'}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('AcademyProfileSettings.jsx updated with file upload logic!');
