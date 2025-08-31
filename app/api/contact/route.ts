// lib/email.ts

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service: string;
  subService?: string;
  message: string;
}

// lib/email.ts
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service: string;
  subService?: string;
  message: string;
}

// SMTP transporter oluştur
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email gönderme fonksiyonu
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"Auroco Contact" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Contact form email template
export function createContactFormEmail(data: ContactFormData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        Yeni Teklif Talebi
      </h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #495057; margin-top: 0;">İletişim Bilgileri</h3>
        <p><strong>Ad Soyad:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${data.phone ? `<p><strong>Telefon:</strong> ${data.phone}</p>` : ''}
        ${data.company ? `<p><strong>Şirket:</strong> ${data.company}</p>` : ''}
      </div>

      <div style="background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #495057; margin-top: 0;">Hizmet Detayları</h3>
        <p><strong>Ana Hizmet:</strong> ${data.service}</p>
        ${data.subService ? `<p><strong>Alt Hizmet:</strong> ${data.subService}</p>` : ''}
        
        <h4 style="color: #495057;">Mesaj:</h4>
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px;">
          ${data.message.replace(/\n/g, '<br>')}
        </div>
      </div>

      <div style="margin: 30px 0; padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px;">
        <p style="margin: 0; color: #155724;">
          <strong>💡 Aksiyon:</strong> Bu talebi inceleyip 24 saat içerisinde müşteriye geri dönüş yapınız.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
      
      <p style="color: #6c757d; font-size: 12px; text-align: center;">
        Bu email Auroco web sitesi iletişim formu aracılığıyla gönderilmiştir.<br>
        Gönderim tarihi: ${new Date().toLocaleString('tr-TR')}
      </p>
    </div>
  `;
}

// Müşteriye otomatik yanıt template
export function createAutoReplyEmail(customerName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Auroco</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Teknoloji ve İnovasyon Danışmanlığı</p>
      </div>

      <div style="padding: 30px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333;">Merhaba ${customerName},</h2>
        
        <p>Auroco web sitemiz üzerinden göndermiş olduğunuz teklif talebini aldık. Mesajınız için teşekkür ederiz.</p>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0;">
          <h3 style="color: #0056b3; margin-top: 0;">Ne olacak?</h3>
          <ul style="color: #495057; padding-left: 20px;">
            <li>Talebiniz uzman ekibimiz tarafından incelenecek</li>
            <li>24 saat içerisinde size geri dönüş yapacağız</li>
            <li>İhtiyacınıza en uygun çözümü birlikte belirleyeceğiz</li>
          </ul>
        </div>

        <p>Bu süre zarfında aklınıza takılan sorular için bize <a href="mailto:info@auroco.com" style="color: #007bff;">info@auroco.com</a> adresinden ulaşabilirsiniz.</p>

        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">

        <div style="text-align: center;">
          <p style="color: #6c757d; margin-bottom: 10px;">Bizi takip edin:</p>
          <div>
            <a href="#" style="color: #007bff; text-decoration: none; margin: 0 10px;">LinkedIn</a>
            <a href="#" style="color: #007bff; text-decoration: none; margin: 0 10px;">Twitter</a>
            <a href="#" style="color: #007bff; text-decoration: none; margin: 0 10px;">Website</a>
          </div>
        </div>
      </div>

      <p style="color: #6c757d; font-size: 12px; text-align: center; margin-top: 20px;">
        © 2025 Auroco. Tüm hakları saklıdır.
      </p>
    </div>
  `;
}

// Contact form için email gönderme
export async function sendContactFormNotification(data: ContactFormData) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL environment variable is not set');
  }

  const subject = `Yeni Teklif Talebi - ${data.service} (${data.name})`;
  const html = createContactFormEmail(data);

  return await sendEmail({
    to: adminEmail,
    subject,
    html,
  });
}

// Müşteriye otomatik yanıt gönderme
export async function sendAutoReply(customerEmail: string, customerName: string) {
  const subject = 'Talebinizi Aldık - Auroco';
  const html = createAutoReplyEmail(customerName);

  return await sendEmail({
    to: customerEmail,
    subject,
    html,
  });
}