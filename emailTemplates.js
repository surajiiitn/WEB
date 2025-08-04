// emailTemplates.js

module.exports = {
  otpEmailHtml: function (otp) {
    return `
    <body style="margin:0; padding:0; background-color:#f4f4f7; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f7; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="400" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); padding: 30px;">
              <tr>
                <td style="text-align:center; padding-bottom: 20px;">
                  <h2 style="color:#5c3d99; margin:0;">Your OTP Code</h2>
                </td>
              </tr>
              <tr>
                <td style="font-size: 16px; color:#333333; padding-bottom: 20px; text-align:center;">
                  Use the following One-Time Password (OTP) to complete your registration.
                </td>
              </tr>
              <tr>
                <td style="text-align:center; padding: 10px 0;">
                  <span style="font-size: 36px; letter-spacing: 5px; font-weight: bold; color:#5c3d99; background-color:#e0dfff; padding: 10px 25px; border-radius: 6px; display: inline-block;">
                    ${otp}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="font-size: 14px; color:#666666; text-align:center; padding-top: 20px;">
                  This OTP is valid for 5 minutes.<br>
                  If you did not request this, please ignore this email.
                </td>
              </tr>
              <tr>
                <td style="text-align:center; padding-top: 30px; font-size: 14px; color:#999999;">
                  &copy; 2025 Team Elevate
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    `;
  },

  successEmailHtml: function (firstName) {
    return `
    <body style="margin:0; padding:0; background-color:#f4f4f7; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f7; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="420" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); padding: 30px;">
              <tr>
                <td style="text-align:center; padding-bottom: 20px;">
                  <h2 style="color:#5c3d99; margin:0;">Registration Successful!</h2>
                </td>
              </tr>
              <tr>
                <td style="font-size: 16px; color:#333333; padding-bottom: 25px; text-align:center;">
                  Hello <strong>${firstName}</strong>,<br>
                  Thank you for registering for Genathon 3.0. We're excited to have you on board!
                </td>
              </tr>
              <tr>
                <td style="text-align:center; padding-bottom: 30px;">
                  <a href="https://chat.whatsapp.com/GnBtWJ7BQJg0TS2daI9rPO?mode=ac_t" style="background-color:#5c3d99; color:white; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                    Join WhatsApp Group
                  </a>
                </td>
              </tr>
              <tr>
                <td style="text-align:center; font-size: 14px; color:#999999;">
                  &copy; 2025 Team Elevate
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    `;
  },
};
