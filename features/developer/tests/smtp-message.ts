export function decodeSmtpMessage(message: string) {
  const [headers, ...parts] = message.split("\r\n\r\n");
  const body = parts.join("\r\n\r\n");
  if (/Content-Transfer-Encoding: base64/i.test(headers)) return Buffer.from(body, "base64").toString("utf8");
  if (/Content-Transfer-Encoding: quoted-printable/i.test(headers))
    return body.replace(/=\r\n/g, "").replace(/=([A-F0-9]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return body;
}
