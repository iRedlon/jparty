
import { Feedback, getDateStamp, ServerSocket, ServerSocketMessage } from "jparty-shared";
import nodemailer from "nodemailer";
import { Socket } from "socket.io";

import { debugLog, LogCategory, LogVerbosity } from "../misc/log";
import { getSession } from "../session/session-utils";

let mailConfig = {
    service: "gmail",
    auth: {
        user: process.env.FEEDBACK_EMAIL,
        pass: process.env.FEEDBACK_EMAIL_PASSWORD
    }
};

const transporter = nodemailer.createTransport(mailConfig);

export function handleSubmitFeedback(socket: Socket, feedback: Feedback) {
    debugLog(LogCategory.Email, `heard feedback submission. attempting to send it as an email`, LogVerbosity.Normal);
    debugLog(LogCategory.Email, JSON.stringify(feedback), LogVerbosity.Verbose);

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
            debugLog(LogCategory.Email, `feedback was submitted successfully`, LogVerbosity.Normal);
        }
    });
}