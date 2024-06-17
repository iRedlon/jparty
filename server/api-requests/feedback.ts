
import { Feedback, FeedbackType, getDateStamp, ServerSocket, ServerSocketMessage } from "jparty-shared";
import nodemailer from "nodemailer";
import { Socket } from "socket.io";

import { debugLog, DebugLogType } from "../misc/log";
import { getSession } from "../session/session-utils";

let mailConfig;

// in production: send emails to our actual feedback inbox with a real SMTP service
if (process.env.NODE_ENV === "production") {
    mailConfig = {
        host: "mail.privateemail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.FEEDBACK_EMAIL,
            pass: process.env.FEEDBACK_EMAIL_PASSWORD
        }
    };
// in dev: send emails to a transient inbox with Etheral, a fake SMTP service
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

    let message = feedback.message;

    const session = getSession((socket as any).sessionName);
    if (session) {
        message += `\n\n${JSON.stringify(session)}`;
    }

    if (feedback.category) {
        message += `\n\nspecified category: "${feedback.category.name}"`;
    }

    const mailOptions = {
        from: process.env.FEEDBACK_EMAIL,
        to: process.env.FEEDBACK_EMAIL,
        subject: `${FeedbackType[feedback.type]} Feedback (${getDateStamp()})`,
        text: message
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