package com.marketplace.backend;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@buildbid.com}")
    private String fromEmail;

    @Value("${app.email.from-name:BuildBid Team}")
    private String fromName;

    @Autowired
    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean sendVerificationOtpEmail(
            String toEmail,
            String recipientName,
            String otp,
            String purpose
    ) {
        if (toEmail == null || toEmail.isBlank() || otp == null || otp.isBlank()) {
            log.warn("[EmailService] Cannot dispatch email: recipient email or OTP is empty.");
            return false;
        }

        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "BuildBid User";
        String displayPurpose = (purpose != null && !purpose.isBlank()) ? purpose : "Email Verification";
        String subject = "BuildBid Verification: Your One-Time Password (OTP)";

        String htmlBody = buildHtmlEmailTemplate(displayName, otp, displayPurpose);

        if (mailSender == null) {
            // SMTP provider is not configured in this environment (e.g. local dev / test)
            // Log notice without exposing sensitive plaintext OTP
            log.info("[EmailService] JavaMailSender is not configured in application properties. Delivery simulated for recipient: {}", maskEmail(toEmail));
            return true;
        }

        return dispatchEmailInternal(toEmail, subject, htmlBody, true);
    }

    public boolean sendDeletionOtpEmail(String toEmail, String recipientName, String otp) {
        if (toEmail == null || toEmail.isBlank() || otp == null || otp.isBlank()) {
            log.warn("[EmailService] Cannot dispatch deletion OTP email: recipient email or OTP is empty.");
            return false;
        }

        // Strict delivery: No simulated delivery for permanent deletion OTP
        if (mailSender == null) {
            log.warn("[EmailService] JavaMailSender is not configured. Real delivery unavailable for deletion OTP recipient: {}.", maskEmail(toEmail));
            return false;
        }

        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "BuildBid User";
        String subject = "BuildBid: Permanent Account Deletion Verification Code | खाता हटाने के लिए सत्यापन कोड";
        String htmlBody = buildDeletionOtpHtmlTemplate(displayName, otp);

        return dispatchEmailInternal(toEmail, subject, htmlBody, false);
    }

    public boolean sendDeletionInitiatedEmail(String toEmail, String recipientName) {
        if (toEmail == null || toEmail.isBlank()) return false;
        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "BuildBid User";
        String subject = "BuildBid: Permanent Account Deletion Request Initiated | खाता हटाने का अनुरोध शुरू किया गया";
        String htmlBody = buildDeletionInitiatedHtmlTemplate(displayName);
        return dispatchEmailInternal(toEmail, subject, htmlBody, false);
    }

    public boolean sendDeletionOtpVerifiedEmail(String toEmail, String recipientName) {
        if (toEmail == null || toEmail.isBlank()) return false;
        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "BuildBid User";
        String subject = "BuildBid: Deletion Verification Completed | खाता हटाने का सत्यापन पूरा हुआ";
        String htmlBody = buildDeletionOtpVerifiedHtmlTemplate(displayName);
        return dispatchEmailInternal(toEmail, subject, htmlBody, false);
    }

    public boolean sendDeletionSecurityAlertEmail(String toEmail, String recipientName, String reason) {
        if (toEmail == null || toEmail.isBlank()) return false;
        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "BuildBid User";
        String subject = "BuildBid Security Alert: Deletion Verification Failed | सुरक्षा चेतावनी";
        String htmlBody = buildDeletionSecurityAlertHtmlTemplate(displayName, reason);
        return dispatchEmailInternal(toEmail, subject, htmlBody, false);
    }

    public boolean sendPermanentDeletionSuccessEmail(String toEmail, String recipientName) {
        if (toEmail == null || toEmail.isBlank()) return false;
        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "BuildBid User";
        String subject = "Your BuildBid Account Has Been Permanently Deleted | आपका BuildBid खाता स्थायी रूप से हटा दिया गया है";
        String htmlBody = buildPermanentDeletionSuccessHtmlTemplate(displayName);
        return dispatchEmailInternal(toEmail, subject, htmlBody, false);
    }

    public boolean sendAccountDeactivatedEmail(String toEmail, String recipientName) {
        if (toEmail == null || toEmail.isBlank()) return false;
        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "BuildBid User";
        String subject = "Your BuildBid Account Has Been Deactivated | आपका BuildBid खाता निष्क्रिय कर दिया गया है";
        String htmlBody = buildAccountDeactivatedHtmlTemplate(displayName);
        return dispatchEmailInternal(toEmail, subject, htmlBody, false);
    }

    private boolean dispatchEmailInternal(String toEmail, String subject, String htmlBody, boolean allowSimulation) {
        if (mailSender == null) {
            if (allowSimulation) {
                log.info("[EmailService] JavaMailSender is not configured. Delivery simulated for recipient: {}", maskEmail(toEmail));
                return true;
            } else {
                log.warn("[EmailService] JavaMailSender is not configured. Real delivery unavailable for recipient: {}", maskEmail(toEmail));
                return false;
            }
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name());

            helper.setTo(toEmail.trim());
            helper.setFrom(fromEmail, fromName);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("[EmailService] Email successfully delivered to {}", maskEmail(toEmail));
            return true;
        } catch (Exception ex) {
            log.error("[EmailService] Failed to deliver email to {}: {}", maskEmail(toEmail), ex.getMessage());
            return false;
        }
    }

    private String buildDeletionOtpHtmlTemplate(String recipientName, String otp) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>BuildBid Account Deletion Verification</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .email-header { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 26px; font-weight: 800; letter-spacing: 0.5px; margin: 0; color: #ffffff; }
                .brand-tagline { font-size: 13px; color: #fca5a5; margin-top: 4px; letter-spacing: 0.3px; }
                .email-body { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
                .heading { font-size: 19px; font-weight: 700; color: #991b1b; margin-bottom: 12px; }
                .otp-box-wrapper { text-align: center; margin: 24px 0; }
                .otp-box { display: inline-block; background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 10px; padding: 16px 36px; }
                .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #dc2626; margin: 0; }
                .otp-validity { font-size: 13px; color: #991b1b; margin-top: 8px; font-weight: 500; }
                .security-warning-box { background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 14px 16px; border-radius: 6px; margin: 24px 0; }
                .security-title { font-size: 13px; font-weight: 700; color: #9a3412; margin-bottom: 4px; }
                .security-text { font-size: 13px; color: #7c2d12; margin: 0; }
                .divider { border: 0; height: 1px; background: #e2e8f0; margin: 24px 0; }
                .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
                .footer p { margin: 4px 0; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="brand-title">BuildBid Security</div>
                  <div class="brand-tagline">Permanent Account Deletion Verification</div>
                </div>
                <div class="email-body">
                  <div class="heading">Permanent Account Deletion OTP</div>
                  <p>Hello {{recipientName}},</p>
                  <p>A request has been initiated to permanently delete your BuildBid account. This verification code is required to authorize the permanent deletion.</p>
                  <p><strong>Your permanent account deletion verification OTP is:</strong></p>
                  <div class="otp-box-wrapper">
                    <div class="otp-box">
                      <div class="otp-code">{{otp}}</div>
                      <div class="otp-validity">⏱ Valid for 10 minutes</div>
                    </div>
                  </div>
                  <div class="security-warning-box">
                    <div class="security-title">⚠️ Security Notice / सुरक्षा सूचना</div>
                    <div class="security-text">
                      Never share this OTP with anyone, including BuildBid support. If you did not request permanent deletion, someone may have unauthorized access to your account. Change your password immediately.
                    </div>
                  </div>
                  <hr class="divider">
                  <div style="font-size: 14px; color: #475569;">
                    <p><strong>हिंदी विवरण:</strong></p>
                    <p>नमस्ते {{recipientName}},</p>
                    <p>आपके BuildBid खाते को स्थायी रूप से हटाने का अनुरोध शुरू किया गया है।</p>
                    <p><strong>आपके खाते को स्थायी रूप से हटाने के सत्यापन के लिए OTP है:</strong> <strong>{{otp}}</strong> (10 मिनट के लिए मान्य)।</p>
                    <p>सुरक्षा चेतावनी: यह कोड किसी के साथ साझा न करें। यदि आपने यह अनुरोध नहीं किया है, तो तुरंत अपना पासवर्ड बदलें।</p>
                  </div>
                </div>
                <div class="footer">
                  <p><strong>BuildBid Security Team</strong> &bull; India's Premier Construction &amp; Material Marketplace</p>
                  <p>This is an automated system notification. Please do not reply directly to this email.</p>
                  <p>&copy; 2026 BuildBid. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            """;
        return template.replace("{{recipientName}}", escapeHtml(recipientName))
                       .replace("{{otp}}", otp);
    }

    private String buildDeletionInitiatedHtmlTemplate(String recipientName) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>BuildBid Account Deletion Request Initiated</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .email-header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 26px; font-weight: 800; letter-spacing: 0.5px; margin: 0; color: #ffffff; }
                .brand-tagline { font-size: 13px; color: #94a3b8; margin-top: 4px; }
                .email-body { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
                .heading { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
                .alert-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 20px 0; }
                .divider { border: 0; height: 1px; background: #e2e8f0; margin: 24px 0; }
                .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="brand-title">BuildBid Security</div>
                  <div class="brand-tagline">Account Security Notice</div>
                </div>
                <div class="email-body">
                  <div class="heading">Permanent Account Deletion Request Initiated</div>
                  <p>Hello {{recipientName}},</p>
                  <p>A permanent account deletion request has been initiated for your BuildBid account.</p>
                  <p>Dual-channel verification is required before permanent deletion can be authorized. A 6-digit OTP has been sent to both your verified email address and verified mobile number.</p>
                  <div class="alert-box">
                    <strong>Notice:</strong> Your account has NOT been deleted yet. Deletion will only take place once OTP verification and final confirmation are completed.
                  </div>
                  <p>If you did not initiate this request, please secure your account immediately by changing your password or contacting BuildBid support.</p>
                  <hr class="divider">
                  <div style="font-size: 14px; color: #475569;">
                    <p><strong>हिंदी विवरण:</strong></p>
                    <p>नमस्ते {{recipientName}},</p>
                    <p>आपके BuildBid खाते को स्थायी रूप से हटाने का अनुरोध शुरू किया गया है।</p>
                    <p>सत्यापन कोड आपके सत्यापित ईमेल और मोबाइल नंबर पर भेजा गया है। अभी आपका खाता हटाया नहीं गया है। यदि यह अनुरोध आपने नहीं किया है, तो कृपया तुरंत अपना पासवर्ड बदलें।</p>
                  </div>
                </div>
                <div class="footer">
                  <p><strong>BuildBid Security Team</strong> &bull; India's Premier Construction &amp; Material Marketplace</p>
                  <p>&copy; 2026 BuildBid. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            """;
        return template.replace("{{recipientName}}", escapeHtml(recipientName));
    }

    private String buildDeletionOtpVerifiedHtmlTemplate(String recipientName) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Deletion Verification Completed</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .email-header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 26px; font-weight: 800; margin: 0; color: #ffffff; }
                .email-body { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
                .heading { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
                .success-badge { display: inline-block; background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 6px; font-weight: 600; margin-bottom: 16px; }
                .divider { border: 0; height: 1px; background: #e2e8f0; margin: 24px 0; }
                .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="brand-title">BuildBid Security</div>
                </div>
                <div class="email-body">
                  <div class="success-badge">&#10003; Verification Succeeded</div>
                  <div class="heading">Permanent Account Deletion Verification Completed</div>
                  <p>Hello {{recipientName}},</p>
                  <p>Your permanent account deletion verification was successfully completed.</p>
                  <p>Deletion authorization has been verified. Final permanent deletion is now authorized. If you did not authorize this, contact BuildBid Security immediately.</p>
                  <hr class="divider">
                  <div style="font-size: 14px; color: #475569;">
                    <p><strong>हिंदी विवरण:</strong></p>
                    <p>नमस्ते {{recipientName}},</p>
                    <p>आपके खाते को स्थायी रूप से हटाने का सत्यापन सफलतापूर्वक पूरा हो गया है।</p>
                    <p>खाता हटाने का अनुरोध अधिकृत कर दिया गया है। यदि यह आपने नहीं किया है, तो तुरंत BuildBid सुरक्षा से संपर्क करें।</p>
                  </div>
                </div>
                <div class="footer">
                  <p><strong>BuildBid Security Team</strong> &bull; India's Premier Construction &amp; Material Marketplace</p>
                  <p>&copy; 2026 BuildBid. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            """;
        return template.replace("{{recipientName}}", escapeHtml(recipientName));
    }

    private String buildDeletionSecurityAlertHtmlTemplate(String recipientName, String reason) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>BuildBid Security Alert</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .email-header { background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 26px; font-weight: 800; margin: 0; color: #ffffff; }
                .email-body { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
                .alert-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 20px 0; }
                .divider { border: 0; height: 1px; background: #e2e8f0; margin: 24px 0; }
                .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="brand-title">BuildBid Security Alert</div>
                </div>
                <div class="email-body">
                  <div class="alert-box">
                    <strong>Security Warning / सुरक्षा चेतावनी</strong><br>
                    {{reason}}
                  </div>
                  <p>Hello {{recipientName}},</p>
                  <p>An invalid or expired verification code attempt was detected for your account deletion request. For your security, the code has been invalidated.</p>
                  <p>If you did not perform these actions, someone may be attempting unauthorized access. Please change your password immediately.</p>
                  <hr class="divider">
                  <div style="font-size: 14px; color: #475569;">
                    <p><strong>हिंदी विवरण:</strong></p>
                    <p>नमस्ते {{recipientName}},</p>
                    <p>आपके खाते को हटाने के अनुरोध के लिए अमान्य या समाप्त सत्यापन प्रयास दर्ज किए गए हैं। सुरक्षा कारणों से सत्यापन कोड रद्द कर दिया गया है।</p>
                    <p>यदि यह प्रयास आपने नहीं किए हैं, तो तुरंत अपना पासवर्ड बदलें।</p>
                  </div>
                </div>
                <div class="footer">
                  <p><strong>BuildBid Security Team</strong> &bull; India's Premier Construction &amp; Material Marketplace</p>
                  <p>&copy; 2026 BuildBid. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            """;
        return template.replace("{{reason}}", escapeHtml(reason))
                       .replace("{{recipientName}}", escapeHtml(recipientName));
    }

    private String buildPermanentDeletionSuccessHtmlTemplate(String recipientName) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>BuildBid Account Permanently Deleted</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .email-header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 26px; font-weight: 800; margin: 0; color: #ffffff; }
                .brand-tagline { font-size: 13px; color: #94a3b8; margin-top: 4px; }
                .email-body { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
                .main-heading { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
                .hindi-heading { font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 6px; margin-bottom: 20px; }
                .info-box { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 13.5px; }
                .divider { border: 0; height: 1px; background: #e2e8f0; margin: 24px 0; }
                .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="brand-title">BuildBid</div>
                  <div class="brand-tagline">Build Better, Bid Smarter.</div>
                </div>
                <div class="email-body">
                  <div class="main-heading">Your BuildBid Account Has Been Permanently Deleted</div>
                  <div class="hindi-heading">आपका BuildBid खाता स्थायी रूप से हटा दिया गया है</div>
                  <p>Hello {{recipientName}},</p>
                  <p>Your BuildBid account has been permanently deleted as per your authorized request.</p>
                  <p>All login credentials and active sessions have been permanently terminated. Your personal profile, preferences, and saved locations have been removed from the platform.</p>
                  <div class="info-box">
                    <strong>Data Integrity Notice:</strong> In accordance with marketplace operational standards and legal compliance, non-personal shared business records (such as completed orders, contractor bids, and transaction histories) may be securely retained without personal contact information.
                  </div>
                  <p>If you believe this deletion was unauthorized or performed in error, please contact BuildBid support immediately.</p>
                  <hr class="divider">
                  <div style="font-size: 14px; color: #475569;">
                    <p><strong>हिंदी विवरण:</strong></p>
                    <p>नमस्ते {{recipientName}},</p>
                    <p>आपके अधिकृत अनुरोध के अनुसार आपका BuildBid खाता स्थायी रूप से हटा दिया गया है।</p>
                    <p>इस खाते से संबंधित सभी लॉगिन क्रेडेंशियल और सक्रिय सत्र हमेशा के लिए समाप्त कर दिए गए हैं। आपकी व्यक्तिगत प्रोफ़ाइल, प्राथमिकताएं और सहेजे गए पते हटा दिए गए हैं।</p>
                    <p>प्लेटफ़ॉर्म अखंडता और व्यावसायिक आवश्यकताओं के अनुसार, गैर-व्यक्तिगत साझा रिकॉर्ड (जैसे पूर्ण किए गए ऑर्डर और बोलियां) सुरक्षित रूप से बनाए रखे जा सकते हैं।</p>
                    <p>यदि यह प्रक्रिया अनधिकृत थी, तो तुरंत BuildBid सहायता से संपर्क करें।</p>
                  </div>
                </div>
                <div class="footer">
                  <p><strong>BuildBid Team</strong> &bull; India's Premier Construction &amp; Material Marketplace</p>
                  <p>&copy; 2026 BuildBid. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            """;
        return template.replace("{{recipientName}}", escapeHtml(recipientName));
    }

    private String buildAccountDeactivatedHtmlTemplate(String recipientName) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>BuildBid Account Deactivated</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .email-header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 26px; font-weight: 800; margin: 0; color: #ffffff; }
                .email-body { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
                .main-heading { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
                .hindi-heading { font-size: 17px; font-weight: 700; color: #334155; margin-bottom: 20px; }
                .info-box { background-color: #f8fafc; border-left: 4px solid #64748b; padding: 14px 16px; border-radius: 6px; margin: 20px 0; }
                .divider { border: 0; height: 1px; background: #e2e8f0; margin: 24px 0; }
                .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="brand-title">BuildBid</div>
                </div>
                <div class="email-body">
                  <div class="main-heading">Your BuildBid Account Has Been Deactivated</div>
                  <div class="hindi-heading">आपका BuildBid खाता निष्क्रिय कर दिया गया है</div>
                  <p>Hello {{recipientName}},</p>
                  <p>Your BuildBid account has been successfully deactivated as per your request.</p>
                  <p>Your login access has been disabled, and all active sessions have been logged out.</p>
                  <div class="info-box">
                    <strong>Account Status:</strong> Your account data has NOT been permanently deleted and remains securely stored. If you wish to reactivate your account in the future, please contact BuildBid support.
                  </div>
                  <hr class="divider">
                  <div style="font-size: 14px; color: #475569;">
                    <p><strong>हिंदी विवरण:</strong></p>
                    <p>नमस्ते {{recipientName}},</p>
                    <p>आपके अनुरोध के अनुसार आपका BuildBid खाता सफलतापूर्वक निष्क्रिय कर दिया गया है।</p>
                    <p>आपकी लॉगिन पहुंच अक्षम कर दी गई है और सभी सक्रिय सत्र समाप्त कर दिए गए हैं। आपका खाता डेटा हटाया नहीं गया है और सुरक्षित संग्रहीत है। यदि आप भविष्य में अपना खाता पुनः सक्रिय करना चाहते हैं, तो कृपया BuildBid सहायता से संपर्क करें।</p>
                  </div>
                </div>
                <div class="footer">
                  <p><strong>BuildBid Team</strong> &bull; India's Premier Construction &amp; Material Marketplace</p>
                  <p>&copy; 2026 BuildBid. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            """;
        return template.replace("{{recipientName}}", escapeHtml(recipientName));
    }

    private String buildHtmlEmailTemplate(String recipientName, String otp, String purpose) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>BuildBid Verification</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .email-container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .email-header { background: linear-gradient(135deg, #0b2545 0%, #133c6d 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                .brand-title { font-size: 26px; font-weight: 800; letter-spacing: 0.5px; margin: 0; color: #ffffff; }
                .brand-tagline { font-size: 13px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.3px; }
                .email-body { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
                .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
                .instructions { font-size: 15px; color: #475569; margin-bottom: 24px; }
                .otp-box-wrapper { text-align: center; margin: 28px 0; }
                .otp-box { display: inline-block; background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 10px; padding: 16px 36px; }
                .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0284c7; margin: 0; }
                .otp-validity { font-size: 13px; color: #64748b; margin-top: 8px; font-weight: 500; }
                .security-warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 6px; margin: 24px 0; }
                .security-title { font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 4px; }
                .security-text { font-size: 13px; color: #7f1d1d; margin: 0; }
                .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
                .footer p { margin: 4px 0; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <div class="brand-title">BuildBid</div>
                  <div class="brand-tagline">Build Better, Bid Smarter.</div>
                </div>
                <div class="email-body">
                  <div class="greeting">Hello %s,</div>
                  <div class="instructions">
                    You recently requested a one-time verification code for <strong>%s</strong> on your BuildBid account. Use the code below to complete this verification.
                  </div>
                  <div class="otp-box-wrapper">
                    <div class="otp-box">
                      <div class="otp-code">%s</div>
                      <div class="otp-validity">⏱ Valid for 10 minutes</div>
                    </div>
                  </div>
                  <div class="security-warning-box">
                    <div class="security-title">⚠️ Security Notice</div>
                    <div class="security-text">
                      Never share this OTP with anyone, including BuildBid support staff. BuildBid will never contact you asking for your verification code.
                    </div>
                  </div>
                  <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                    If you did not initiate this request, someone may have entered your email by mistake. You can safely ignore this email.
                  </p>
                </div>
                <div class="footer">
                  <p><strong>BuildBid Team</strong> &bull; India's Premier Construction &amp; Material Marketplace</p>
                  <p>This is an automated system notification. Please do not reply directly to this email.</p>
                  <p>&copy; 2026 BuildBid. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(escapeHtml(recipientName), escapeHtml(purpose), otp);
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String name = parts[0];
        if (name.length() <= 2) return "**@" + parts[1];
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + parts[1];
    }
}
