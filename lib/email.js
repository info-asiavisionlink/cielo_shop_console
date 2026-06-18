'use server'
import { Resend } from 'resend'

const FROM = 'CIELO <orders@mail.asia-link-ai.com>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// ── 共通HTMLレイアウト
function layout(content) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;">
  <tr>
    <td align="center" style="padding:48px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- ロゴ -->
        <tr>
          <td style="padding-bottom:28px;text-align:center;border-bottom:1px solid rgba(200,169,110,0.25);">
            <img src="https://res.cloudinary.com/deyc8gz2k/image/upload/v1781495771/e6azpivui9xg68hr1ria.png" alt="CIELO" style="height:36px;display:block;margin:0 auto;">
          </td>
        </tr>

        <!-- コンテンツ -->
        ${content}

        <!-- フッター -->
        <tr>
          <td style="padding-top:32px;border-top:1px solid rgba(240,244,255,0.07);text-align:center;">
            <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.12em;color:rgba(240,244,255,0.3);text-transform:uppercase;">CIELO / ASIA VISION LINK</p>
            <p style="margin:0;font-size:11px;color:rgba(240,244,255,0.2);">お問い合わせ: <a href="mailto:info@asiavision.link" style="color:#c8a96e;text-decoration:none;">info@asiavision.link</a></p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// ── 発送通知メール
export async function sendShippingNotification({ to, customerName, orderId, trackingNumber, items = [] }) {
  if (!to) return

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#f0f4ff;border-bottom:1px solid rgba(240,244,255,0.06);">
        ${item.product_name}${item.variant_label ? ` <span style="color:rgba(240,244,255,0.45);font-size:12px;">/ ${item.variant_label}</span>` : ''}
      </td>
      <td style="padding:8px 0;font-size:13px;color:rgba(240,244,255,0.6);text-align:right;border-bottom:1px solid rgba(240,244,255,0.06);">
        × ${item.quantity}
      </td>
    </tr>`).join('')

  const content = `
    <tr>
      <td style="padding:36px 0 28px 0;text-align:center;">
        <p style="margin:0 0 10px 0;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#c8a96e;text-transform:uppercase;">Shipped</p>
        <p style="margin:0;font-size:26px;font-weight:300;color:#f0f4ff;letter-spacing:0.04em;">ご注文が発送されました</p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:28px;font-size:14px;color:rgba(240,244,255,0.7);line-height:1.8;">
        ${customerName ? `${customerName} 様、` : ''}こんにちは。<br>
        ご注文の商品が発送されました。下記の追跡番号でお荷物の状況をご確認いただけます。
      </td>
    </tr>

    <!-- 追跡番号 -->
    <tr>
      <td style="padding:24px;background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.25);border-radius:4px;text-align:center;margin-bottom:28px;">
        <p style="margin:0 0 8px 0;font-size:10px;letter-spacing:0.14em;color:#c8a96e;text-transform:uppercase;">追跡番号</p>
        <p style="margin:0;font-size:22px;font-weight:600;color:#f0f4ff;letter-spacing:0.08em;">${trackingNumber}</p>
      </td>
    </tr>
    <tr><td style="height:24px;"></td></tr>

    <!-- 注文商品 -->
    ${items.length ? `
    <tr>
      <td>
        <p style="margin:0 0 12px 0;font-size:10px;font-weight:700;letter-spacing:0.14em;color:rgba(240,244,255,0.4);text-transform:uppercase;">発送商品</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemRows}
        </table>
      </td>
    </tr>
    <tr><td style="height:28px;"></td></tr>
    ` : ''}

    <tr>
      <td style="padding:16px;background:rgba(240,244,255,0.03);border:1px solid rgba(240,244,255,0.07);border-radius:4px;">
        <p style="margin:0;font-size:12px;color:rgba(240,244,255,0.45);line-height:1.7;">
          ご不明な点がございましたら、お気軽にお問い合わせください。<br>
          注文ID: <span style="font-family:monospace;color:rgba(240,244,255,0.6);">${orderId.slice(0, 8)}...</span>
        </p>
      </td>
    </tr>
    <tr><td style="height:32px;"></td></tr>`

  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: 'ご注文が発送されました | CIELO',
      html: layout(content),
    })
  } catch (err) {
    console.error('[CIELO Email] 発送通知メール送信失敗:', err.message)
  }
}
