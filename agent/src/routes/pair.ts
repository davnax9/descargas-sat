
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  pairAgentWithCode,
  PairingError,
} from "../services/pairing.js";

const router = Router();

const pairSchema = z.object({
  code: z.string().min(30).max(100),
});

router.post("/", async (req: Request, res: Response) => {
  const validation = pairSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "El código de vinculación no es válido.",
    });
    return;
  }

  try {
    const result = await pairAgentWithCode(
      validation.data.code,
    );

    res.status(200).json({
      success: true,
      message: "Computadora vinculada correctamente.",
      device: result.device,
    });
  } catch (error) {
    if (error instanceof PairingError) {
      res.status(error.status).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error("[PAIR] Error vinculando computadora:", error);

    res.status(500).json({
      success: false,
      message: "Ocurrió un error al vincular la computadora.",
    });
  }
});

export default router;
