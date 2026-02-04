export * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";
export { express };
export * as z from "zod";
import cors from "cors";
import { customAlphabet } from "nanoid";
export { cors };
export { default as bcrypt } from "bcrypt";
export { default as jwt } from "jsonwebtoken";
export { default as axios } from "axios";
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((res) => setTimeout(res, ms));
}
export type JsonValue = string | number | boolean | JsonObject | JsonArray;
export type JsonObject = {
  [key: string]: JsonValue | null;
};
export type JsonArray = ReadonlyArray<JsonValue | null>;

function genCharArray(st: string, ed: string): string[] {
  const res = [];
  const endChar = ed.charCodeAt(0);
  for (let i = st.charCodeAt(0); i <= endChar; ++i) {
    res.push(String.fromCharCode(i));
  }
  return res;
}

export const nanoid = customAlphabet(
  [
    ...genCharArray("a", "z"),
    ...genCharArray("A", "Z"),
    ...genCharArray("0", "9"),
  ].join(""),
);

export const renderIf = <T, E>(
  ifValue: unknown,
  trueValue: T,
  elseValue: E,
) => {
  return ifValue ? trueValue : elseValue;
};
