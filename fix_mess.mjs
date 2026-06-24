import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /          <div className="weight-select-wrapper">\s*<select\s*className="select-pro"\s*<div className="form-group-pro">\s*<label>Categoria de Peso<\/label>[\s\S]*?<div className="total-breakdown">[\s\S]*?<\/div>\s*<\/div>\s*const PaymentStep/m;

const replacement = `          <div className="weight-select-wrapper">
            <select
              className="select-pro"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            >
              <option value="">Selecione seu peso...</option>
              {weightOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="absolute-upsell">
          <div className="absolute-upsell__content">
            <h3>Inscrição no Absoluto?</h3>
            <p>Lute na categoria sem limite de peso da sua faixa.</p>
            <div className="absolute-upsell__price">+{formatBrlCurrency(absoluteFee)}</div>
          </div>
          <label className="pro-switch">
            <input type="checkbox" checked={absolute} onChange={(e) => setAbsolute(e.target.checked)} />
            <span className="pro-slider"></span>
          </label>
        </div>

        <div className="registration-footer-sticky">
          <div className="total-panel">
            <div className="total-label">Total a pagar</div>
            <div className="total-amount">{formatBrlCurrency(totalPrice)}</div>
            <div className="total-breakdown">
              {activeBatchName} · {categoryInfo.ageCategoryLabel} · Base {formatBrlCurrency(categoryBasePrice)}
              {absolute ? \` + Absoluto \${formatBrlCurrency(absoluteFee)}\` : ''}
            </div>
          </div>
          <button type="submit" className="btn-confirm-pro" disabled={!weight}>
            AVANÇAR PARA PAGAMENTO <ChevronRight size={20} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const PaymentStep`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed syntax and restored button!');
} else {
  console.log('Could not match regex.');
}
