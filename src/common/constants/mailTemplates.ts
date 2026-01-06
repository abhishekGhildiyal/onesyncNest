import { TemplatesSlug } from "src/modules/mail/mail.constants";

export const Templates = [
  {
    slug: TemplatesSlug.NewPackage,
    variablesInIT: `frontendURL, packageLink, storeName, userEmail, password, supportEmail, project, oneSyncLogo, storeLogo `,
    subject: `Package Order Sheet`,
    html: `</html>
                <!DOCTYPE html>
                <html>

                <head>
                    <meta charset="UTF-8" />
                    <title>Order Request Notification</title>
                </head>

                <body style="margin:0; padding:0; background-color:#f0f2f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding: 10px 20px 0;">
                        <tr>
                            <td align="center">
                                <!-- Outer container -->
                                <table width="600" cellpadding="0" cellspacing="0"
                                    style="background-color:#ffffff; border-radius:8px; font-family:Arial, sans-serif;">

                                    <!-- Header -->
                                    <tr>
                                        <td style="padding: 20px; text-align: left; border-bottom: 1px solid #e0e0e0;">
                                            <table width="100%">
                                                <tr>
                                                    <td>
                                                      <img src="{{storeLogo}}" style="margin-left:10px; width:40px; height:40px; object-fit: contain;" alt="storeLogo">
                                                    </td>
                                                    <td align="right">
                                                        <img src="{{oneSyncLogo}}" style="margin-left:10px; width:40px; height:40px; object-fit: contain;" alt="oneSyncLogo">
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- Body -->
                                    <tr>
                                        <td style="padding: 40px 30px; text-align: center;">
                                            <img src="{{frontendURL}}images/mail.png" width="50" alt="Order Icon"
                                                style="margin-bottom: 20px;" />

                                            <h2 style="color: #4e5ef3; margin: 0 auto; width: 360px;">{{storeName}} <span
                                                    style="color: #000;">has shared a product access list with you.</span></h2>

                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding: 0 40px 30px 40px; background-color: #fff; text-align: center; border-bottom: 1px dashed #5d5fef18;">
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td align="center">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="background-color: #e0e0e0; border-radius: 8px;width: 100%; ">
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="padding: 20px 15px; text-align: center;">
                                                                            <div
                                                                                style="font-size: 16px; font-weight: bold; color: #666666; margin-bottom: 10px;">
                                                                                Click the link below to access:
                                                                            </div>
                                                                            <table >
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td width="8%"></td>
                                                                                        <td width="77%">
                                                                                            <a href="{{packageLink}}"
                                                                                                style="color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 500; word-break: break-all; text-decoration: underline;">
                                                                                                {{packageLink}}
                                                                                            </a>
                                                                                        </td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>

                                                                        </td>
                                                                    </tr>
                                                                
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                    
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- CREDENTIALS_PLACEHOLDER -->
            


                                    <tr>
                                        <td align="center" style="font-size: 16px; color: #999999; padding: 20px;">Powered by
                                            <a href="{{supportEmail}}" target="_blank"
                                                style="color: #2BB770; text-decoration: none;">{{project}}</a>
                                        </td>
                                    </tr>

                                </table>
                            </td>
                        </tr>
                    </table>
                </body>

                </html>`,
  },
  {
    slug: TemplatesSlug.OrderRequestSubmit,
    variablesInIT: `project, orderNo, consumerName, link, supportEmail, frontendURL, storeLogo, oneSyncLogo `,
    subject: `Order Request`,
    html: `<!DOCTYPE html>
                <html>

                <head>
                    <meta charset="UTF-8" />
                    <title>store share order sheet</title>
                </head>

                <body style="margin:0; padding:0; background-color:#f0f2f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding: 20px 0;">
                        <tr>
                            <td align="center">
                                <!-- Outer container -->
                                <table width="600" cellpadding="0" cellspacing="0"
                                    style="background-color:#ffffff; border-radius:8px; font-family:Arial, sans-serif;">

                                    <!-- Header -->
                                    <tr>
                                        <td style="padding: 20px; text-align: left; border-bottom: 1px solid #e0e0e0;">
                                        <table width="100%">
                                                 <tr>
                                                    <td>
                                                      <img src="{{storeLogo}}" style="margin-left:10px; width:40px; height:40px; object-fit: contain;" alt="storeLogo">
                                                    </td>
                                                    <td align="right">
                                                        <img src="{{oneSyncLogo}}" style="margin-left:10px; width:40px; height:40px; object-fit: contain;" alt="oneSyncLogo">
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- Body -->
                                    <tr>
                                        <td style="padding: 40px 30px; text-align: center;">
                                            <img src="{{frontendURL}}images/mail.png" width="50" alt="Order Icon"
                                                style="margin-bottom: 20px;" />

                                            <h2 style="color: #4e5ef3; margin: 0 auto; width: 300px;">{{project}} <span
                                                    style="color: #000;">{{orderNo}} {{consumerName}}</span> has submitted an order request</h2>

                                        </td>
                                    </tr>
                            

                                    <tr>
                                        <td style="padding: 10px 40px;">
                                            <a href="{{link}}" style="display:block; padding:12px 30px; background-color:#4e5ef3;width: 200px; text-align: center;  color:#fff; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px; margin: 0 auto;">Click Here</a>
                                        </td>
                                    </tr>
                                   <tr>
                                        <td align="center" style="font-size: 16px; color: #999999; padding: 20px;">Powered by
                                            <a href="{{supportEmail}}" target="_blank"
                                                style="color: #2BB770; text-decoration: none;">{{project}}</a>
                                        </td>
                                    </tr>

                                </table>
                            </td>
                        </tr>
                    </table>
                </body>

                </html>`,
  },
  {
    slug: TemplatesSlug.ReviewOrderConsumer,
    variablesInIT: `project, orderNo, storeName, link, supportEmail, frontendURL, storeLogo, oneSyncLogo `,
    subject: `Order Request`,
    html: `<!DOCTYPE html>
            <html>

            <head>
                <meta charset="UTF-8" />
                <title>consumer finalize order</title>
            </head>

            <body style="margin:0; padding:0; background-color:#f0f2f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding: 20px 0;">
                    <tr>
                        <td align="center">
                            <!-- Outer container -->
                            <table width="600" cellpadding="0" cellspacing="0"
                                style="background-color:#ffffff; border-radius:8px; font-family:Arial, sans-serif;">

                                <!-- Header -->
                                <tr>
                                    <td style="padding: 20px; text-align: left; border-bottom: 1px solid #e0e0e0;">
                                        <table width="100%">
                                            <tr>
                                                <td style="font-size: 24px; font-weight: bold; color: #c0a562;">{{project}}</td>
                                                <td align="right">
                                                    <a href="{{twitterLink}}"><img src="{{frontendURL}}images/twitter.png"
                                                            width="20" style="margin-left:10px; width:20px; height:20px" alt="Twitter"></a>
                                                    <a href="{{fbLink}}"><img src="{{frontendURL}}images/fb.png"
                                                            width="20" style="margin-left:10px; width:20px; height:20px" alt="Facebook"></a>
                                                    <a href="{{instaLink}}"><img src="{{frontendURL}}images/insta.png"
                                                            width="20" style="margin-left:10px; width:20px; height:20px" alt="Instagram"></a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Body -->
                                <tr>
                                    <td style="padding: 40px 30px; text-align: center;">
                                        <img src="{{frontendURL}}/images/mail.png" width="50" alt="Order Icon"
                                            style="margin-bottom: 20px;" />

                                        <h2 style="color: #4e5ef3; margin: 0 auto; width: 300px;">{{project}} <span
                                                style="color: #000;">{{orderNo}} {{storeName}}</span> has finalized your order.</h2>

                                    </td>
                                </tr>
                        
                                <tr>
                                    <td
                                        style="border-top: 1px dashed #5d5fef18; padding: 25px 0 25px; background-color: #ffffff; text-align: center; border-radius: 0 0 20px 20px;">
                                        <a
                                        href="{{link}}"
                                        style="display:inline-block; margin-top:30px; padding:12px 24px; background-color:#3b3bb1; color:#ffffff; text-decoration:none; border-radius:4px; font-weight:bold;"
                                        >
                                        Review Your Order Details
                                        </a>
                                    </td>
                                    
                                </tr>
                            
                                <tr>
                                    <td align="center" style="font-size: 16px; color: #999999; padding: 40px 20px;">
                                        <a href="{{supportEmail}}" target="_blank"
                                            style="color: #2BB770; text-decoration: none;">{{project}}</a>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>

            </html>`,
  },
  {
    slug: TemplatesSlug.ManualOrderNewUser,
    variablesInIT: `frontendURL, storeName, userEmail, password, supportEmail, project, oneSyncLogo, storeLogo`,
    subject: "Manual order created",
    html: `</html>
                <!DOCTYPE html>
                <html>

                <head>
                    <meta charset="UTF-8" />
                    <title>Order Request Notification</title>
                </head>

                <body style="margin:0; padding:0; background-color:#f0f2f5;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding: 10px 20px 0;">
                        <tr>
                            <td align="center">
                                <!-- Outer container -->
                                <table width="600" cellpadding="0" cellspacing="0"
                                    style="background-color:#ffffff; border-radius:8px; font-family:Arial, sans-serif;">

                                    <!-- Header -->
                                    <tr>
                                        <td style="padding: 20px; text-align: left; border-bottom: 1px solid #e0e0e0;">
                                            <table width="100%">
                                                <tr>
                                                    <td>
                                                      <img src="{{storeLogo}}" style="margin-left:10px; width:40px; height:40px; object-fit: contain;" alt="storeLogo">
                                                    </td>
                                                    <td align="right">
                                                        <img src="{{oneSyncLogo}}" style="margin-left:10px; width:40px; height:40px; object-fit: contain;" alt="oneSyncLogo">
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- Body -->
                                    <tr>
                                        <td style="padding: 40px 30px; text-align: center;">
                                            <img src="{{frontendURL}}images/mail.png" width="50" alt="Order Icon"
                                                style="margin-bottom: 20px;" />

                                           
                                           <h2 style="color: #4e5ef3; font-size: 22px; font-weight: 600; line-height: 1.4; margin: 0 auto; max-width: 360px; text-align: center;">
                                              {{storeName}} 
                                              <span style="color: #000; font-weight: 400; display: block; margin-top: 10px; font-size: 16px; line-height: 1.5;">
                                                  You have been invited to {{storeName}} as a consumer. Please find your login credentials below.
                                              </span>
                                          </h2>

                                        </td>
                                    </tr>
                                    
                                    <tr>
                                        <td
                                            style="padding: 0 40px 30px 40px; background-color: #fff; text-align: center; border-bottom: 1px dashed #5d5fef18;">
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tbody>
                                                    <tr>
                                                        <td align="center">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="background-color: #e0e0e0; border-radius: 8px;width: 100%; ">
                                                            </table>
                                                        </td>
                                                    </tr>
                                    
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- CREDENTIALS_PLACEHOLDER -->
            

                                    <tr>
                                        <td align="center" style="font-size: 16px; color: #999999; padding: 20px;">Powered by
                                            <a href="{{supportEmail}}" target="_blank"
                                                style="color: #2BB770; text-decoration: none;">{{project}}</a>
                                        </td>
                                    </tr>

                                </table>
                            </td>
                        </tr>
                    </table>
                </body>

                </html>`,
  },
];