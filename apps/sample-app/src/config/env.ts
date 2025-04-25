import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const validationSchema = z.object({
    RPC_URL: z.string().url(),
});

const env = validationSchema.safeParse(process.env);

if (!env.success) {
    console.error(env.error.issues.map((issue) => JSON.stringify(issue)).join("\n"));
    process.exit(1);
}

export const environment = env.data;
export type Environment = z.infer<typeof validationSchema>;
