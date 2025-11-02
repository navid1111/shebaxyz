// Simple SMS service adapter — mock by default. Replace with Twilio or other provider if needed.
import debug from "debug";

const log = debug("app:sms");

export const sendSms = async (phone, message) => {
  // In production, wire to Twilio / other provider using env vars.
  // For now we just log to the console (and debug) so SMS delivery can be inspected.
  const out = `SMS -> ${phone}: ${message}`;
  console.log(out);
  log(out);
  return Promise.resolve(true);
};

export default { sendSms };
