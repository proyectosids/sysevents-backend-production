"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplateText = renderTemplateText;
exports.renderBrandedEmail = renderBrandedEmail;
const presentations = {
    user_registered: { category: 'Cuenta', actionLabel: 'Ingresar a SysEvents', actionVariable: 'actionUrl' },
    registration_confirmed: { category: 'Inscripción', actionLabel: 'Consultar mi inscripción', actionVariable: 'actionUrl', alertTone: 'success' },
    payment_confirmed: { category: 'Pago', actionLabel: 'Consultar mi comprobante', actionVariable: 'actionUrl', alertTone: 'success' },
    submission_received: { category: 'Trabajos académicos', actionLabel: 'Consultar mi trabajo', actionVariable: 'actionUrl', alertTone: 'success' },
    review_assigned: {
        category: 'Revisión académica', actionLabel: 'Comenzar revisión', actionVariable: 'actionUrl',
        alert: 'Esta asignación requiere tu atención. Revisa el material y registra un dictamen sustentado dentro del plazo establecido.', alertTone: 'warning',
    },
    review_completed: {
        category: 'Seguimiento académico', actionLabel: 'Verificar dictamen', actionVariable: 'actionUrl',
        alert: 'Acción requerida: verifica la recomendación recibida para evitar que se acumulen dictámenes pendientes en el flujo académico.', alertTone: 'warning',
    },
    review_returned: {
        category: 'Corrección requerida', actionLabel: 'Atender observaciones', actionVariable: 'actionUrl',
        alert: 'La revisión fue devuelta y requiere correcciones antes de poder continuar. Atiende las observaciones a la brevedad.', alertTone: 'warning',
    },
    review_reminder: {
        category: 'Recordatorio prioritario', actionLabel: 'Atender revisión pendiente', actionVariable: 'actionUrl',
        alert: 'Los pendientes de dictaminación se están acumulando. Es necesario atender esta revisión con prioridad para no retrasar el proceso académico.', alertTone: 'warning',
    },
    changes_requested: { category: 'Cambios solicitados', actionLabel: 'Atender cambios', actionVariable: 'actionUrl', alertTone: 'warning' },
    submission_accepted: { category: 'Resolución académica', actionLabel: 'Consultar resolución', actionVariable: 'actionUrl', alertTone: 'success' },
    submission_rejected: { category: 'Resolución académica', actionLabel: 'Consultar resolución', actionVariable: 'actionUrl' },
    tenant_invitation: { category: 'Invitación', actionLabel: 'Aceptar invitación', actionVariable: 'invitationUrl' },
    evaluator_invitation: { category: 'Invitación académica', actionLabel: 'Aceptar invitación', actionVariable: 'invitationUrl' },
    evaluation_returned: {
        category: 'Corrección requerida', actionLabel: 'Atender evaluación', actionVariable: 'actionUrl',
        alert: 'La evaluación requiere ajustes antes de su liberación. Revisa las observaciones y vuelve a enviarla a la brevedad.', alertTone: 'warning',
    },
    evaluation_released: { category: 'Evaluación disponible', actionLabel: 'Consultar evaluación', actionVariable: 'actionUrl', alertTone: 'success' },
    password_reset: { category: 'Seguridad de la cuenta', actionLabel: 'Restablecer contraseña', actionVariable: 'resetUrl', alertTone: 'warning' },
};
const detailLabels = {
    organizationName: 'Organización', eventName: 'Evento', roleName: 'Rol asignado',
    submissionTitle: 'Trabajo', dueDate: 'Fecha límite', expiresIn: 'Vigencia del enlace', reason: 'Observaciones',
};
function renderTemplateText(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => variables[key] ?? '');
}
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] ?? character);
}
function safeActionUrl(value) {
    if (!value)
        return null;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
    }
    catch {
        return null;
    }
}
function paragraphHtml(body, actionUrl) {
    return body.split(/\r?\n\s*\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph && (!actionUrl || paragraph !== actionUrl))
        .map((paragraph) => `<p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7;">${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`)
        .join('');
}
function detailsHtml(variables) {
    const rows = Object.entries(detailLabels)
        .filter(([key]) => Boolean(variables[key]?.trim()))
        .map(([key, label]) => `<tr>
      <td style="padding:10px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;width:34%;">${label}</td>
      <td style="padding:10px 12px;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(variables[key])}</td>
    </tr>`).join('');
    return rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">${rows}</table>` : '';
}
function renderBrandedEmail(input) {
    const presentation = presentations[input.templateKey] ?? { category: 'Notificación' };
    const actionUrl = safeActionUrl(presentation.actionVariable ? input.variables[presentation.actionVariable] : input.variables.actionUrl);
    const alertBackground = presentation.alertTone === 'success' ? '#ecfdf5' : presentation.alertTone === 'warning' ? '#fff7ed' : '#eff6ff';
    const alertBorder = presentation.alertTone === 'success' ? '#10b981' : presentation.alertTone === 'warning' ? '#f59e0b' : '#3b82f6';
    const renderedBody = renderTemplateText(input.body, input.variables).trim();
    const text = `${renderedBody}\n\n${presentation.alert ?? ''}${presentation.alert ? '\n\n' : ''}${actionUrl && !renderedBody.includes(actionUrl) ? `${presentation.actionLabel ?? 'Abrir SysEvents'}: ${actionUrl}\n\n` : ''}Atentamente,\nSistema SysEvents`.trim();
    const preheader = presentation.alert ?? renderedBody.replace(/\s+/g, ' ').slice(0, 150);
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #dbe3ec;border-radius:16px;border-collapse:separate;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08);">
        <tr><td style="padding:26px 38px;background:#073f62;border-bottom:4px solid #13a8c7;">
          <div style="color:#ffffff;font-size:25px;font-weight:700;letter-spacing:.2px;">SysEvents</div>
          <div style="margin-top:5px;color:#bae6fd;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;">Gestión académica de eventos</div>
        </td></tr>
        <tr><td style="padding:38px;">
          <div style="margin-bottom:14px;color:#0785a4;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(presentation.category)}</div>
          <h1 style="margin:0 0 24px;color:#0f2f44;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.25;font-weight:500;">${escapeHtml(input.subject)}</h1>
          ${paragraphHtml(renderedBody, actionUrl)}
          ${detailsHtml(input.variables)}
          ${presentation.alert ? `<div style="margin:2px 0 24px;padding:15px 17px;background:${alertBackground};border-left:4px solid ${alertBorder};border-radius:8px;color:#334155;font-size:14px;line-height:1.6;"><strong>Importante:</strong> ${escapeHtml(presentation.alert)}</div>` : ''}
          ${actionUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;"><tr><td bgcolor="#087f8c" style="border-radius:8px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(presentation.actionLabel ?? 'Abrir SysEvents')}</a></td></tr></table>` : ''}
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.65;">Atentamente,<br><strong>Sistema SysEvents</strong></p>
        </td></tr>
        <tr><td style="padding:22px 38px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.55;">
          Este es un mensaje automático generado por SysEvents. No respondas a este correo. Si no reconoces la actividad, comunícate con la administración de tu evento.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    return { text, html };
}
//# sourceMappingURL=email-template-renderer.js.map