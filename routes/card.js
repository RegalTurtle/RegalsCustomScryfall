import { Router } from "express";
const router = Router();
import cardData from "../data/cards.js";
import validation from "../data/validation.js";

router.route("/:setcn").patch(async (req, res) => {
  let setcn = req.params.setcn;
  let { set, cn } = setcn.split("_");
  try {
    set = validation.checkSet(set);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  try {
    cn = Number(cn);
    cn = validation.checkCn(cn);
  } catch (e) {
    return res.status(400).json({ error: e.message, cn: cn });
  }

  try {
    const card = await cardData.getCardByCN(set, cn);
    return res.json(card);
  } catch (e) {
    return res.status(404).json({ error: e.message });
  }
});

export default router;
