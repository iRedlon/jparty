
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

const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;
const FEEDBACK_COOLDOWN_MS = 30 * 1000;

export function handleSubmitFeedback(socket: Socket, feedback: Feedback) {
    if (!feedback || (typeof feedback.message !== "string") || !feedback.message.trim()) {
        return;
    }

    const lastFeedbackTimeMs = (socket as any).lastFeedbackTimeMs || 0;
    if ((Date.now() - lastFeedbackTimeMs) < FEEDBACK_COOLDOWN_MS) {
        socket.emit(ServerSocket.Message, new ServerSocketMessage("Please wait a moment before submitting more feedback.", true));
        return;
    }

    (socket as any).lastFeedbackTimeMs = Date.now();

    const feedbackMessage = feedback.message.slice(0, MAX_FEEDBACK_MESSAGE_LENGTH);

    debugLog(LogCategory.Email, `heard feedback submission. attempting to send it as an email`, LogVerbosity.Normal);
    debugLog(LogCategory.Email, feedbackMessage, LogVerbosity.Verbose);

    const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    let message = `<b>FEEDBACK</b><br><br>${escapeHtml(feedbackMessage).replace(/\n/g, "<br>")}`;

    const session = getSession((socket as any).sessionName);
    if (session) {
        const sessionDump = JSON.stringify(session, (key, value) => (key === "timeoutInfo") ? undefined : value);
        message += `<br><br><b>SESSION DUMP</b><br><br>${escapeHtml(sessionDump)}`;
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