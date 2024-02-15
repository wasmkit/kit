const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const utf8Encode = (str: string): Uint8Array => {
    return encoder.encode(str);
}
export const utf8EncodeInto = (str: string, dest: Uint8Array): TextEncoderEncodeIntoResult => {
    return encoder.encodeInto(str, dest);
}
export const utf8Decode = (bytes: Uint8Array): string => {
    return decoder.decode(bytes);
}