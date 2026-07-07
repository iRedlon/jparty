
import { Feedback, getDateStamp, ServerSocket, ServerSocketMessage } from "jparty-shared";
import nodemailer from "nodemailer";
import { Socket } from "socket.io";

import { debugLog, DebugLogType } from "../misc/log";
import { getSession } from "../session/session-utils";

let mailConfig;

// in production: send emails with a real SMTP service (Google)
if (process.env.NODE_ENV === "production") {
    mailConfig = {
        service: "gmail",
        auth: {
            user: process.env.FEEDBACK_EMAIL,
            pass: process.env.FEEDBACK_EMAIL_PASSWORD
        }
    };
// otherwise: send emails to a transient inbox with Ethereal, a fake SMTP service
} else {
    mailConfig = {
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
            user: process.env.ETHEREAL_EMAIL,
            pass: process.env.ETHEREAL_EMAIL_PASSWORD
        }
    };
}

const transporter = nodemailer.createTransport(mailConfig);

export function handleSubmitFeedback(socket: Socket, feedback: Feedback) {
    debugLog(DebugLogType.Email, `heard feedback submission. attempting to send it as an email`);
    debugLog(DebugLogType.Email, JSON.stringify(feedback), true);

    const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    let message = `<b>FEEDBACK</b><br><br>${escapeHtml(feedback.message).replace(/\n/g, "<br>")}`;

    const session = getSession((socket as any).sessionName);
    if (session) {
        message += `<br><br><b>SESSION DUMP</b><br><br>${escapeHtml(JSON.stringify(session))}`;
    }

    const mailOptions = {
        from: process.env.FEEDBACK_EMAIL,
        to: "isaacredlon@gmail.com",
        subject: `Feedback (${getDateStamp()})`,
        html: message
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            console.error(error);
        } else {
            socket.emit(ServerSocket.Message, new ServerSocketMessage(`Your feedback was submitted successfully. Thank you!`));
            debugLog(DebugLogType.Email, `feedback was submitted successfully`);
        }
    });
}