import MailService from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();
export const sendPersonalMailTest = async (req,res) => {
    MailService.setApiKey(process.env.SENDGRID_API_KEY);
  try {
    const PersonalEmail = {
      to: "dishalunagariya9@gmail.com",
      from: "ved.panchal@silvertouch.com",
      subject: "Mailer Bot - Info Mail",
      html: "Hello"
    }
    console.log(PersonalEmail)
    try {
      await MailService.send(PersonalEmail);
      console.log("Success")
      return res.json({
          success: true,
          message: "Emails sent successfully",
          count: 20
        });
    } catch (sendError) {
    //   
      throw new EmailSendingError(
        "Failed to send personal notification email",
        sendError
      );
    }
  } catch (error) {
    return {
      success: false,
      message: "Unexpected error in personal mail sending",
      error: error.message,
    };
  }
};
