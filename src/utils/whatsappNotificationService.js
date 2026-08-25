/**
 * Serviço de Notificações e Comunicação Direta via WhatsApp
 * Genesis Esportes - Sistema de Ranking & Torneios
 */

export const whatsappNotificationService = {
  /**
   * Envia Comprovante de Inscrição Oficial com QR Code de Pesagem
   */
  sendRegistrationReceipt: ({ athleteName, eventName, category, belt, weight, team, amount, registrationId }) => {
    const formattedAmount = typeof amount === 'number' ? `R$ ${amount.toFixed(2).replace('.', ',')}` : (amount || 'Confirmado');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=GENESIS_REG_${registrationId || 'OFICIAL'}`;

    const text = `🥋 *COMPROVANTE OFICIAL DE INSCRIÇÃO — GENESIS ESPORTES*\n\n` +
      `Olá, *${athleteName}*! Sua inscrição foi confirmada com sucesso no evento.\n\n` +
      `🏆 *Evento:* ${eventName}\n` +
      `👤 *Atleta:* ${athleteName}\n` +
      `🥋 *Faixa:* ${belt || 'Geral'}\n` +
      `⚖️ *Divisão de Peso:* ${weight || 'Conforme cadastro'}\n` +
      `🛡️ *Equipe:* ${team || 'Independente'}\n` +
      `💰 *Valor Pago:* ${formattedAmount}\n` +
      `🔢 *Código da Inscrição:* #${(registrationId || '').slice(-6).toUpperCase() || 'CONFIRMADA'}\n\n` +
      `📲 *Apresente seu QR Code na Pesagem Digital:* \n${qrUrl}\n\n` +
      `_Fique atento ao cronograma oficial e boa sorte na competição!_ 🥇`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  },

  /**
   * Alerta de Chamada de Luta / Tatame
   */
  sendFightCallAlert: ({ athleteName, eventName, tatameNumber, matchNumber, category, opponentName }) => {
    const text = `🔔 *CHAMADA DE LUTA — ${eventName.toUpperCase()}*\n\n` +
      `Atenção, *${athleteName}*!\n\n` +
      `📍 *Seu Tatame:* TATAME ${tatameNumber}\n` +
      `🔢 *Luta:* #${matchNumber}\n` +
      `🥋 *Categoria:* ${category}\n` +
      `⚔️ *Adversário:* ${opponentName || 'A definir'}\n\n` +
      `⚠️ *Apresente-se IMEDIATAMENTE na área de aquecimento/concentração com seu kimono e faixa oficiais!*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  },

  /**
   * Alerta de Virada de Lote de Inscrição
   */
  sendBatchEndingAlert: ({ athleteName, eventName, batchName, hoursLeft, eventUrl }) => {
    const text = `⏳ *ÚLTIMAS HORAS DO LOTE — ${eventName.toUpperCase()}*\n\n` +
      `Olá, *${athleteName || 'Atleta'}*!\n\n` +
      `O *${batchName || 'Lote Atual'}* do evento *${eventName}* encerra em menos de *${hoursLeft || '24'} horas*!\n\n` +
      `Garanta sua vaga com desconto antes da virada de preço:\n` +
      `👉 ${eventUrl || window.location.origin}\n\n` +
      `_Não fique de fora do maior ranking da temporada!_ 🏆`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  },

  /**
   * Alerta de Chaveamento e Cronograma Liberados
   */
  sendBracketsReleasedAlert: ({ eventName, bracketsUrl }) => {
    const text = `📋 *CHAVEAMENTO & CRONOGRAMA LIBERADOS — ${eventName.toUpperCase()}*\n\n` +
      `O chaveamento oficial e o cronograma de tatames das lutas foram publicados!\n\n` +
      `Confira sua chave, horário previsto e tatame:\n` +
      `👉 ${bracketsUrl || window.location.origin}\n\n` +
      `_Boa sorte a todos os atletas e equipes!_ 🥋🔥`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  }
};
