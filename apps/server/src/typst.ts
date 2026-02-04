import { TRPCError } from "@trpc/server";
import { env } from "./env";
import { axios } from "./lib";
import { Stream } from "stream";

export interface GenerateTypstPDFOptions {
  templateName: string;
  data: Record<string, any>;
}

export interface GenerateTypstPDFResult {
  pdf: string; // base64 encoded
  contentType: string;
}

export interface GenerateTypstPDFStreamResult {
  stream: Stream;
  contentType: string;
}

/**
 * Generate a PDF from a Typst template (returns base64 for tRPC)
 * @param options Template name and data to populate the template
 * @returns PDF as base64 string with content type
 */
export async function generateTypstPDF({
  templateName,
  data,
}: GenerateTypstPDFOptions): Promise<GenerateTypstPDFResult> {
  try {
    const response = await axios.post(
      `${env.TYPST_API_ENDPOINT}/template/${templateName}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.TYPST_API_SECRET_TOKEN}`,
        },
        responseType: "arraybuffer",
      },
    );

    return {
      pdf: Buffer.from(response.data).toString("base64"),
      contentType: "application/pdf",
    };
  } catch (error: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to generate PDF from template "${templateName}"`,
      cause: error,
    });
  }
}

/**
 * Generate a PDF from a Typst template (returns stream for HTTP endpoints)
 * @param options Template name and data to populate the template
 * @returns PDF as Stream with content type - memory efficient
 */
export async function generateTypstPDFStream({
  templateName,
  data,
}: GenerateTypstPDFOptions): Promise<GenerateTypstPDFStreamResult> {
  try {
    const response = await axios.post(
      `${env.TYPST_API_ENDPOINT}/template/${templateName}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.TYPST_API_SECRET_TOKEN}`,
        },
        responseType: "stream",
      },
    );

    return {
      stream: response.data,
      contentType: "application/pdf",
    };
  } catch (error: any) {
    throw new Error(`Failed to generate PDF from template "${templateName}": ${error.message}`);
  }
}
